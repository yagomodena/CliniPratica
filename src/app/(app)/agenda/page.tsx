
'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIconLucide, PlusCircle, ChevronLeft, ChevronRight, Clock, User, ClipboardList, CalendarPlus, Edit, Trash2, Save, X, Plus, Search, Pencil, Eye } from "lucide-react"; // Renamed Calendar to CalendarIconLucide to avoid conflict
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, subDays, parse, isBefore, startOfDay, isToday, isEqual, isSameDay } from 'date-fns';
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
import { Switch } from '@/components/ui/switch';

import { getAuth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from '@/firebase';

// Patient data structure fetched from Firebase
type PatientFromFirebase = {
  id: string; // Firestore document ID
  name: string;
  status: string;
  slug: string; // Slug for linking
};

// Appointment data structure
type Appointment = {
  id: string;
  time: string;
  patientId: string; // Firestore document ID of the patient
  patientName: string;
  patientSlug: string; // Slug for linking to patient detail page
  type: string; // This will store the name of the appointment type
  notes?: string;
};

type AppointmentsData = {
  [dateKey: string]: Appointment[];
};

const initialAppointments: AppointmentsData = {
  [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [
    { id: 'appt-1', time: '09:00', patientId: 'p001_placeholder', patientName: 'Ana Silva (Exemplo)', patientSlug: 'ana-silva-exemplo', type: 'Consulta', notes: 'Consulta inicial de exemplo' },
    { id: 'appt-2', time: '10:30', patientId: 'p002_placeholder', patientName: 'Carlos Souza (Exemplo)', patientSlug: 'carlos-souza-exemplo', type: 'Retorno' },
  ],
  [format(addDays(new Date(), 3), 'yyyy-MM-dd')]: [
    { id: 'appt-3', time: '14:00', patientId: 'p003_placeholder', patientName: 'Beatriz Lima (Exemplo)', patientSlug: 'beatriz-lima-exemplo', type: 'Consulta' },
  ],
};

type AppointmentFormValues = {
  patientId: string;
  type: string;
  date: string;
  time: string;
  notes: string;
}

type AppointmentTypeObject = {
  name: string;
  status: 'active' | 'inactive';
};

const fallbackAppointmentTypesData: AppointmentTypeObject[] = [
  { name: 'Consulta', status: 'active' },
  { name: 'Retorno', status: 'active' },
  { name: 'Avaliação', status: 'active' },
  { name: 'Outro', status: 'active' },
];


// Helper function to get Firestore path for appointment types
const getAppointmentTypesPath = (userData: any) => {
  const isClinica = userData?.plano === 'Clínica';
  // Ensure userData.uid exists for non-Clínica plans, or userData.nomeEmpresa for Clínica plans
  const identifier = isClinica ? userData.nomeEmpresa : userData.uid;
  if (!identifier) {
    console.error("Identificador do usuário ou empresa não encontrado para tipos de atendimento.", userData);
    // Fallback path or throw error, depending on desired behavior
    // For now, let's assume a generic path if identifier is missing, though this might not be ideal
    return collection(db, 'appointmentTypes', 'default_types', 'tipos'); 
  }
  return collection(db, 'appointmentTypes', identifier, 'tipos');
};


export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [clientToday, setClientToday] = useState<Date | undefined>(undefined);
  const [clientNow, setClientNow] = useState<Date | undefined>(undefined);

  const [appointments, setAppointments] = useState<AppointmentsData>(initialAppointments);
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [firebasePatients, setFirebasePatients] = useState<PatientFromFirebase[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeObject[]>([]);
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState('');
  const [isManageTypesDialogOpen, setIsManageTypesDialogOpen] = useState(false);
  const [editingTypeInfo, setEditingTypeInfo] = useState<{ originalName: string, currentName: string } | null>(null);
  const [typeToToggleStatusConfirm, setTypeToToggleStatusConfirm] = useState<AppointmentTypeObject | null>(null);


  const fetchCurrentUserData = useCallback(async () => {
    const authInstance = getAuth();
    const firebaseCurrentUser = authInstance.currentUser;
    if (!firebaseCurrentUser) throw new Error("Usuário não autenticado");

    const userDocRef = doc(db, 'usuarios', firebaseCurrentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data();

    if (!userData) throw new Error("Dados do usuário não encontrados no Firestore");
    return { ...userData, uid: firebaseCurrentUser.uid }; // Ensure uid is part of returned object
  }, []);

  const fetchAppointmentTypes = useCallback(async () => {
    try {
      const userProfile = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(userProfile);
      const snapshot = await getDocs(tiposRef);
      const tipos: AppointmentTypeObject[] = snapshot.docs.map(docSnap => ({
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      setAppointmentTypes(tipos.length > 0 ? tipos : fallbackAppointmentTypesData);
    } catch (error) {
      console.error("Erro ao buscar tipos de atendimento:", error);
      toast({ title: "Erro ao buscar tipos", description: "Não foi possível carregar os tipos de atendimento.", variant: "destructive" });
      setAppointmentTypes(fallbackAppointmentTypesData); // Fallback on error
    }
  }, [fetchCurrentUserData, toast]);


  const getFirstActiveTypeName = useCallback(() => {
    return appointmentTypes.find(t => t.status === 'active')?.name || '';
  }, [appointmentTypes]);

  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const [newAppointmentForm, setNewAppointmentForm] = useState<AppointmentFormValues>({
    patientId: '',
    type: '', // Will be set by useEffect
    date: '',
    time: '',
    notes: '',
  });

  const [isEditAppointmentDialogOpen, setIsEditAppointmentDialogOpen] = useState(false);
  const [editingAppointmentInfo, setEditingAppointmentInfo] = useState<{ appointment: Appointment; dateKey: string } | null>(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState<AppointmentFormValues>({
    patientId: '', type: '', date: '', time: '', notes: '', // Type will be set by useEffect
  });

  const [isDeleteApptConfirmOpen, setIsDeleteApptConfirmOpen] = useState(false);
  const [appointmentToDeleteInfo, setAppointmentToDeleteInfo] = useState<{ appointment: Appointment; dateKey: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setFirebasePatients([]);
        setIsLoadingPatients(false);
      } else {
        fetchAppointmentTypes(); // Fetch types when user is available
      }
    });
    return () => unsubscribe();
  }, [fetchAppointmentTypes]);

  useEffect(() => {
    if (currentUser) {
      const fetchPatientsForUser = async () => {
        setIsLoadingPatients(true);
        try {
          const patientsRef = collection(db, 'pacientes');
          const q = query(patientsRef, where('uid', '==', currentUser.uid), where('status', '==', 'Ativo'));
          const querySnapshot = await getDocs(q);
          const fetchedPatientsData: PatientFromFirebase[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedPatientsData.push({
              id: docSnap.id,
              name: data.name as string,
              status: data.status as string,
              slug: data.slug as string, 
            });
          });
          setFirebasePatients(fetchedPatientsData);
        } catch (error) {
          console.error("Erro ao buscar pacientes:", error);
          toast({ title: "Erro ao buscar pacientes", description: "Não foi possível carregar a lista de pacientes.", variant: "destructive" });
          setFirebasePatients([]);
        } finally {
          setIsLoadingPatients(false);
        }
      };
      fetchPatientsForUser();
    } else {
      setFirebasePatients([]);
      setIsLoadingPatients(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    const now = new Date();
    const todayForClient = startOfDay(now);

    setSelectedDate(now);
    setClientToday(todayForClient);
    setClientNow(now);

    setNewAppointmentForm(prev => ({
      ...prev,
      date: format(now, 'yyyy-MM-dd'),
      type: getFirstActiveTypeName() || '' // Ensure fallback if types not loaded yet
    }));
    setEditAppointmentForm(prev => ({ ...prev, type: getFirstActiveTypeName() || '' }));
  }, [getFirstActiveTypeName]); // Removed appointmentTypes from deps, rely on getFirstActiveTypeName


  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setNewAppointmentForm(prev => ({ ...prev, date: formattedDate }));
    }
  }, [selectedDate]);
  
  // Effect to update form types when appointmentTypes change
  useEffect(() => {
    const firstActive = getFirstActiveTypeName();
    if (firstActive) {
      setNewAppointmentForm(prev => ({ ...prev, type: prev.type || firstActive }));
      setEditAppointmentForm(prev => ({ ...prev, type: prev.type || firstActive }));
    }
  }, [appointmentTypes, getFirstActiveTypeName]);

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
    if (!clientToday || !clientNow) return true;
    if (isBefore(startOfDay(dateTime), clientToday)) {
      return true;
    }
    if (isSameDay(dateTime, clientToday) && isBefore(dateTime, clientNow)) {
      return true;
    }
    return false;
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
    const activeAppointmentType = appointmentTypes.find(t => t.name === type && t.status === 'active');
    if (!activeAppointmentType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo.", variant: "destructive" });
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

    const selectedPatient = firebasePatients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    const newApptEntry: Appointment = {
      id: `appt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time,
      patientId,
      patientName: selectedPatient.name,
      patientSlug: selectedPatient.slug,
      type,
      notes,
    };

    setAppointments(prev => {
      const updatedDayAppointments = [...(prev[date] || []), newApptEntry].sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [date]: updatedDayAppointments };
    });

    setNewAppointmentForm(prev => ({
      ...prev,
      patientId: '', type: getFirstActiveTypeName(),
      time: '', notes: '',
    }));
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
    const activeAppointmentType = appointmentTypes.find(t => t.name === type && t.status === 'active');
    if (!activeAppointmentType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo.", variant: "destructive" });
      return;
    }

    const appointmentDateTime = validateAppointmentDateTime(newDateKey, time);
    if (!appointmentDateTime) return;

    const isOriginalDateTime = originalDateKey === newDateKey && originalAppointment.time === time;
    if (!isOriginalDateTime && isDateTimeInPast(appointmentDateTime)) {
      toast({ title: "Data/Hora Inválida", description: "Não é possível mover agendamento para datas ou horários passados.", variant: "destructive" });
      return;
    }

    if (isTimeSlotOccupied(newDateKey, time, originalAppointment.id)) {
      toast({ title: "Horário Ocupado", description: `Já existe outro agendamento para ${format(parse(newDateKey, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')} às ${time}.`, variant: "destructive" });
      return;
    }

    const selectedPatient = firebasePatients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    const updatedAppointment: Appointment = {
      ...originalAppointment,
      patientId,
      patientName: selectedPatient.name,
      patientSlug: selectedPatient.slug,
      type,
      time,
      notes,
    };

    setAppointments(prev => {
      const newAppointmentsData = { ...prev };
      const oldDayAppointments = (newAppointmentsData[originalDateKey] || []).filter(appt => appt.id !== originalAppointment.id);
      if (oldDayAppointments.length > 0) {
        newAppointmentsData[originalDateKey] = oldDayAppointments;
      } else {
        delete newAppointmentsData[originalDateKey];
      }

      const newDayAppointments = [...(newAppointmentsData[newDateKey] || []), updatedAppointment].sort((a, b) => a.time.localeCompare(b.time));
      newAppointmentsData[newDateKey] = newDayAppointments;
      return newAppointmentsData;
    });

    setIsEditAppointmentDialogOpen(false);
    setEditingAppointmentInfo(null);
    toast({ title: "Sucesso!", description: "Agendamento atualizado.", variant: "success" });
  };

  const handleOpenDeleteApptDialog = (appointment: Appointment, dateKey: string) => {
    setAppointmentToDeleteInfo({ appointment, dateKey });
    setIsDeleteApptConfirmOpen(true);
  };

  const handleConfirmDeleteAppt = () => {
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

    setIsDeleteApptConfirmOpen(false);
    setAppointmentToDeleteInfo(null);
    toast({ title: "Agendamento Excluído", description: "O agendamento foi removido.", variant: "success" });
  };

  const goToPreviousDay = () => setSelectedDate(prev => prev ? subDays(prev, 1) : (clientToday ? subDays(clientToday, 1) : undefined));
  const goToNextDay = () => setSelectedDate(prev => prev ? addDays(prev, 1) : (clientToday ? addDays(clientToday, 1) : undefined));

  const handleAddCustomType = async () => {
    const trimmedName = newCustomTypeName.trim();
    if (!trimmedName) {
      toast({ title: 'Erro', description: 'Nome não pode ser vazio.', variant: 'destructive' });
      return;
    }
    if (appointmentTypes.some(type => type.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }

    try {
      const userProfile = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(userProfile);
      
      await addDoc(tiposRef, {
        name: trimmedName,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Sucesso', description: 'Tipo adicionado.' });
      setNewCustomTypeName('');
      setIsAddTypeDialogOpen(false);
      fetchAppointmentTypes(); // Refresh list from Firestore
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar o tipo de atendimento.', variant: 'destructive' });
    }
  };

  const handleSaveEditedTypeName = async () => {
    if (!editingTypeInfo) return;
    const { originalName, currentName } = editingTypeInfo;
    const newNameTrimmed = currentName.trim();

    if (!newNameTrimmed) {
      toast({ title: "Erro", description: "O nome do tipo não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalName.toLowerCase() && appointmentTypes.some(type => type.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }

    try {
      const userProfile = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(userProfile);
      const q = query(tiposRef, where("name", "==", originalName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "Erro", description: "Tipo original não encontrado para editar.", variant: "destructive" });
        return;
      }
      const docToUpdateRef = querySnapshot.docs[0].ref;
      await updateDoc(docToUpdateRef, { name: newNameTrimmed });

      setEditingTypeInfo(null);
      toast({ title: "Sucesso", description: `Nome do tipo "${originalName}" atualizado para "${newNameTrimmed}".`, variant: "success" });
      await fetchAppointmentTypes(); // Refresh from Firestore

      // Update local appointments if type name changed
       setAppointments(prevAppointments => {
        const updated = { ...prevAppointments };
        for (const dateKey in updated) {
          updated[dateKey] = updated[dateKey].map(appt =>
            appt.type === originalName ? { ...appt, type: newNameTrimmed } : appt
          );
        }
        return updated;
      });

      // Update forms if they were using the old type name
      if (newAppointmentForm.type === originalName) {
        setNewAppointmentForm(prev => ({ ...prev, type: newNameTrimmed }));
      }
      if (editAppointmentForm.type === originalName) {
        setEditAppointmentForm(prev => ({ ...prev, type: newNameTrimmed }));
      }

    } catch (error) {
      console.error("Erro ao editar nome do tipo:", error);
      toast({ title: "Erro", description: "Falha ao atualizar o nome do tipo.", variant: "destructive" });
    }
  };

  const handleToggleTypeStatus = async (typeName: string) => {
    const typeToToggle = appointmentTypes.find(t => t.name === typeName);
    if (!typeToToggle) return;

    const newStatus = typeToToggle.status === 'active' ? 'inactive' : 'active';

    const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;
    if (newStatus === 'inactive' && activeTypesCount <= 1) {
      toast({ title: "Atenção", description: "Não é possível desativar o último tipo de atendimento ativo.", variant: "warning" });
      setTypeToToggleStatusConfirm(null);
      return;
    }

    try {
      const userProfile = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(userProfile);
      const q = query(tiposRef, where("name", "==", typeName));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ title: "Erro", description: "Tipo não encontrado para alterar status.", variant: "destructive" });
        setTypeToToggleStatusConfirm(null);
        return;
      }
      const docToUpdateRef = querySnapshot.docs[0].ref;
      await updateDoc(docToUpdateRef, { status: newStatus });
      
      toast({
        title: "Status Alterado",
        description: `O tipo "${typeName}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.`,
        variant: "success"
      });
      setTypeToToggleStatusConfirm(null);
      await fetchAppointmentTypes(); // Refresh from Firestore

      // Update forms if the deactivated type was selected
      if (newStatus === 'inactive') {
        const firstActive = getFirstActiveTypeName(); // getFirstActiveTypeName will use the updated list
        if (newAppointmentForm.type === typeName) {
          setNewAppointmentForm(prev => ({ ...prev, type: firstActive || '' }));
        }
        if (editAppointmentForm.type === typeName) {
          setEditAppointmentForm(prev => ({ ...prev, type: firstActive || '' }));
        }
      }
    } catch (error) {
      console.error("Erro ao alterar status do tipo:", error);
      toast({ title: "Erro", description: "Falha ao alterar o status do tipo.", variant: "destructive" });
      setTypeToToggleStatusConfirm(null);
    }
  };

  const activeAppointmentTypes = appointmentTypes.filter(t => t.status === 'active');


  if (!clientToday || !selectedDate || !clientNow) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-muted-foreground">Carregando agenda...</p>
      </div>
    );
  }

  const formattedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const todaysAppointments: Appointment[] = appointments[formattedDateKey] || [];
  const isSelectedDatePast = selectedDate && clientToday ? isBefore(startOfDay(selectedDate), clientToday) : false;

  const apptDateTimeForEditButton = (apptTime: string) => formattedDateKey ? parse(`${formattedDateKey} ${apptTime}`, 'yyyy-MM-dd HH:mm', new Date()) : null;
  const disableEditButton = (apptTime: string) => {
    const apptDT = apptDateTimeForEditButton(apptTime);
    return !clientNow || !apptDT || isBefore(apptDT, clientNow);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <Dialog open={isNewAppointmentDialogOpen} onOpenChange={(isOpen) => {
          setIsNewAppointmentDialogOpen(isOpen);
          if (isOpen && newAppointmentForm.type === '' && activeAppointmentTypes.length > 0) {
            setNewAppointmentForm(prev => ({ ...prev, type: activeAppointmentTypes[0].name }));
          }
        }}>
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
                <Label htmlFor="newPatientId" className="text-right col-span-1">Paciente*</Label>
                <Select value={newAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'patientId', value)} required>
                  <SelectTrigger id="newPatientId" className="col-span-3"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {isLoadingPatients ? (
                      <SelectItem value="loading" disabled>Carregando pacientes...</SelectItem>
                    ) : firebasePatients.length === 0 ? (
                      <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>
                    ) : (
                      firebasePatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newType" className="text-right col-span-1">Tipo*</Label>
                <div className="col-span-3 flex items-center gap-1">
                  <Select value={newAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'type', value)} required>
                    <SelectTrigger id="newType" className="flex-grow"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {activeAppointmentTypes.map((type) => <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>)}
                      {activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum tipo ativo</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar novo tipo" className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar tipos" className="flex-shrink-0">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newDate" className="text-right col-span-1">Data*</Label>
                <Input id="newDate" type="date" value={newAppointmentForm.date} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'date', e.target.value)} className="col-span-3" min={clientToday ? format(clientToday, 'yyyy-MM-dd') : undefined} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newTime" className="text-right col-span-1">Hora*</Label>
                <Input id="newTime" type="time" value={newAppointmentForm.time} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'time', e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="newNotes" className="text-right col-span-1 pt-2">Observações</Label>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500 hover:bg-blue-100"
                      onClick={() => handleOpenEditDialog(appt, formattedDateKey)}
                      title="Editar Agendamento"
                      disabled={disableEditButton(appt.time)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" title="Excluir Agendamento">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão de Agendamento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este agendamento para {appt.patientName} às {appt.time}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => { setAppointmentToDeleteInfo(null); }}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            setAppointmentToDeleteInfo({ appointment: appt, dateKey: formattedDateKey }); // Set info first
                            handleConfirmDeleteAppt(); // Then call confirm
                          }} className="bg-destructive hover:bg-destructive/90">Excluir Agendamento</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button asChild variant="ghost" size="sm" className="h-8">
                      <Link href={`/pacientes/${appt.patientSlug}`}>
                        <span className="sm:hidden">Ver</span>
                        <span className="hidden sm:inline">Ver Paciente</span>
                      </Link>
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
              <Label htmlFor="editPatientId" className="text-right col-span-1">Paciente*</Label>
              <Select value={editAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm, 'patientId', value)} required>
                <SelectTrigger id="editPatientId" className="col-span-3"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {isLoadingPatients ? (
                    <SelectItem value="loading" disabled>Carregando pacientes...</SelectItem>
                  ) : firebasePatients.length === 0 ? (
                    <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>
                  ) : (
                    firebasePatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editType" className="text-right col-span-1">Tipo*</Label>
              <div className="col-span-3 flex items-center gap-1">
                <Select value={editAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm, 'type', value)} required>
                  <SelectTrigger id="editType" className="flex-grow"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {activeAppointmentTypes.map((type) => <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>)}
                    {activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum tipo ativo</SelectItem>}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar novo tipo" className="flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar tipos" className="flex-shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editDate" className="text-right col-span-1">Data*</Label>
              <Input
                id="editDate"
                type="date"
                value={editAppointmentForm.date}
                onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'date', e.target.value)}
                className="col-span-3"
                min={clientToday && editingAppointmentInfo && isSameDay(parse(editingAppointmentInfo.dateKey, 'yyyy-MM-dd', new Date()), clientToday) ? format(clientToday, 'yyyy-MM-dd') : undefined}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTime" className="text-right col-span-1">Hora*</Label>
              <Input id="editTime" type="time" value={editAppointmentForm.time} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'time', e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="editNotes" className="text-right col-span-1 pt-2">Observações</Label>
              <Textarea id="editNotes" value={editAppointmentForm.notes} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'notes', e.target.value)} className="col-span-3" rows={3} placeholder="Detalhes adicionais..." />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit"><Save className="mr-2 h-4 w-4" />Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Appointment Type Dialog */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Tipo de Atendimento</DialogTitle>
            <DialogDescription>Insira o nome do novo tipo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newCustomTypeName">Nome do Tipo</Label>
            <Input
              id="newCustomTypeName"
              value={newCustomTypeName}
              onChange={(e) => setNewCustomTypeName(e.target.value)}
              placeholder="Ex: Sessão Extra"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCustomTypeName('')}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleAddCustomType}>Salvar Tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Appointment Types Dialog */}
      <Dialog open={isManageTypesDialogOpen} onOpenChange={setIsManageTypesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle>
            <DialogDescription>Edite ou altere o status dos tipos de atendimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {appointmentTypes.map((type) => (
              <div key={type.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingTypeInfo?.originalName === type.name ? (
                  <div className="flex-grow flex items-center gap-2 mr-2">
                    <Input
                      value={editingTypeInfo.currentName}
                      onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)}
                      className="h-8"
                    />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedTypeName} title="Salvar Nome"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo(null)} title="Cancelar Edição"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <span className={`flex-grow ${type.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{type.name}</span>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {editingTypeInfo?.originalName !== type.name && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo({ originalName: type.name, currentName: type.name })} title="Editar Nome">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Switch
                    checked={type.status === 'active'}
                    onCheckedChange={() => {
                      const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;
                      if (type.status === 'active' && activeTypesCount <= 1) {
                        toast({ title: "Atenção", description: "Não é possível desativar o último tipo de atendimento ativo.", variant: "warning" });
                        return;
                      }
                      setTypeToToggleStatusConfirm(type);
                    }}
                    aria-label={`Status do tipo ${type.name}`}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400 flex-shrink-0"
                  />
                </div>
              </div>
            ))}
            {appointmentTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo cadastrado.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Appointment Type Status Dialog */}
      <AlertDialog open={!!typeToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setTypeToToggleStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {typeToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} o tipo "{typeToToggleStatusConfirm?.name}"?
              {typeToToggleStatusConfirm?.status === 'active' && " Se desativado, não estará mais disponível para novos agendamentos, mas os existentes não serão alterados."}
              {typeToToggleStatusConfirm?.status === 'inactive' && " Se ativado, estará disponível para novos agendamentos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypeToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => typeToToggleStatusConfirm && handleToggleTypeStatus(typeToToggleStatusConfirm.name)}
              className={typeToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
            >
              {typeToToggleStatusConfirm?.status === 'active' ? 'Desativar Tipo' : 'Ativar Tipo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteApptConfirmOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setAppointmentToDeleteInfo(null);
        }
        setIsDeleteApptConfirmOpen(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento para {appointmentToDeleteInfo?.appointment.patientName} às {appointmentToDeleteInfo?.appointment.time}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteAppt} className="bg-destructive hover:bg-destructive/90">Excluir Agendamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
