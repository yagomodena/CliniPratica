
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, TrendingUp, Users, UsersRound, LineChart as LineChartIcon, Ban, Filter, UserSquare, Building } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as RechartsLineChart, ResponsiveContainer, Cell } from "recharts";
import { auth, db } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getCountFromServer,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { format, startOfMonth, subMonths, getMonth, getYear, parseISO, endOfMonth, isWithinInterval, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label'; // Added Label import

type MonthlyData = {
  month: string;
  total: number;
};

type MonthlyReturnRateData = {
  month: string;
  rate: number;
};

type PatientStatusData = {
  name: 'Ativos' | 'Inativos';
  count: number;
};

type UserForFilter = {
  id: string;
  nomeCompleto: string;
};

type UnitForFilter = {
  id: string;
  name: string;
};


const chartConfigAppointments = {
  total: { label: "Atendimentos", color: "hsl(var(--primary))" },
};
const chartConfigReturn = {
    rate: { label: "Taxa Retorno (%)", color: "hsl(var(--chart-2))" },
};
const chartConfigNewPatients = {
    total: { label: "Novos Pacientes", color: "hsl(var(--chart-3))" },
};

const chartConfigActiveInactive = {
    count: { label: "Quantidade" },
    ativos: { label: "Ativos", color: "hsl(var(--chart-2))" },
    inativos: { label: "Inativos", color: "hsl(0, 80%, 70%)" },
};

const chartConfigCancelledAppointments = {
  total: { label: "Cancelados", color: "hsl(var(--destructive))" },
};


export default function RelatoriosPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null); // To store plan and other user data
  const [clientNow, setClientNow] = useState<Date | null>(null);

  const [actualMonthlyAppointmentsData, setActualMonthlyAppointmentsData] = useState<MonthlyData[]>([]);
  const [isLoadingMonthlyAppointments, setIsLoadingMonthlyAppointments] = useState(true);

  const [newPatientsPerMonthData, setNewPatientsPerMonthData] = useState<MonthlyData[]>([]);
  const [isLoadingNewPatients, setIsLoadingNewPatients] = useState(true);

  const [activeInactivePatientData, setActiveInactivePatientData] = useState<PatientStatusData[]>([]);
  const [isLoadingActiveInactiveData, setIsLoadingActiveInactiveData] = useState(true);

  const [cancelledMonthlyAppointmentsData, setCancelledMonthlyAppointmentsData] = useState<MonthlyData[]>([]);
  const [isLoadingCancelledAppointments, setIsLoadingCancelledAppointments] = useState(true);

  const [patientReturnRateData, setPatientReturnRateData] = useState<MonthlyReturnRateData[]>([]);
  const [isLoadingPatientReturnRate, setIsLoadingPatientReturnRate] = useState(true);

  // State for filters (Clínica plan)
  const [clinicProfessionals, setClinicProfessionals] = useState<UserForFilter[]>([]);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');

  const [clinicUnits, setClinicUnits] = useState<UnitForFilter[]>([ // Placeholder data
    { id: 'all', name: 'Todas as Unidades' },
    { id: 'unit1', name: 'Unidade Principal (Exemplo)' }
  ]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');


  useEffect(() => {
    setClientNow(new Date());
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          setCurrentUserData(uData);
          if (uData?.plano === 'Clínica') {
            fetchClinicProfessionals();
            // fetchClinicUnits(); // Placeholder if we had real unit data
          }
        } else {
          setCurrentUserData({ plano: "Gratuito" }); // Default if user data not found
        }
      } else {
        setCurrentUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClinicProfessionals = async () => {
    setIsLoadingProfessionals(true);
    try {
      // For simplicity, fetching all users. In a real scenario, you might filter by clinic ID.
      const usersSnapshot = await getDocs(query(collection(db, 'usuarios'), orderBy('nomeCompleto')));
      const professionals: UserForFilter[] = [{ id: 'all', nomeCompleto: 'Todos os Profissionais' }];
      usersSnapshot.forEach(doc => {
        // Potentially add a check here if users have a role or belong to the same clinic
        professionals.push({ id: doc.id, nomeCompleto: doc.data().nomeCompleto as string });
      });
      setClinicProfessionals(professionals);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      setClinicProfessionals([{ id: 'all', nomeCompleto: 'Todos os Profissionais' }]); // Fallback
    } finally {
      setIsLoadingProfessionals(false);
    }
  };
  
  const getTargetUid = useCallback(() => {
    if (currentUserData?.plano === 'Clínica' && selectedProfessionalId !== 'all') {
      return selectedProfessionalId;
    }
    return currentUser?.uid;
  }, [currentUser?.uid, currentUserData?.plano, selectedProfessionalId]);


  const fetchMonthlyAppointmentsCounts = useCallback(async (currentDate: Date) => {
    const targetUid = getTargetUid();
    if (!targetUid || !currentDate) {
        setIsLoadingMonthlyAppointments(false);
        const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(currentDate || new Date(), 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
        });
        setActualMonthlyAppointmentsData(defaultMonths);
        return;
    }
    setIsLoadingMonthlyAppointments(true);

    const monthsData: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }
    const sixMonthsAgo = startOfMonth(subMonths(currentDate, 5));

    try {
      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', targetUid),
        where('date', '>=', format(sixMonthsAgo, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfDay(currentDate), 'yyyy-MM-dd')), 
        where('status', '!=', 'cancelado') 
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string;
        if (apptDateStr) {
          try {
            const apptDate = parseISO(apptDateStr);
            if (isWithinInterval(apptDate, { start: sixMonthsAgo, end: endOfDay(currentDate) })) {
                const apptMonthKey = `${format(apptDate, "MMM", { locale: ptBR })}/${String(getYear(apptDate)).slice(-2)}`;
                const monthEntry = monthsData.find(m => m.month === apptMonthKey);
                if (monthEntry) {
                    monthEntry.total += 1;
                }
            }
          } catch (e) {
            console.error("Error parsing appointment date for monthly chart:", apptDateStr, e);
          }
        }
      });
      setActualMonthlyAppointmentsData(monthsData);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos mensais:", error);
      setActualMonthlyAppointmentsData(monthsData); // Set to default on error
    } finally {
      setIsLoadingMonthlyAppointments(false);
    }
  }, [getTargetUid]);

  const fetchCancelledAppointmentsCounts = useCallback(async (currentDate: Date) => {
    const targetUid = getTargetUid();
    if (!targetUid || !currentDate) {
        setIsLoadingCancelledAppointments(false);
        const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(currentDate || new Date(), 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
        });
        setCancelledMonthlyAppointmentsData(defaultMonths);
        return;
    }
    setIsLoadingCancelledAppointments(true);
    const monthsData: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }
    const sixMonthsAgo = startOfMonth(subMonths(currentDate, 5));

    try {
      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', targetUid),
        where('status', '==', 'cancelado'),
        where('date', '>=', format(sixMonthsAgo, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfDay(currentDate), 'yyyy-MM-dd'))
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string;
        if (apptDateStr) {
          try {
            const apptDate = parseISO(apptDateStr);
             if (isWithinInterval(apptDate, { start: sixMonthsAgo, end: endOfDay(currentDate) })) {
                const apptMonthKey = `${format(apptDate, "MMM", { locale: ptBR })}/${String(getYear(apptDate)).slice(-2)}`;
                const monthEntry = monthsData.find(m => m.month === apptMonthKey);
                if (monthEntry) {
                monthEntry.total += 1;
                }
            }
          } catch (e) {
            console.error("Error parsing cancelled appointment date:", apptDateStr, e);
          }
        }
      });
      setCancelledMonthlyAppointmentsData(monthsData);
    } catch (error) {
      console.error("Erro ao buscar agendamentos cancelados:", error);
      setCancelledMonthlyAppointmentsData(monthsData); // Set to default on error
    } finally {
      setIsLoadingCancelledAppointments(false);
    }
  }, [getTargetUid]);

  const fetchNewPatientsPerMonth = useCallback(async (currentDate: Date) => {
    const targetUid = getTargetUid();
    if (!targetUid || !currentDate) {
        setIsLoadingNewPatients(false);
        const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(currentDate || new Date(), 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
        });
        setNewPatientsPerMonthData(defaultMonths);
        return;
    }
    setIsLoadingNewPatients(true);
    const monthsData: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }
    const sixMonthsAgoDate = startOfMonth(subMonths(currentDate, 5));
    const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgoDate);
    const currentEndTimestamp = Timestamp.fromDate(endOfDay(currentDate));

    try {
      const patientsRef = collection(db, 'pacientes');
      const q = query(
        patientsRef,
        where('uid', '==', targetUid),
        where('createdAt', '>=', sixMonthsAgoTimestamp),
        where('createdAt', '<=', currentEndTimestamp)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.createdAt && (data.createdAt as Timestamp).toDate) {
          const patientCreationDate = (data.createdAt as Timestamp).toDate();
          if (isWithinInterval(patientCreationDate, { start: sixMonthsAgoDate, end: endOfDay(currentDate) })) {
            const patientMonthKey = `${format(patientCreationDate, "MMM", { locale: ptBR })}/${String(getYear(patientCreationDate)).slice(-2)}`;
            const monthEntry = monthsData.find(m => m.month === patientMonthKey);
            if (monthEntry) {
              monthEntry.total += 1;
            }
          }
        }
      });
      setNewPatientsPerMonthData(monthsData);
    } catch (error: any) {
      console.error("Erro ao buscar novos pacientes por mês:", error);
      setNewPatientsPerMonthData(monthsData); // Set to default on error
    } finally {
      setIsLoadingNewPatients(false);
    }
  }, [getTargetUid]);

  const fetchActiveInactivePatientCounts = useCallback(async () => {
    const targetUid = getTargetUid();
    if (!targetUid) {
        setIsLoadingActiveInactiveData(false);
        setActiveInactivePatientData([{ name: 'Ativos', count: 0 }, { name: 'Inativos', count: 0 }]);
        return;
    }
    setIsLoadingActiveInactiveData(true);
    try {
      const patientsRef = collection(db, 'pacientes');
      const activeQuery = query(patientsRef, where('uid', '==', targetUid), where('status', '==', 'Ativo'));
      const inactiveQuery = query(patientsRef, where('uid', '==', targetUid), where('status', '==', 'Inativo'));
      const activeSnapshot = await getCountFromServer(activeQuery);
      const inactiveSnapshot = await getCountFromServer(inactiveQuery);
      const activeCount = activeSnapshot.data().count;
      const inactiveCount = inactiveSnapshot.data().count;
      setActiveInactivePatientData([
        { name: 'Ativos', count: activeCount },
        { name: 'Inativos', count: inactiveCount },
      ]);
    } catch (error: any) {
      console.error("Erro ao buscar contagem de pacientes ativos/inativos:", error);
      setActiveInactivePatientData([{ name: 'Ativos', count: 0 }, { name: 'Inativos', count: 0 }]); // Set to default on error
    } finally {
      setIsLoadingActiveInactiveData(false);
    }
  }, [getTargetUid]);

  const fetchPatientReturnRateData = useCallback(async (currentDate: Date) => {
    const targetUid = getTargetUid();
     if (!targetUid || !currentDate) {
        setIsLoadingPatientReturnRate(false);
        const defaultRates = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(currentDate || new Date(), 5 - i); // Cohort month
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, rate: 0 };
        });
        setPatientReturnRateData(defaultRates);
        return;
    }
    setIsLoadingPatientReturnRate(true);
    const lookbackStartDate = startOfMonth(subMonths(currentDate, 7)); // Look back 7 months for cohort data
    const appointmentsQueryRangeEnd = endOfDay(currentDate);
    let allFetchedAppointments: Array<{ id: string; patientId: string; date: string }> = [];

    try {
        const apptsRef = collection(db, 'agendamentos');
        const q = query(
            apptsRef,
            where('uid', '==', targetUid),
            where('status', '!=', 'cancelado'),
            where('date', '>=', format(lookbackStartDate, 'yyyy-MM-dd')),
            where('date', '<=', format(appointmentsQueryRangeEnd, 'yyyy-MM-dd'))
        );
        const appointmentsSnapshot = await getDocs(q);
        appointmentsSnapshot.forEach(doc => {
            const data = doc.data();
            allFetchedAppointments.push({
                id: doc.id,
                patientId: data.patientId as string,
                date: data.date as string,
            });
        });
    } catch (error) {
        console.error("Erro ao buscar todos os agendamentos para taxa de retorno:", error);
        setIsLoadingPatientReturnRate(false);
        const defaultRates = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(currentDate, 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, rate: 0 };
        });
        setPatientReturnRateData(defaultRates);
        return;
    }

    const monthlyReturnRates: MonthlyReturnRateData[] = [];
    for (let i = 5; i >= 0; i--) { // Iterate for the last 6 months to display
        const cohortMonthStartDate = startOfMonth(subMonths(currentDate, i + 1)); // e.g., if i=0, this is last month; if i=5, this is 6 months ago
        const cohortMonthEndDate = endOfMonth(cohortMonthStartDate);
        const monthKey = `${format(cohortMonthStartDate, "MMM", { locale: ptBR })}/${String(getYear(cohortMonthStartDate)).slice(-2)}`;
        
        const patientsInCohortMonth = new Set<string>();
        allFetchedAppointments.forEach(appt => {
            const apptDate = parseISO(appt.date);
            if (isWithinInterval(apptDate, { start: cohortMonthStartDate, end: cohortMonthEndDate })) {
                patientsInCohortMonth.add(appt.patientId);
            }
        });

        if (patientsInCohortMonth.size === 0) {
            monthlyReturnRates.push({ month: monthKey, rate: 0 });
            continue;
        }

        let returnedPatientCount = 0;
        for (const patientId of patientsInCohortMonth) {
            const hasReturned = allFetchedAppointments.some(appt => {
                if (appt.patientId !== patientId) return false;
                const apptDate = parseISO(appt.date);
                // Check if appointment is *after* the cohort month ends and within the overall query range
                return apptDate > cohortMonthEndDate && apptDate <= appointmentsQueryRangeEnd;
            });
            if (hasReturned) {
                returnedPatientCount++;
            }
        }

        const returnRate = patientsInCohortMonth.size > 0 ? (returnedPatientCount / patientsInCohortMonth.size) * 100 : 0;
        monthlyReturnRates.push({ month: monthKey, rate: Math.round(returnRate) });
    }

    setPatientReturnRateData(monthlyReturnRates);
    setIsLoadingPatientReturnRate(false);
  }, [getTargetUid]);


  useEffect(() => {
    if (currentUser && clientNow) {
      fetchMonthlyAppointmentsCounts(clientNow);
      fetchNewPatientsPerMonth(clientNow);
      fetchActiveInactivePatientCounts();
      fetchCancelledAppointmentsCounts(clientNow);
      fetchPatientReturnRateData(clientNow);
    } else if (!currentUser && clientNow) { // Handle no user but clientNow is ready
        // Initialize all charts with default empty data
        const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(clientNow, 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
        });
         const defaultReturnRates = Array.from({ length: 6 }).map((_, i) => {
            const targetMonthDate = subMonths(clientNow, 5 - i);
            return { month: `${format(targetMonthDate, "MMM", { locale: ptBR })}/${String(getYear(targetMonthDate)).slice(-2)}`, rate: 0 };
        });
        setActualMonthlyAppointmentsData(defaultMonths);
        setNewPatientsPerMonthData(defaultMonths);
        setActiveInactivePatientData([{ name: 'Ativos', count: 0 }, { name: 'Inativos', count: 0 }]);
        setCancelledMonthlyAppointmentsData(defaultMonths);
        setPatientReturnRateData(defaultReturnRates);

        // Set loading states to false
        setIsLoadingMonthlyAppointments(false);
        setIsLoadingNewPatients(false);
        setIsLoadingActiveInactiveData(false);
        setIsLoadingCancelledAppointments(false);
        setIsLoadingPatientReturnRate(false);
    }
  }, [
      currentUser, 
      clientNow, 
      getTargetUid, // Add getTargetUid here, as it's used by the fetch functions
      fetchMonthlyAppointmentsCounts, 
      fetchNewPatientsPerMonth, 
      fetchActiveInactivePatientCounts, 
      fetchCancelledAppointmentsCounts, 
      fetchPatientReturnRateData
    ]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
      </div>
      
      {currentUserData?.plano === 'Clínica' && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filtros da Clínica</CardTitle>
            <CardDescription>Selecione um profissional ou unidade para visualizar relatórios específicos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="professional-filter">Filtrar por Profissional</Label>
              <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger id="professional-filter">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingProfessionals ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    clinicProfessionals.map(prof => (
                      <SelectItem key={prof.id} value={prof.id}>{prof.nomeCompleto}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit-filter">Filtrar por Unidade (Em Breve)</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled>
                <SelectTrigger id="unit-filter">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {clinicUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground mt-1">Filtro por unidade estará disponível em futuras atualizações.</p>
            </div>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-6 md:grid-cols-2">
        { (currentUserData?.plano === 'Essencial' || currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Agendamentos por Mês</CardTitle>
                <CardDescription>Visualização do número de agendamentos realizados mensalmente (não cancelados).</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
                <ChartContainer config={chartConfigAppointments} className="w-full aspect-video">
                {isLoadingMonthlyAppointments ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={actualMonthlyAppointmentsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false}/>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />}/>
                        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                    </RechartsBarChart>
                    </ResponsiveContainer>
                )}
                </ChartContainer>
            </CardContent>
            </Card>
        )}

        { (currentUserData?.plano === 'Essencial' || currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Novos Pacientes por Mês</CardTitle>
                <CardDescription>Quantidade de novos pacientes cadastrados.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex flex-col items-center justify-center">
                <ChartContainer config={chartConfigNewPatients} className="w-full aspect-video">
                {isLoadingNewPatients ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={newPatientsPerMonthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                        <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={true} />
                    </RechartsLineChart>
                    </ResponsiveContainer>
                )}
                </ChartContainer>
            </CardContent>
            </Card>
        )}

        { (currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Taxa de Retorno de Pacientes</CardTitle>
                <CardDescription>Percentual de pacientes de um mês (coorte) que retornaram nos meses seguintes.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
                <ChartContainer config={chartConfigReturn} className="w-full aspect-video">
                {isLoadingPatientReturnRate ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={patientReturnRateData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                            indicator="line"
                                            hideLabel
                                            formatter={(value) => `${value}%`}
                                        />}
                            />
                            <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={true} />
                        </RechartsLineChart>
                    </ResponsiveContainer>
                    )}
                </ChartContainer>
            </CardContent>
            </Card>
        )}

        { (currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5"/> Pacientes Ativos vs. Inativos</CardTitle>
                <CardDescription>Comparativo entre pacientes ativos e inativos no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
                <ChartContainer config={chartConfigActiveInactive} className="w-full aspect-video">
                {isLoadingActiveInactiveData ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={activeInactivePatientData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={60} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={4}>
                        {activeInactivePatientData.map((entry, index) => {
                            const colorKey = entry.name.toLowerCase() as keyof typeof chartConfigActiveInactive;
                            const color = chartConfigActiveInactive[colorKey]?.color || 'hsl(var(--primary))';
                            return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                        </Bar>
                    </RechartsBarChart>
                    </ResponsiveContainer>
                )}
                </ChartContainer>
            </CardContent>
            </Card>
        )}

        { (currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5"/> Agendamentos Cancelados por Mês</CardTitle>
                <CardDescription>Visualização do número de agendamentos marcados como cancelados mensalmente.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
                <ChartContainer config={chartConfigCancelledAppointments} className="w-full aspect-video">
                {isLoadingCancelledAppointments ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={cancelledMonthlyAppointmentsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                    </RechartsBarChart>
                    </ResponsiveContainer>
                )}
                </ChartContainer>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}


    