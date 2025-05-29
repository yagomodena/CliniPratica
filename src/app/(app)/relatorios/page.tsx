
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CalendarClock, TrendingUp, Users, UsersRound, LineChart as LineChartIcon, Ban } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as RechartsLineChart, ResponsiveContainer, Cell } from "recharts"; // Imported Cell
import { auth, db } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth'; 
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { format, startOfMonth, subMonths, getMonth, getYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MonthlyData = {
  month: string;
  total: number;
};

type PatientStatusData = {
  name: 'Ativos' | 'Inativos';
  count: number;
};

const initialPatientReturnData = [
  { month: "Jan", rate: 60 }, { month: "Fev", rate: 65 }, { month: "Mar", rate: 70 },
  { month: "Abr", rate: 72 }, { month: "Mai", rate: 68 }, { month: "Jun", rate: 75 },
  { month: "Jul", rate: 78 },
];

const chartConfigAppointments = {
  total: { label: "Atendimentos", color: "hsl(var(--primary))" },
};
const chartConfigReturn = {
    rate: { label: "Taxa Retorno (%)", color: "hsl(var(--chart-2))" },
};
const chartConfigNewPatients = {
    total: { label: "Novos Pacientes", color: "hsl(var(--chart-3))" },
};

// Updated config for distinct colors
const chartConfigActiveInactive = {
    ativos: { label: "Ativos", color: "hsl(var(--chart-2))" }, // Using a green-ish color from theme
    inativos: { label: "Inativos", color: "hsl(var(--muted-foreground))" }, // Using a muted color for inactive
    // 'count' is still the dataKey for the bar values.
};


export default function RelatoriosPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  const [actualMonthlyAppointmentsData, setActualMonthlyAppointmentsData] = useState<MonthlyData[]>([]);
  const [isLoadingMonthlyAppointments, setIsLoadingMonthlyAppointments] = useState(true);

  const [newPatientsPerMonthData, setNewPatientsPerMonthData] = useState<MonthlyData[]>([]);
  const [isLoadingNewPatients, setIsLoadingNewPatients] = useState(true);

  const [activeInactivePatientData, setActiveInactivePatientData] = useState<PatientStatusData[]>([]);
  const [isLoadingActiveInactiveData, setIsLoadingActiveInactiveData] = useState(true);


  useEffect(() => {
    setClientNow(new Date());
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
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
        where('date', '>=', format(sixMonthsAgo, 'yyyy-MM-dd'))
        // Removed status filter to count all non-cancelled by default based on previous revert
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string;
        if (apptDateStr) {
          try {
            const apptDate = parseISO(apptDateStr);
            // Ensure we are comparing against the correct month and year for aggregation
            const apptMonthKey = `${monthNames[getMonth(apptDate)]}/${String(getYear(apptDate)).slice(-2)}`;
            const monthEntry = monthsData.find(m => m.month === apptMonthKey);
            if (monthEntry) {
                monthEntry.total += 1;
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

    try {
      const patientsRef = collection(db, 'pacientes');
      const q = query(
        patientsRef,
        where('uid', '==', user.uid),
        where('createdAt', '>=', sixMonthsAgoTimestamp)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.createdAt && (data.createdAt as Timestamp).toDate) {
          const patientCreationDate = (data.createdAt as Timestamp).toDate();
          const patientMonthKey = `${monthNames[getMonth(patientCreationDate)]}/${String(getYear(patientCreationDate)).slice(-2)}`;
          const monthEntry = monthsData.find(m => m.month === patientMonthKey);
          if (monthEntry) {
            monthEntry.total += 1;
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


  useEffect(() => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
        const targetMonthDate = subMonths(clientNow || new Date(), 5 - i);
        return { month: `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
    });
    const defaultPatientStatus = [{ name: 'Ativos' as const, count: 0 }, { name: 'Inativos' as const, count: 0 }];


    if (currentUser && clientNow) {
      fetchMonthlyAppointmentsCounts(currentUser, clientNow);
      fetchNewPatientsPerMonth(currentUser, clientNow);
      fetchActiveInactivePatientCounts(currentUser);
    } else if (clientNow) { // Ensure clientNow is available before setting defaults
        setIsLoadingMonthlyAppointments(false);
        setIsLoadingNewPatients(false);
        setIsLoadingActiveInactiveData(false);
        setActualMonthlyAppointmentsData(defaultMonths);
        setNewPatientsPerMonthData(defaultMonths);
        setActiveInactivePatientData(defaultPatientStatus);
    }
  }, [currentUser, clientNow, fetchMonthlyAppointmentsCounts, fetchNewPatientsPerMonth, fetchActiveInactivePatientCounts]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Agendamentos por Mês</CardTitle>
            <CardDescription>Visualização do número de agendamentos mensais.</CardDescription>
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

         <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Taxa de Retorno de Pacientes</CardTitle>
            <CardDescription>Percentual de pacientes que retornaram para novas consultas.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfigReturn} className="w-full aspect-video">
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={initialPatientReturnData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                        <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={true} />
                    </RechartsLineChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>

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

        <Card className="shadow-md md:col-span-1">
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

        {/* Placeholder for more reports - to be expanded */}
        <Card className="shadow-md md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5"/> Mais Relatórios (Em Breve)</CardTitle>
            <CardDescription>Visualizações detalhadas sobre cancelamentos, procedimentos e origem dos pacientes estarão disponíveis aqui.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
            <Ban className="h-10 w-10 mb-2 opacity-50" />
            <p>Relatórios detalhados de:</p>
            <ul className="list-disc list-inside text-sm mt-1">
                <li>Agendamentos Cancelados por Mês</li>
                <li>Procedimentos Mais Realizados</li>
                <li>Origem dos Pacientes</li>
            </ul>
            <p className="mt-2 text-xs">Funcionalidades em desenvolvimento.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
