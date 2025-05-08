
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart2, Users, CalendarClock, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer } from "recharts";

// Placeholder data
const monthlyAppointmentsData = [
  { month: "Jan", total: 65 }, { month: "Fev", total: 59 }, { month: "Mar", total: 80 },
  { month: "Abr", total: 81 }, { month: "Mai", total: 56 }, { month: "Jun", total: 75 },
  { month: "Jul", total: 40 },
];

const patientReturnData = [
  { month: "Jan", rate: 60 }, { month: "Fev", rate: 65 }, { month: "Mar", rate: 70 },
  { month: "Abr", rate: 72 }, { month: "Mai", rate: 68 }, { month: "Jun", rate: 75 },
  { month: "Jul", rate: 78 },
]

const chartConfigAppointments = {
  total: { label: "Atendimentos", color: "hsl(var(--primary))" },
};
const chartConfigReturn = {
    rate: { label: "Taxa Retorno (%)", color: "hsl(var(--chart-2))" },
};


export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Atendimentos por Período */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Atendimentos por Mês</CardTitle>
            <CardDescription>Visualização do número de atendimentos mensais.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfigAppointments} className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyAppointmentsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />}/>
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                   </BarChart>
                 </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

         {/* Taxa de Retorno */}
         <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Taxa de Retorno de Pacientes</CardTitle>
            <CardDescription>Percentual de pacientes que retornaram para novas consultas.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfigReturn} className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={patientReturnData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                        <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={true} />
                    </LineChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>

         {/* Novos Pacientes (Placeholder) */}
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Novos Pacientes por Mês</CardTitle>
                <CardDescription>Quantidade de novos pacientes cadastrados.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-16 text-muted-foreground">
                <BarChart2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Gráfico de novos pacientes (em breve).</p>
            </CardContent>
         </Card>

         {/* Outro Relatório (Placeholder) */}
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Outro Relatório</CardTitle>
                <CardDescription>Placeholder para futuro relatório.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-16 text-muted-foreground">
                 <BarChart2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Mais relatórios serão adicionados aqui.</p>
            </CardContent>
         </Card>

      </div>
    </div>
  );
}
