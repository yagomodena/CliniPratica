
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CalendarClock, TrendingUp, Users, UsersRound, LineChart as LineChartIcon, Ban } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as RechartsLineChart, ResponsiveContainer, Cell } from "recharts";
import { auth, db } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth'; 
import { onAuthStateChanged, getAuth } from 'firebase/auth'; // Added getAuth
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getCountFromServer,
  doc, // Added doc
  getDoc // Added getDoc
} from 'firebase/firestore';
import { format, startOfMonth, subMonths, getMonth, getYear, parseISO, endOfMonth, isWithinInterval, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
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


  useEffect(() => {
    setClientNow(new Date());
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserPlan(userDocSnap.data()?.plano || "Gratuito");
        } else {
          setCurrentUserPlan("Gratuito"); // Default if user data not found
        }
      } else {
        setCurrentUserPlan(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchMonthlyAppointmentsCounts = useCallback(async (user: FirebaseUser, currentDate: Date) => {
    if (!user || !currentDate) return;
    setIsLoadingMonthlyAppointments(true);

    const monthsData: MonthlyData[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }

    const sixMonthsAgo = startOfMonth(subMonths(currentDate, 5));

    try {
      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', user.uid),
        where('date', '>=', format(sixMonthsAgo, 'yyyy-MM-dd')),
        where('status', '!=', 'cancelado') 
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string;
        if (apptDateStr) {
          try {
            const apptDate = parseISO(apptDateStr);
            if (apptDate >= sixMonthsAgo && apptDate <= endOfDay(currentDate)) { // Use endOfDay for current month
                const apptMonthKey = `${monthNames[getMonth(apptDate)]}/${String(getYear(apptDate)).slice(-2)}`;
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
      setActualMonthlyAppointmentsData(monthsData); 
    } finally {
      setIsLoadingMonthlyAppointments(false);
    }
  }, []);

  const fetchCancelledAppointmentsCounts = useCallback(async (user: FirebaseUser, currentDate: Date) => {
    if (!user || !currentDate) return;
    setIsLoadingCancelledAppointments(true);
    const monthsData: MonthlyData[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }
    const sixMonthsAgo = startOfMonth(subMonths(currentDate, 5));

    try {
      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', user.uid),
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
             if (apptDate >= sixMonthsAgo && apptDate <= endOfDay(currentDate)) {
                const apptMonthKey = `${monthNames[getMonth(apptDate)]}/${String(getYear(apptDate)).slice(-2)}`;
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
      setCancelledMonthlyAppointmentsData(monthsData);
    } finally {
      setIsLoadingCancelledAppointments(false);
    }
  }, []);

  const fetchNewPatientsPerMonth = useCallback(async (user: FirebaseUser, currentDate: Date) => {
    if (!user || !currentDate) return;
    setIsLoadingNewPatients(true);

    const monthsData: MonthlyData[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(currentDate, i);
      const monthKey = `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`;
      monthsData.push({ month: monthKey, total: 0 });
    }

    const sixMonthsAgoDate = startOfMonth(subMonths(currentDate, 5));
    const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgoDate);
    const currentEndTimestamp = Timestamp.fromDate(endOfDay(currentDate));


    try {
      const patientsRef = collection(db, 'pacientes');
      const q = query(
        patientsRef,
        where('uid', '==', user.uid),
        where('createdAt', '>=', sixMonthsAgoTimestamp),
        where('createdAt', '<=', currentEndTimestamp)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.createdAt && (data.createdAt as Timestamp).toDate) {
          const patientCreationDate = (data.createdAt as Timestamp).toDate();
          if (patientCreationDate >= sixMonthsAgoDate && patientCreationDate <= endOfDay(currentDate)) {
            const patientMonthKey = `${monthNames[getMonth(patientCreationDate)]}/${String(getYear(patientCreationDate)).slice(-2)}`;
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
      setNewPatientsPerMonthData(monthsData); 
    } finally {
      setIsLoadingNewPatients(false);
    }
  }, []);

  const fetchActiveInactivePatientCounts = useCallback(async (user: FirebaseUser) => {
    if (!user) return;
    setIsLoadingActiveInactiveData(true);
    try {
      const patientsRef = collection(db, 'pacientes');
      
      const activeQuery = query(patientsRef, where('uid', '==', user.uid), where('status', '==', 'Ativo'));
      const inactiveQuery = query(patientsRef, where('uid', '==', user.uid), where('status', '==', 'Inativo'));

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
      setActiveInactivePatientData([{ name: 'Ativos', count: 0 }, { name: 'Inativos', count: 0 }]);
    } finally {
      setIsLoadingActiveInactiveData(false);
    }
  }, []);

  const fetchPatientReturnRateData = useCallback(async (user: FirebaseUser, currentDate: Date) => {
    if (!user || !currentDate) return;
    setIsLoadingPatientReturnRate(true);

    // Fetch appointments from the last ~8 months to ensure enough data for 6 months of return rates
    const lookbackStartDate = startOfMonth(subMonths(currentDate, 7)); 
    const appointmentsQueryRangeEnd = endOfDay(currentDate);

    let allFetchedAppointments: Array<{ id: string; patientId: string; date: string }> = [];
    try {
        const apptsRef = collection(db, 'agendamentos');
        const q = query(
            apptsRef,
            where('uid', '==', user.uid),
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
                date: data.date as string, // yyyy-MM-dd
            });
        });
    } catch (error) {
        console.error("Erro ao buscar todos os agendamentos para taxa de retorno:", error);
        setIsLoadingPatientReturnRate(false);
        // Initialize with empty data for 6 months
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const defaultRates: MonthlyReturnRateData[] = [];
        for (let i = 5; i >= 0; i--) {
            const targetMonthDate = subMonths(currentDate, i);
            const monthKey = `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`;
            defaultRates.push({ month: monthKey, rate: 0 });
        }
        setPatientReturnRateData(defaultRates);
        return;
    }
    
    const monthlyReturnRates: MonthlyReturnRateData[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Calculate for 6 months, ending with the month prior to the current month
    for (let i = 5; i >= 0; i--) { 
        const cohortMonthStartDate = startOfMonth(subMonths(currentDate, i + 1)); // +1 because we look at returns *after* this month
        const cohortMonthEndDate = endOfMonth(cohortMonthStartDate);
        const monthKey = `${monthNames[getMonth(cohortMonthStartDate)]}/${String(getYear(cohortMonthStartDate)).slice(-2)}`;

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
                // A return is an appointment *after* the cohortMonthEndDate and up to the current date
                return apptDate > cohortMonthEndDate && apptDate <= currentDate;
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
  }, []);


  useEffect(() => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
        const targetMonthDate = subMonths(clientNow || new Date(), 5 - i);
        return { month: `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
    });
    const defaultReturnRates = Array.from({ length: 6 }).map((_, i) => {
        const targetMonthDate = subMonths(clientNow || new Date(), 6 - i); // For return rate, months are for the cohort
        return { month: `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`, rate: 0 };
    });
    const defaultPatientStatus = [{ name: 'Ativos' as const, count: 0 }, { name: 'Inativos' as const, count: 0 }];


    if (currentUser && clientNow) {
      fetchMonthlyAppointmentsCounts(currentUser, clientNow);
      fetchNewPatientsPerMonth(currentUser, clientNow);
      fetchActiveInactivePatientCounts(currentUser);
      fetchCancelledAppointmentsCounts(currentUser, clientNow);
      fetchPatientReturnRateData(currentUser, clientNow);
    } else if (clientNow) { 
        setIsLoadingMonthlyAppointments(false);
        setIsLoadingNewPatients(false);
        setIsLoadingActiveInactiveData(false);
        setIsLoadingCancelledAppointments(false);
        setIsLoadingPatientReturnRate(false);
        setActualMonthlyAppointmentsData(defaultMonths);
        setNewPatientsPerMonthData(defaultMonths);
        setActiveInactivePatientData(defaultPatientStatus);
        setCancelledMonthlyAppointmentsData(defaultMonths);
        setPatientReturnRateData(defaultReturnRates);
    }
  }, [currentUser, clientNow, fetchMonthlyAppointmentsCounts, fetchNewPatientsPerMonth, fetchActiveInactivePatientCounts, fetchCancelledAppointmentsCounts, fetchPatientReturnRateData]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>

      <div className="grid gap-6 md:grid-cols-2">
        { (currentUserPlan === 'Essencial' || currentUserPlan === 'Profissional' || currentUserPlan === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Agendamentos por Mês</CardTitle>
                <CardDescription>Visualização do número de agendamentos realizados mensalmente (não cancelados).</CardDescription>
            </CardHeader>
            <CardContent>
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

        { (currentUserPlan === 'Essencial' || currentUserPlan === 'Profissional' || currentUserPlan === 'Clínica') && (
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

        { (currentUserPlan === 'Profissional' || currentUserPlan === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Taxa de Retorno de Pacientes</CardTitle>
                <CardDescription>Percentual de pacientes de um mês que retornaram nos meses seguintes.</CardDescription>
            </CardHeader>
            <CardContent>
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
        
        { (currentUserPlan === 'Profissional' || currentUserPlan === 'Clínica') && (
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5"/> Pacientes Ativos vs. Inativos</CardTitle>
                <CardDescription>Comparativo entre pacientes ativos e inativos.</CardDescription>
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
        
        { (currentUserPlan === 'Profissional' || currentUserPlan === 'Clínica') && (
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

