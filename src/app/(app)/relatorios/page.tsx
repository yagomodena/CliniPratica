
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart2, Users, CalendarClock, TrendingUp, UsersRound, ClipboardList, Share2, Ban, LineChart as LineChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as RechartsLineChart, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { auth, db } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth'; // Explicit type import
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp, 
} from 'firebase/firestore';
import { format, startOfMonth, subMonths, getMonth, getYear, parseISO } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';

type MonthlyData = {
  month: string;
  total: number;
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

type ReportType = 'cancelados' | 'ativosInativos' | 'procedimentos' | 'origem';

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('cancelados');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  const [actualMonthlyAppointmentsData, setActualMonthlyAppointmentsData] = useState<MonthlyData[]>([]);
  const [isLoadingMonthlyAppointments, setIsLoadingMonthlyAppointments] = useState(true);

  const [newPatientsPerMonthData, setNewPatientsPerMonthData] = useState<MonthlyData[]>([]);
  const [isLoadingNewPatients, setIsLoadingNewPatients] = useState(true);

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
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string; 
        if (apptDateStr) {
          try {
            const apptDate = parseISO(apptDateStr); 
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

  useEffect(() => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const defaultMonths = Array.from({ length: 6 }).map((_, i) => {
        const targetMonthDate = subMonths(clientNow || new Date(), 5 - i);
        return { month: `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
    });

    if (currentUser && clientNow) {
      fetchMonthlyAppointmentsCounts(currentUser, clientNow);
      fetchNewPatientsPerMonth(currentUser, clientNow);
    } else if (clientNow) { 
        setIsLoadingMonthlyAppointments(false);
        setIsLoadingNewPatients(false);
        setActualMonthlyAppointmentsData(defaultMonths);
        setNewPatientsPerMonthData(defaultMonths);
    }
  }, [currentUser, clientNow, fetchMonthlyAppointmentsCounts, fetchNewPatientsPerMonth]);


  const renderSelectedReportContent = () => {
    switch (selectedReport) {
      case 'cancelados':
        return (
          <div className="text-center py-16 text-muted-foreground">
            <Ban className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Relatório de Agendamentos Cancelados por Mês (em breve).</p>
            <p className="text-sm">Visualize a quantidade de cancelamentos ao longo do tempo.</p>
          </div>
        );
      case 'ativosInativos':
        return (
          <div className="text-center py-16 text-muted-foreground">
            <UsersRound className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Relatório de Pacientes Ativos vs. Inativos (em breve).</p>
            <p className="text-sm">Acompanhe a proporção de pacientes ativos e inativos.</p>
          </div>
        );
      case 'procedimentos':
        return (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Relatório de Procedimentos Mais Realizados (em breve).</p>
            <p className="text-sm">Identifique os procedimentos mais comuns em seu consultório.</p>
          </div>
        );
      case 'origem':
        return (
          <div className="text-center py-16 text-muted-foreground">
            <Share2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Relatório de Origem dos Pacientes (em breve).</p>
            <p className="text-sm">Entenda como os pacientes chegam até você (indicação, redes sociais, etc.).</p>
          </div>
        );
      default:
        return null;
    }
  };

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
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Relatórios Adicionais</CardTitle>
            <CardDescription>Selecione um relatório para visualizar mais detalhes.</CardDescription>
             <div className="pt-4 space-y-2">
                 <Label htmlFor="report-select">Selecionar Relatório</Label>
                <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
                  <SelectTrigger id="report-select" className="w-full">
                    <SelectValue placeholder="Selecione um relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cancelados">Agendamentos Cancelados por Mês</SelectItem>
                    <SelectItem value="ativosInativos">Pacientes Ativos vs. Inativos</SelectItem>
                    <SelectItem value="procedimentos">Procedimentos Mais Realizados</SelectItem>
                    <SelectItem value="origem">Origem dos Pacientes</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </CardHeader>
          <CardContent className="min-h-[200px] flex items-center justify-center">
             {renderSelectedReportContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
