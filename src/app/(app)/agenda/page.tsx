'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight, Clock, User, ClipboardList, CalendarPlus, Edit, Trash2, Save, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ShadCN Calendar
import { format, addDays, subDays, parse, isBefore, startOfDay, isToday, isEqual } from 'date-fns';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


// --- Placeholder Data (Shared between Agenda and Pacientes) ---
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
  id: string;
  time: string;
  patientId: string;
  patientName: string;
  type: string;
  notes?: string;
};

type AppointmentsData = {
  [dateKey: string]: Appointment[];
};

// Initial appointment data
const initialAppointments: AppointmentsData = {
  [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [ // Use a future date for initial data
    { id: 'appt-1', time: '09:00', patientId: 'p001', patientName: 'Ana Silva', type: 'Consulta', notes: 'Consulta inicial' },
    { id: 'appt-2', time: '10:30', patientId: 'p002', patientName: 'Carlos Souza', type: 'Retorno' },
  ],
  [format(addDays(new Date(), 3), 'yyyy-MM-dd')]: [
    { id: 'appt-3', time: '14:00', patientId: 'p003', patientName: 'Beatriz Lima', type: 'Consulta' },
  ],
};

type AppointmentFormValues = {
  patientId: string;
  type: string;
  date: string;
  time: string;
  notes: string;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<AppointmentsData>(initialAppointments);
  const [patients] = useState(initialPatients.filter(p => p.status === 'Ativo'));
  const { toast } = useToast();
  const today = startOfDay(new Date());

  // State for New Appointment Dialog
  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const [newAppointmentForm, setNewAppointmentForm] = useState<AppointmentFormValues>({
    patientId: '',
    type: 'Consulta',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    time: '',
    notes: '',
  });

  // State for Edit Appointment Dialog
  const [isEditAppointmentDialogOpen, setIsEditAppointmentDialogOpen] = useState(false);
  const [editingAppointmentInfo, setEditingAppointmentInfo] = useState<{ appointment: Appointment; dateKey: string } | null>(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState<AppointmentFormValues>({
    patientId: '', type: 'Consulta', date: '', time: '', notes: '',
  });

  // State for Delete Confirmation Dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [appointmentToDeleteInfo, setAppointmentToDeleteInfo] = useState<{ appointment: Appointment; dateKey: string } | null>(null);


  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setNewAppointmentForm(prev => ({ ...prev, date: formattedDate }));
      // If editing, and selectedDate changes, update edit form's date only if it's a new selection, not from opening dialog
      // This might be complex, for now, edit dialog will handle its own date state primarily
    }
  }, [selectedDate]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleFormInputChange = (formSetter: React.Dispatch<React.SetStateAction<AppointmentFormValues>>, field: keyof AppointmentFormValues, value: string) => {
    formSetter(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSelectChange = (formSetter: React.Dispatch<React.SetStateAction<AppointmentFormValues>>, field: keyof AppointmentFormValues, value: string) => {
    formSetter(prev => ({ ...prev, [field]: value }));
  };
  
  const validateAppointmentDateTime = (dateStr: string, timeStr: string): Date | null => {
    const appointmentDateTimeString = `${dateStr} ${timeStr}`;
    try {
      const parsedDateTime = parse(appointmentDateTimeString, 'yyyy-MM-dd HH:mm', new Date());
      if (isNaN(parsedDateTime.getTime())) {
        throw new Error('Invalid date/time format');
      }
      return parsedDateTime;
    } catch (error) {
      console.error("Error parsing date/time:", error);
      toast({ title: "Erro de Formato", description: "A data ou hora fornecida é inválida.", variant: "destructive" });
      return null;
    }
  };

  const isDateTimeInPast = (dateTime: Date): boolean => {
    const now = new Date();
    now.setSeconds(0, 0); // Ignore seconds/ms for comparison
    return isBefore(startOfDay(dateTime), today) || (isToday(dateTime) && isBefore(dateTime, now));
  };

  const isTimeSlotOccupied = (dateKey: string, time: string, excludingAppointmentId?: string): boolean => {
    const appointmentsOnDay = appointments[dateKey] || [];
    return appointmentsOnDay.some(appt => appt.time === time && (!excludingAppointmentId || appt.id !== excludingAppointmentId));
  };

  const handleAddAppointment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { patientId, type, date, time, notes } = newAppointmentForm;

    if (!patientId || !date || !time || !type) {
      toast({ title: "Erro de Validação", description: "Paciente, Data, Hora e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }

    const appointmentDateTime = validateAppointmentDateTime(date, time);
    if (!appointmentDateTime) return;

    if (isDateTimeInPast(appointmentDateTime)) {
      toast({ title: "Data/Hora Inválida", description: "Não é possível agendar em datas ou horários passados.", variant: "destructive" });
      return;
    }

    if (isTimeSlotOccupied(date, time)) {
      toast({ title: "Horário Ocupado", description: `Já existe um agendamento para ${format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')} às ${time}.`, variant: "destructive" });
      return;
    }

    const selectedPatient = patients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    const newApptEntry: Appointment = {
      id: `appt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time,
      patientId,
      patientName: selectedPatient.name,
      type,
      notes,
    };

    setAppointments(prev => {
      const updatedDayAppointments = [...(prev[date] || []), newApptEntry].sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [date]: updatedDayAppointments };
    });

    setNewAppointmentForm({
      patientId: '', type: 'Consulta',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: '', notes: '',
    });
    setIsNewAppointmentDialogOpen(false);
    toast({ title: "Sucesso!", description: "Agendamento adicionado.", variant: "success" });
  };

  const handleOpenEditDialog = (appointment: Appointment, dateKey: string) => {
    setEditingAppointmentInfo({ appointment, dateKey });
    setEditAppointmentForm({
      patientId: appointment.patientId,
      type: appointment.type,
      date: dateKey,
      time: appointment.time,
      notes: appointment.notes || '',
    });
    setIsEditAppointmentDialogOpen(true);
  };

  const handleSaveEditedAppointment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAppointmentInfo) return;

    const { appointment: originalAppointment, dateKey: originalDateKey } = editingAppointmentInfo;
    const { patientId, type, date: newDateKey, time, notes } = editAppointmentForm;
    
    if (!patientId || !newDateKey || !time || !type) {
      toast({ title: "Erro de Validação", description: "Paciente, Data, Hora e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }

    const appointmentDateTime = validateAppointmentDateTime(newDateKey, time);
    if (!appointmentDateTime) return;
    
    // Allow saving if it's the original date/time OR it's not in the past
    const isOriginalDateTime = originalDateKey === newDateKey && originalAppointment.time === time;
    if (!isOriginalDateTime && isDateTimeInPast(appointmentDateTime)) {
      toast({ title: "Data/Hora Inválida", description: "Não é possível mover agendamento para datas ou horários passados.", variant: "destructive" });
      return;
    }

    if (isTimeSlotOccupied(newDateKey, time, originalAppointment.id)) {
       toast({ title: "Horário Ocupado", description: `Já existe outro agendamento para ${format(parse(newDateKey, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')} às ${time}.`, variant: "destructive" });
      return;
    }
    
    const selectedPatient = patients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    const updatedAppointment: Appointment = {
      ...originalAppointment,
      patientId,
      patientName: selectedPatient.name,
      type,
      time,
      notes,
    };

    setAppointments(prev => {
      const newAppointmentsData = { ...prev };
      // Remove from original date list
      const oldDayAppointments = (newAppointmentsData[originalDateKey] || []).filter(appt => appt.id !== originalAppointment.id);
      if (oldDayAppointments.length > 0) {
        newAppointmentsData[originalDateKey] = oldDayAppointments;
      } else {
        delete newAppointmentsData[originalDateKey];
      }
      
      // Add to new date list (or updated in original if date didn't change)
      const newDayAppointments = [...(newAppointmentsData[newDateKey] || []), updatedAppointment].sort((a,b) => a.time.localeCompare(b.time));
      newAppointmentsData[newDateKey] = newDayAppointments;
      return newAppointmentsData;
    });

    setIsEditAppointmentDialogOpen(false);
    setEditingAppointmentInfo(null);
    toast({ title: "Sucesso!", description: "Agendamento atualizado.", variant: "success" });
  };
  
  const handleOpenDeleteDialog = (appointment: Appointment, dateKey: string) => {
    setAppointmentToDeleteInfo({ appointment, dateKey });
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!appointmentToDeleteInfo) return;
    const { appointment, dateKey } = appointmentToDeleteInfo;

    setAppointments(prev => {
      const updatedAppointments = { ...prev };
      updatedAppointments[dateKey] = (updatedAppointments[dateKey] || []).filter(appt => appt.id !== appointment.id);
      if (updatedAppointments[dateKey].length === 0) {
        delete updatedAppointments[dateKey];
      }
      return updatedAppointments;
    });

    setIsDeleteConfirmOpen(false);
    setAppointmentToDeleteInfo(null);
    toast({ title: "Agendamento Excluído", description: "O agendamento foi removido.", variant: "success" });
  };

  const goToPreviousDay = () => setSelectedDate(prev => prev ? subDays(prev, 1) : subDays(today, 1));
  const goToNextDay = () => setSelectedDate(prev => prev ? addDays(prev, 1) : addDays(today, 1));

  const formattedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const todaysAppointments: Appointment[] = appointments[formattedDateKey] || [];
  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
  const isSelectedDatePast = selectedDate ? isBefore(startOfDay(selectedDate), today) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <Dialog open={isNewAppointmentDialogOpen} onOpenChange={setIsNewAppointmentDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isSelectedDatePast} title={isSelectedDatePast ? "Não é possível agendar em datas passadas" : "Novo Agendamento"}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Preencha os detalhes.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAppointment} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPatientId" className="text-right">Paciente*</Label>
                <Select value={newAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'patientId', value)} required>
                  <SelectTrigger id="newPatientId" className="col-span-3"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    {patients.length === 0 && <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newType" className="text-right">Tipo*</Label>
                <Select value={newAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'type', value)} required>
                  <SelectTrigger id="newType" className="col-span-3"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Retorno">Retorno</SelectItem>
                    <SelectItem value="Avaliação">Avaliação</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newDate" className="text-right">Data*</Label>
                <Input id="newDate" type="date" value={newAppointmentForm.date} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'date', e.target.value)} className="col-span-3" min={format(today, 'yyyy-MM-dd')} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newTime" className="text-right">Hora*</Label>
                <Input id="newTime" type="time" value={newAppointmentForm.time} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'time', e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="newNotes" className="text-right pt-2">Observações</Label>
                <Textarea id="newNotes" value={newAppointmentForm.notes} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'notes', e.target.value)} className="col-span-3" rows={3} placeholder="Detalhes adicionais..." />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader><CardTitle>Calendário</CardTitle><CardDescription>Selecione uma data.</CardDescription></CardHeader>
          <CardContent className="flex justify-center">
            <Calendar mode="single" selected={selectedDate} onSelect={handleDateChange} className="rounded-md border" locale={ptBR} initialFocus />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agendamentos para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Data Selecionada'}</CardTitle>
                <CardDescription>Compromissos do dia.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousDay} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={goToNextDay} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center w-12">
                      <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="font-semibold text-sm text-primary">{appt.time}</span>
                    </div>
                    <div className="border-l pl-3">
                      <p className="font-medium flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground" /> {appt.patientName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><ClipboardList className="h-4 w-4 text-muted-foreground" /> {appt.type}</p>
                      {appt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{appt.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-100" onClick={() => handleOpenEditDialog(appt, formattedDateKey)} title="Editar Agendamento" disabled={isBefore(parse(`${formattedDateKey} ${appt.time}`, 'yyyy-MM-dd HH:mm', new Date()), new Date()) && !isToday(parse(formattedDateKey, 'yyyy-MM-dd', new Date()))}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={() => handleOpenDeleteDialog(appt, formattedDateKey)} title="Excluir Agendamento">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </AlertDialogTrigger>
                    <Button asChild variant="ghost" size="sm" className="h-8">
                      <Link href={`/pacientes/${generateSlug(appt.patientName)}`}>Ver Paciente</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <CalendarPlus className="mx-auto h-12 w-12 mb-4" />
                <p>Nenhum agendamento para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'esta data'}.</p>
                <Button variant="link" onClick={() => setIsNewAppointmentDialogOpen(true)} disabled={isSelectedDatePast}>
                  {isSelectedDatePast ? "Não é possível agendar" : "Adicionar agendamento"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentDialogOpen} onOpenChange={setIsEditAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Modifique os detalhes do agendamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditedAppointment} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPatientId" className="text-right">Paciente*</Label>
                <Select value={editAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm,'patientId', value)} required>
                  <SelectTrigger id="editPatientId" className="col-span-3"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editType" className="text-right">Tipo*</Label>
                <Select value={editAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm, 'type', value)} required>
                  <SelectTrigger id="editType" className="col-span-3"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Retorno">Retorno</SelectItem>
                    <SelectItem value="Avaliação">Avaliação</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDate" className="text-right">Data*</Label>
                <Input id="editDate" type="date" value={editAppointmentForm.date} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'date', e.target.value)} className="col-span-3" min={editingAppointmentInfo && isToday(parse(editingAppointmentInfo.dateKey, 'yyyy-MM-dd', new Date())) ? format(today, 'yyyy-MM-dd') : undefined} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTime" className="text-right">Hora*</Label>
                <Input id="editTime" type="time" value={editAppointmentForm.time} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'time', e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="editNotes" className="text-right pt-2">Observações</Label>
                <Textarea id="editNotes" value={editAppointmentForm.notes} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'notes', e.target.value)} className="col-span-3" rows={3} placeholder="Detalhes adicionais..." />
              </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit"><Save className="mr-2 h-4 w-4" />Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        {/* AlertDialogTrigger is handled by direct call to setIsDeleteConfirmOpen */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento para {appointmentToDeleteInfo?.appointment.patientName} às {appointmentToDeleteInfo?.appointment.time}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDeleteInfo(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    