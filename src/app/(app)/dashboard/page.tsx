
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, BarChart as RechartsBarChart, ResponsiveContainer } from "recharts";
import Link from "next/link";

// Placeholder data
const weeklyAppointmentsData = [
  { day: "Seg", appointments: 5 },
  { day: "Ter", appointments: 8 },
  { day: "Qua", appointments: 6 },
  { day: "Qui", appointments: 9 },
  { day: "Sex", appointments: 7 },
];

const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
};

const todaysAppointments = [
    { time: "09:00", name: "Ana Silva" },
    { time: "10:30", name: "Carlos Souza" },
    { time: "14:00", name: "Beatriz Lima" },
    { time: "16:00", name: "Daniel Costa" },
];

const importantAlerts = [
    { patient: "Fernanda Oliveira", reason: "Retorno agendado para revisão" },
    { patient: "Ricardo Pereira", reason: "Verificar resultados de exame" },
]

// Mock plan status (replace with actual logic)
const isFreePlan = true;
const monthlyBilling = isFreePlan ? null : 450.80; // Example value for paid plan

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>

      {isFreePlan && (
        <Card className="bg-accent/20 border-accent shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">
              Aviso de Plano
            </CardTitle>
             <AlertCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-accent-foreground">
              Você está no plano gratuito - limite de 10 pacientes ativos.
            </p>
            <Button size="sm" asChild>
               <Link href="/#planos">Ver Planos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos da Semana</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
               <ChartContainer config={chartConfig} className="h-full w-full">
                  <RechartsBarChart data={weeklyAppointmentsData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                     <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="appointments" fill="var(--color-appointments)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Agendados Hoje</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
             {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appt, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{appt.time}</span>
                  <span className="text-muted-foreground">{appt.name}</span>
                   <Link href={`/pacientes/${appt.name.toLowerCase().replace(' ','-')}`} passHref>
                      <Button variant="ghost" size="sm" className="h-auto p-1 text-primary hover:text-primary/80">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                </div>
              ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento para hoje.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Importantes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
             {importantAlerts.length > 0 ? (
              importantAlerts.map((alert, index) => (
                <div key={index} className="flex items-start text-sm space-x-2">
                   <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0"/>
                   <div>
                     <span className="font-medium">{alert.patient}: </span>
                     <span className="text-muted-foreground">{alert.reason}</span>
                   </div>
                </div>
              ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta importante.</p>
            )}
          </CardContent>
        </Card>

        {!isFreePlan && monthlyBilling !== null && (
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
              <span className="text-muted-foreground text-sm">R$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {monthlyBilling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                +5.2% em relação ao mês passado
              </p>
            </CardContent>
          </Card>
        )}
      </div>

       <div className="grid gap-6 md:grid-cols-2">
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Acesso Rápido</CardTitle>
                <CardDescription>Principais ações do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" asChild>
                    <Link href="/pacientes?action=novo">
                        <Users className="mr-2 h-4 w-4"/> Novo Paciente
                    </Link>
                </Button>
                 <Button variant="outline" asChild>
                    <Link href="/agenda?action=novo">
                        <CalendarCheck className="mr-2 h-4 w-4"/> Novo Agendamento
                    </Link>
                </Button>
            </CardContent>
         </Card>
           <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Precisa de Ajuda?</CardTitle>
                <CardDescription>Acesse nossa central de ajuda ou entre em contato.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
                <Button variant="outline" asChild>
                   <Link href="/contato-suporte">Central de Ajuda</Link>
                </Button>
                 <Button asChild>
                   <Link href="/contato-suporte">Falar com Suporte</Link>
                </Button>
            </CardContent>
         </Card>
       </div>
    </div>
  );
}
