
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart2, Users, CalendarClock, TrendingUp, UsersRound, ClipboardList, Share2, Ban, LineChart as LineChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as RechartsLineChart, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { format, startOfMonth, subMonths, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MonthlyAppointmentData = {
  month: string;
  total: number;
};

// Placeholder data - will be replaced by fetched data
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

type ReportType = 'cancelados' | 'ativosInativos' | 'procedimentos' | 'origem';

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('cancelados');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  const [actualMonthlyAppointmentsData, setActualMonthlyAppointmentsData] = useState<MonthlyAppointmentData[]>([]);
  const [isLoadingMonthlyAppointments, setIsLoadingMonthlyAppointments] = useState(true);

  useEffect(() => {
    setClientNow(new Date());
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchMonthlyAppointmentsCounts = useCallback(async (user: FirebaseUser, currentDate: Date) => {
    if (!user) return;
    setIsLoadingMonthlyAppointments(true);

    const monthsData: MonthlyAppointmentData[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Initialize last 6 months including current
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
        // We can't filter by date <= current date effectively without another range query, 
        // so we'll just process up to current month from the fetched data
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptDateStr = data.date as string; // 'yyyy-MM-dd'
        if (apptDateStr) {
          try {
            const apptDate = new Date(apptDateStr + 'T00:00:00'); // Ensure correct parsing
             if (apptDate >= sixMonthsAgo && apptDate <= currentDate) {
                const monthIndex = getMonth(apptDate);
                const yearSuffix = String(getYear(apptDate)).slice(-2);
                const monthKey = `${monthNames[monthIndex]}/${yearSuffix}`;
                
                const monthEntry = monthsData.find(m => m.month === monthKey);
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
      // Set to empty array or default placeholder on error
      setActualMonthlyAppointmentsData(monthsData); // Show initialized months with 0 counts
    } finally {
      setIsLoadingMonthlyAppointments(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && clientNow) {
      fetchMonthlyAppointmentsCounts(currentUser, clientNow);
    } else if (!currentUser) {
        setIsLoadingMonthlyAppointments(false);
        setActualMonthlyAppointmentsData(
            Array.from({ length: 6 }).map((_, i) => {
                const targetMonthDate = subMonths(new Date(), 5 - i);
                 const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                return { month: `${monthNames[getMonth(targetMonthDate)]}/${String(getYear(targetMonthDate)).slice(-2)}`, total: 0 };
            })
        );
    }
  }, [currentUser, clientNow, fetchMonthlyAppointmentsCounts]);


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
            <CardContent className="text-center py-16 text-muted-foreground min-h-[200px] flex flex-col items-center justify-center">
                <LineChartIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Gráfico de novos pacientes (em breve).</p>
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
