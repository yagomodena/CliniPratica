
'use client';

import React, { useState, FormEvent } from 'react'; // Import React
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight, Clock, User, ClipboardList, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ShadCN Calendar
import { format, addDays, subDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


// --- Placeholder Data (Shared between Agenda and Pacientes) ---
// Ideally, this would come from a central store or API
const initialPatients = [
  { id: 'p001', name: 'Ana Silva', email: 'ana.silva@email.com', phone: '(11) 98765-4321', dob: '1985-03-15', address: 'Rua Exemplo, 123, São Paulo - SP', status: 'Ativo' },
  { id: 'p002', name: 'Carlos Souza', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ', status: 'Ativo' },
  { id: 'p003', name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 99999-8888', dob: '1978-05-01', address: 'Praça Modelo, 789, Belo Horizonte - MG', status: 'Ativo' },
  { id: 'p004', name: 'Daniel Costa', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR', status: 'Inativo' },
  { id: 'p005', name: 'Fernanda Oliveira', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS', status: 'Ativo' },
];
// --- End Placeholder Data ---


// Appointment data structure
type Appointment = {
  time: string;
  patient: string; // Patient name for simplicity, ideally patientId
  type: string;
  notes?: string;
};

type AppointmentsData = {
    [dateKey: string]: Appointment[];
};

// Initial appointment data
const initialAppointments: AppointmentsData = {
  '2024-08-05': [
    { time: '09:00', patient: 'Ana Silva', type: 'Consulta', notes: 'Consulta inicial' },
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

type NewAppointmentForm = {
    patientId: string;
    type: string;
    date: string;
    time: string;
    notes: string;
}


export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<AppointmentsData>(initialAppointments);
  const [patients] = useState(initialPatients.filter(p => p.status === 'Ativo')); // Only allow active patients for new appointments
  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newAppointment, setNewAppointment] = useState<NewAppointmentForm>({
    patientId: '',
    type: 'Consulta',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    time: '',
    notes: '',
  });

   // Update date in form when calendar selection changes
   React.useEffect(() => {
    if (selectedDate) {
      setNewAppointment(prev => ({ ...prev, date: format(selectedDate, 'yyyy-MM-dd') }));
    }
  }, [selectedDate]);


  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleAppointmentInputChange = (field: keyof NewAppointmentForm, value: string) => {
    setNewAppointment(prev => ({ ...prev, [field]: value }));
  };

   const handleAppointmentSelectChange = (field: keyof NewAppointmentForm, value: string) => {
     setNewAppointment(prev => ({ ...prev, [field]: value }));
   };


  const handleAddAppointment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time || !newAppointment.type) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os campos obrigatórios (Paciente, Data, Hora, Tipo).",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === newAppointment.patientId);
    if (!selectedPatient) {
        toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
        return;
    }

    // Format the date key
    const dateKey = newAppointment.date;

    const newApptEntry: Appointment = {
      time: newAppointment.time,
      patient: selectedPatient.name,
      type: newAppointment.type,
      notes: newAppointment.notes,
    };

    // Update the state
    setAppointments(prev => {
      const updatedDayAppointments = [...(prev[dateKey] || []), newApptEntry];
      // Sort appointments by time
      updatedDayAppointments.sort((a, b) => a.time.localeCompare(b.time));
      return {
        ...prev,
        [dateKey]: updatedDayAppointments,
      };
    });

    // Reset form and close dialog
    setNewAppointment({
      patientId: '',
      type: 'Consulta',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: '',
      notes: '',
    });
    setIsNewAppointmentDialogOpen(false);
    toast({
        title: "Sucesso!",
        description: "Agendamento adicionado com sucesso.",
    });
    console.log("New appointment added:", newApptEntry, "on", dateKey);
  };


  const goToPreviousDay = () => {
    setSelectedDate(prevDate => prevDate ? subDays(prevDate, 1) : new Date());
  }

   const goToNextDay = () => {
    setSelectedDate(prevDate => prevDate ? addDays(prevDate, 1) : new Date());
  }

  const formattedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const todaysAppointments: Appointment[] = appointments[formattedDateKey] || [];

   // Function to generate slug from name (matching the detail page logic)
   const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>

        <Dialog open={isNewAppointmentDialogOpen} onOpenChange={setIsNewAppointmentDialogOpen}>
          <DialogTrigger asChild>
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Agendamento
             </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Preencha os detalhes do novo agendamento.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAppointment}>
              <div className="grid gap-4 py-4">
                {/* Patient Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patientId" className="text-right">
                    Paciente*
                  </Label>
                    <Select
                        value={newAppointment.patientId}
                        onValueChange={(value) => handleAppointmentSelectChange('patientId', value)}
                        required
                    >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                       {patients.length === 0 && <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                 {/* Appointment Type */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Tipo*
                  </Label>
                  <Select
                    value={newAppointment.type}
                    onValueChange={(value) => handleAppointmentSelectChange('type', value)}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Retorno">Retorno</SelectItem>
                      <SelectItem value="Avaliação">Avaliação</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Data*
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => handleAppointmentInputChange('date', e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>

                {/* Time */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">
                    Hora*
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={newAppointment.time}
                     onChange={(e) => handleAppointmentInputChange('time', e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>

                {/* Notes */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="notes" className="text-right pt-2">
                    Observações
                  </Label>
                  <Textarea
                    id="notes"
                    value={newAppointment.notes}
                     onChange={(e) => handleAppointmentInputChange('notes', e.target.value)}
                    className="col-span-3"
                    rows={3}
                    placeholder="Detalhes adicionais sobre o agendamento..."
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancelar</Button>
                 </DialogClose>
                <Button type="submit">Salvar Agendamento</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
              // Disabled dates example (optional)
              // disabled={(date) => date < new Date("1900-01-01")}
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
              todaysAppointments.map((appt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="flex flex-col items-center w-12">
                        <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="font-semibold text-sm text-primary">{appt.time}</span>
                     </div>
                     <div className="border-l pl-3">
                        <p className="font-medium flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground"/> {appt.patient}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><ClipboardList className="h-4 w-4 text-muted-foreground"/> {appt.type}</p>
                        {appt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{appt.notes}"</p>}
                     </div>
                  </div>
                    {/* Link to patient detail page */}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/pacientes/${generateSlug(appt.patient)}`}>
                         Ver Paciente
                      </Link>
                    </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                 <CalendarPlus className="mx-auto h-12 w-12 mb-4" />
                <p>Nenhum agendamento para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'esta data'}.</p>
                 <Button variant="link" onClick={() => setIsNewAppointmentDialogOpen(true)}>
                   Adicionar agendamento
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    