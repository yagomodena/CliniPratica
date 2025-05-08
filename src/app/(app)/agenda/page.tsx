
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ShadCN Calendar
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Placeholder data
const appointments = {
  '2024-08-05': [ // Example date based on potential today
    { time: '09:00', patient: 'Ana Silva', type: 'Consulta' },
    { time: '10:30', patient: 'Carlos Souza', type: 'Retorno' },
  ],
  '2024-08-07': [
    { time: '14:00', patient: 'Beatriz Lima', type: 'Consulta' },
  ],
   '2024-08-08': [
     { time: '11:00', patient: 'Daniel Costa', type: 'Consulta' },
     { time: '15:00', patient: 'Fernanda Oliveira', type: 'Consulta' },
   ]
};

type Appointment = {
  time: string;
  patient: string;
  type: string;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const goToPreviousDay = () => {
    setSelectedDate(prevDate => prevDate ? subDays(prevDate, 1) : new Date());
  }

   const goToNextDay = () => {
    setSelectedDate(prevDate => prevDate ? addDays(prevDate, 1) : new Date());
  }

  const formattedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const todaysAppointments: Appointment[] = appointments[formattedDateKey as keyof typeof appointments] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
             <CardDescription>Selecione uma data para ver os agendamentos.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              className="rounded-md border"
              locale={ptBR}
            />
          </CardContent>
        </Card>

        {/* Appointments List for Selected Day */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
             <div className="flex items-center justify-between">
               <div>
                 <CardTitle>
                   Agendamentos para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Data Selecionada'}
                 </CardTitle>
                 <CardDescription>Compromissos do dia selecionado.</CardDescription>
               </div>
                 <div className="flex items-center gap-2">
                     <Button variant="outline" size="icon" onClick={goToPreviousDay} aria-label="Dia anterior">
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <Button variant="outline" size="icon" onClick={goToNextDay} aria-label="Próximo dia">
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                 </div>
             </div>
          </CardHeader>
          <CardContent className="space-y-4">
             {todaysAppointments.length > 0 ? (
              todaysAppointments.sort((a,b) => a.time.localeCompare(b.time)).map((appt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                     <span className="font-semibold text-primary w-12">{appt.time}</span>
                     <div>
                       <p className="font-medium">{appt.patient}</p>
                       <p className="text-sm text-muted-foreground">{appt.type}</p>
                     </div>
                  </div>
                  <Button variant="ghost" size="sm">Ver detalhes</Button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                 <CalendarIcon className="mx-auto h-12 w-12 mb-4" />
                <p>Nenhum agendamento para {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'esta data'}.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
