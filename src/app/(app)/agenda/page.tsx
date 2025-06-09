
'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIconLucide, PlusCircle, ChevronLeft, ChevronRight, Clock, User, ClipboardList, CalendarPlus, Edit, Trash2, Save, X, Plus, Search, Pencil, Eye, MoreVertical, CheckCircle, RotateCcw, XCircle, MessageSquare, Send, FileText, Loader2, DollarSign, UserCog } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, subDays, parse, isBefore, startOfDay, isToday, isEqual, isSameDay, parseISO, isFuture } from 'date-fns';
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import dynamic from 'next/dynamic';


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
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/firebase';

const TiptapEditor = dynamic(() => import('@/components/tiptap-editor').then(mod => mod.TiptapEditor), {
  ssr: false,
  loading: () => <div className="w-full h-[150px] border border-input rounded-md bg-muted/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="ml-2 text-muted-foreground">Carregando editor...</p></div>,
});


type PatientFromFirebase = {
  id: string;
  name: string;
  status: string;
  slug: string;
  phone?: string;
  history?: any[];
};

type Appointment = {
  id: string; // Firestore document ID
  time: string;
  patientId: string;
  patientName: string;
  patientSlug: string;
  type: string;
  appointmentTypeId?: string;
  notes?: string;
  date: string; // 'yyyy-MM-dd'
  status: 'agendado' | 'cancelado' | 'realizado';
  naoLancarFinanceiro?: boolean;
  nomeEmpresa?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
};

type AppointmentsData = {
  [dateKey: string]: Appointment[];
};

const initialAppointmentFormValues = {
  patientId: '',
  type: '',
  date: '',
  time: '',
  notes: '',
  naoLancarFinanceiro: false,
  appointmentTypeId: '',
  responsibleUserId: '',
};

type AppointmentFormValues = typeof initialAppointmentFormValues & { responsibleUserId?: string };


type AppointmentTypeObject = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  valor?: number;
  lancarFinanceiroAutomatico?: boolean;
};

const fallbackAppointmentTypesData: AppointmentTypeObject[] = [];

type ClinicUser = {
  id: string;
  nomeCompleto: string;
};

const UNASSIGNED_RESPONSIBLE_VALUE = "__UNASSIGNED_PROFESSIONAL__";


const getAppointmentTypesPath = (userData: any) => {
  const isClinica = userData?.plano === 'Clínica';
  const identifier = isClinica ? userData.nomeEmpresa : userData.uid;
  if (!identifier) {
    console.error("Identificador do usuário ou empresa não encontrado para tipos de atendimento.", userData);
    return collection(db, 'appointmentTypes', 'default_fallback_types', 'tipos');
  }
  return collection(db, 'appointmentTypes', identifier, 'tipos');
};


export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [clientToday, setClientToday] = useState<Date | undefined>(undefined);
  const [clientNow, setClientNow] = useState<Date | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentsData>({});
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [firebasePatients, setFirebasePatients] = useState<PatientFromFirebase[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
  const [isLoadingClinicUsers, setIsLoadingClinicUsers] = useState(false);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeObject[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newCustomType, setNewCustomType] = useState<Partial<AppointmentTypeObject>>({
    name: '',
    valor: 0,
    lancarFinanceiroAutomatico: false,
    status: 'active',
  });
  const [isManageTypesDialogOpen, setIsManageTypesDialogOpen] = useState(false);
  const [editingTypeInfo, setEditingTypeInfo] = useState<{ type: AppointmentTypeObject, currentData: Partial<AppointmentTypeObject> } | null>(null);
  const [typeToToggleStatusConfirm, setTypeToToggleStatusConfirm] = useState<AppointmentTypeObject | null>(null);
  const [isDeleteTypeConfirmOpen, setIsDeleteTypeConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<AppointmentTypeObject | null>(null);

  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const [newAppointmentForm, setNewAppointmentForm] = useState<AppointmentFormValues>(initialAppointmentFormValues);

  const [isEditAppointmentDialogOpen, setIsEditAppointmentDialogOpen] = useState(false);
  const [editingAppointmentInfo, setEditingAppointmentInfo] = useState<{ appointment: Appointment; dateKey: string } | null>(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState<AppointmentFormValues>(initialAppointmentFormValues);

  const [isDeleteApptConfirmOpen, setIsDeleteApptConfirmOpen] = useState(false);
  const [appointmentToDeleteInfo, setAppointmentToDeleteInfo] = useState<{ appointmentId: string; dateKey: string, patientName: string, time: string } | null>(null);

  const [isConfirmWhatsAppDialogOpen, setIsConfirmWhatsAppDialogOpen] = useState(false);
  const [selectedApptForWhatsApp, setSelectedApptForWhatsApp] = useState<Appointment | null>(null);
  const [whatsAppMsgType, setWhatsAppMsgType] = useState<'predefined' | 'custom'>('predefined');
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [whatsAppPatientDetails, setWhatsAppPatientDetails] = useState<{ name: string; phone: string | null }>({ name: '', phone: null });
  const [isFetchingPatientPhone, setIsFetchingPatientPhone] = useState(false);

  const [isRecordAttendanceDialogOpen, setIsRecordAttendanceDialogOpen] = useState(false);
  const [appointmentToRecordAttendance, setAppointmentToRecordAttendance] = useState<Appointment | null>(null);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [attendanceType, setAttendanceType] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  const [showNaoLancarFinanceiroSwitch, setShowNaoLancarFinanceiroSwitch] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchCurrentUserData = useCallback(async (user: FirebaseUser) => {
    if (!user) return null;
    const userDocRef = doc(db, 'usuarios', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { ...userDocSnap.data(), uid: user.uid };
    }
    console.warn("User data not found in Firestore for UID:", user.uid);
    return null;
  }, []);

  const fetchClinicUsers = useCallback(async (uData: any) => {
    if (!uData || uData.plano !== 'Clínica' || !uData.nomeEmpresa) {
      setClinicUsers([]);
      return;
    }
    setIsLoadingClinicUsers(true);
    try {
      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where('nomeEmpresa', '==', uData.nomeEmpresa), orderBy('nomeCompleto'));
      const querySnapshot = await getDocs(q);
      const usersList: ClinicUser[] = [];
      querySnapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, nomeCompleto: docSnap.data().nomeCompleto as string });
      });
      setClinicUsers(usersList);
    } catch (error) {
      console.error("Erro ao buscar usuários da clínica:", error);
      toast({ title: "Erro ao buscar usuários", description: "Não foi possível carregar os profissionais.", variant: "warning" });
    } finally {
      setIsLoadingClinicUsers(false);
    }
  }, [toast]);


  const fetchAppointmentTypes = useCallback(async () => {
    if (!currentUserData) {
      const fallbackWithTempIds = fallbackAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-${ft.name.toLowerCase().replace(/\s+/g, '-')}` }));
      setAppointmentTypes(fallbackWithTempIds.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoadingTypes(false);
      return;
    }
    setIsLoadingTypes(true);
    try {
      const tiposRef = getAppointmentTypesPath(currentUserData);
      const snapshot = await getDocs(query(tiposRef, orderBy("name")));
      const tipos: AppointmentTypeObject[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
        valor: docSnap.data().valor as number | undefined,
        lancarFinanceiroAutomatico: docSnap.data().lancarFinanceiroAutomatico as boolean | undefined,
      }));

      const fallbackWithTempIds = fallbackAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-${ft.name.toLowerCase().replace(/\s+/g, '-')}` }));
      const finalTypes = tipos.length > 0 ? tipos : fallbackWithTempIds;
      setAppointmentTypes(finalTypes.sort((a, b) => a.name.localeCompare(b.name)));

    } catch (error: any) {
      console.error("Erro ao buscar tipos de atendimento:", error);
      toast({ title: "Erro ao buscar tipos", description: "Não foi possível carregar os tipos.", variant: "warning" });
      const fallbackWithTempIds = fallbackAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-${ft.name.toLowerCase().replace(/\s+/g, '-')}` }));
      setAppointmentTypes(fallbackWithTempIds.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setIsLoadingTypes(false);
    }
  }, [currentUserData, toast]);

  const fetchAppointments = useCallback(async (user: FirebaseUser, uData: any) => {
    if (!user || !uData) return;
    setIsLoadingAppointments(true);
    try {
      const apptsRef = collection(db, 'agendamentos');
      let q;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(apptsRef, where('nomeEmpresa', '==', uData.nomeEmpresa));
      } else {
        q = query(apptsRef, where('uid', '==', user.uid));
      }

      const querySnapshot = await getDocs(q);
      const fetchedAppointmentsData: AppointmentsData = {};

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const apptStatus = (data.status as Appointment['status']) || 'agendado';
        const apptDateKey = data.date;

        const appointmentItem: Appointment = {
          id: docSnap.id,
          time: data.time,
          patientId: data.patientId,
          patientName: data.patientName,
          patientSlug: data.patientSlug,
          type: data.type,
          appointmentTypeId: data.appointmentTypeId,
          notes: data.notes,
          date: apptDateKey,
          status: apptStatus,
          naoLancarFinanceiro: data.naoLancarFinanceiro,
          nomeEmpresa: data.nomeEmpresa,
          responsibleUserId: data.responsibleUserId,
          responsibleUserName: data.responsibleUserName,
        };

        if (!fetchedAppointmentsData[apptDateKey]) {
          fetchedAppointmentsData[apptDateKey] = [];
        }
        fetchedAppointmentsData[apptDateKey].push(appointmentItem);
      });

      for (const dateKey in fetchedAppointmentsData) {
        fetchedAppointmentsData[dateKey].sort((a, b) => a.time.localeCompare(b.time));
      }
      setAppointments(fetchedAppointmentsData);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast({ title: "Erro ao buscar agendamentos", description: "Não foi possível carregar os agendamentos.", variant: "destructive" });
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const uData = await fetchCurrentUserData(user);
        setCurrentUserData(uData);
        if (uData) {
          fetchAppointments(user, uData);
          fetchPatientsForUser(user, uData);
          if (uData.plano === 'Clínica') {
            fetchClinicUsers(uData);
          }
        }
      } else {
        setFirebasePatients([]);
        setIsLoadingPatients(false);
        setAppointments({});
        setIsLoadingAppointments(false);
        setCurrentUserData(null);
        setAppointmentTypes(fallbackAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })));
        setIsLoadingTypes(false);
        setClinicUsers([]);
      }
    });
    return () => unsubscribe();
  }, [fetchCurrentUserData, fetchAppointments, fetchClinicUsers]);

  const fetchPatientsForUser = useCallback(async (user: FirebaseUser, uData: any) => {
    if (!user || !uData) {
        setFirebasePatients([]);
        setIsLoadingPatients(false);
        return;
    }
    setIsLoadingPatients(true);
    try {
      const patientsRef = collection(db, 'pacientes');
      let q;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(patientsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), where('status', '==', 'Ativo'));
      } else {
        q = query(patientsRef, where('uid', '==', user.uid), where('status', '==', 'Ativo'));
      }

      const querySnapshot = await getDocs(q);
      const fetchedPatientsData: PatientFromFirebase[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedPatientsData.push({
          id: docSnap.id,
          name: data.name as string,
          status: data.status as string,
          slug: data.slug as string,
          phone: data.phone as string | undefined,
          history: data.history || [],
        });
      });
      setFirebasePatients(fetchedPatientsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      toast({ title: "Erro ao buscar pacientes", description: "Não foi possível carregar a lista de pacientes.", variant: "destructive" });
      setFirebasePatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [toast]);


  useEffect(() => {
    if (currentUserData) {
      fetchAppointmentTypes();
       if (currentUser) {
         fetchPatientsForUser(currentUser, currentUserData);
         if (currentUserData.plano === 'Clínica') {
           fetchClinicUsers(currentUserData);
         }
       }
    }
  }, [currentUser, currentUserData, fetchAppointmentTypes, fetchPatientsForUser, fetchClinicUsers]);


  const getFirstActiveTypeNameAndId = useCallback(() => {
    const firstActive = appointmentTypes.find(t => t.status === 'active');
    return { name: firstActive?.name || '', id: firstActive?.id || '' };
  }, [appointmentTypes]);

  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setClientToday(startOfDay(now));
    setClientNow(now);

    const { name: firstActiveTypeName, id: firstActiveTypeId } = getFirstActiveTypeNameAndId();
    const initialDateStr = format(now, 'yyyy-MM-dd');

    setNewAppointmentForm(prev => ({
      ...initialAppointmentFormValues,
      date: initialDateStr,
      type: prev.type || firstActiveTypeName || '',
      appointmentTypeId: prev.appointmentTypeId || firstActiveTypeId || '',
      responsibleUserId: '',
    }));
    setEditAppointmentForm(prev => ({
      ...initialAppointmentFormValues,
      type: prev.type || firstActiveTypeName || '',
      appointmentTypeId: prev.appointmentTypeId || firstActiveTypeId || '',
      responsibleUserId: '',
    }));
    setAttendanceType(firstActiveTypeName || '');
  }, [getFirstActiveTypeNameAndId]);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setNewAppointmentForm(prev => ({ ...prev, date: formattedDate }));
    }
  }, [selectedDate]);

  useEffect(() => {
    const { name: firstActiveName, id: firstActiveId } = getFirstActiveTypeNameAndId();
    if (firstActiveName) {
      setNewAppointmentForm(prev => ({ ...prev, type: prev.type || firstActiveName, appointmentTypeId: prev.appointmentTypeId || firstActiveId }));
      setEditAppointmentForm(prev => ({ ...prev, type: prev.type || firstActiveName, appointmentTypeId: prev.appointmentTypeId || firstActiveId }));
      setAttendanceType(prev => prev || firstActiveName);
    }
  }, [appointmentTypes, getFirstActiveTypeNameAndId]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleFormInputChange = (formSetter: React.Dispatch<React.SetStateAction<AppointmentFormValues>>, field: keyof AppointmentFormValues, value: string | boolean) => {
    formSetter(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSelectChange = (formSetter: React.Dispatch<React.SetStateAction<AppointmentFormValues>>, field: keyof AppointmentFormValues, value: string) => {
    formSetter(prev => ({ ...prev, [field]: value }));

    if (field === 'type' && currentUserData?.plano !== 'Gratuito') {
      const selectedType = appointmentTypes.find(t => t.name === value);
      if (selectedType) {
        formSetter(prev => ({ ...prev, appointmentTypeId: selectedType.id || '' }));
        if (selectedType.lancarFinanceiroAutomatico && (selectedType.valor || 0) > 0) {
          setShowNaoLancarFinanceiroSwitch(true);
          formSetter(prev => ({ ...prev, naoLancarFinanceiro: false }));
        } else {
          setShowNaoLancarFinanceiroSwitch(false);
          formSetter(prev => ({ ...prev, naoLancarFinanceiro: true }));
        }
      } else {
        setShowNaoLancarFinanceiroSwitch(false);
         formSetter(prev => ({ ...prev, naoLancarFinanceiro: true }));
      }
    } else if (currentUserData?.plano === 'Gratuito') {
      setShowNaoLancarFinanceiroSwitch(false);
      formSetter(prev => ({ ...prev, naoLancarFinanceiro: true }));
    }
  };


  const validateAppointmentDateTime = (dateStr: string, timeStr: string): Date | null => {
    const appointmentDateTimeString = `${dateStr} ${timeStr}`;
    try {
      const parsedDateTime = parse(appointmentDateTimeString, 'yyyy-MM-dd HH:mm', new Date());
      return isNaN(parsedDateTime.getTime()) ? null : parsedDateTime;
    } catch (error) {
      console.error("Error parsing date/time:", error);
      return null;
    }
  };

  const isDateTimeInPast = (dateTime: Date): boolean => {
    return clientNow ? isBefore(dateTime, clientNow) : true;
  };

  const isAppointmentDateInFuture = (appointmentDate: string): boolean => {
    if (!clientToday) return true;
    try {
        const apptDateObj = parse(appointmentDate, 'yyyy-MM-dd', new Date());
        return isFuture(startOfDay(apptDateObj));
    } catch {
        return true;
    }
  };


  const isTimeSlotOccupied = (dateKey: string, time: string, excludingAppointmentId?: string): boolean => {
    const appointmentsOnDay = appointments[dateKey] || [];
    return appointmentsOnDay.some(appt => appt.time === time && (!excludingAppointmentId || appt.id !== excludingAppointmentId) && appt.status !== 'cancelado');
  };

  const handleAddAppointment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !currentUserData) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    let { patientId, type, date, time, notes, naoLancarFinanceiro, appointmentTypeId, responsibleUserId } = newAppointmentForm;

    if (currentUserData.plano === 'Gratuito') {
        naoLancarFinanceiro = true; // Force no financial launch for free plan
    }

    if (!patientId || !date || !time || !type || !appointmentTypeId) {
      toast({ title: "Erro de Validação", description: "Paciente, Data, Hora e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }
    const selectedAppointmentType = appointmentTypes.find(t => t.id === appointmentTypeId && t.status === 'active');
    if (!selectedAppointmentType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo ou não foi encontrado.", variant: "destructive" });
      return;
    }

    const appointmentDateTime = validateAppointmentDateTime(date, time);
    if (!appointmentDateTime) {
      toast({ title: "Data/Hora Inválida", description: "Formato de data ou hora inválido.", variant: "destructive" });
      return;
    }

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

    const responsibleUser = clinicUsers.find(u => u.id === responsibleUserId);

    try {
      const newApptData: any = {
        uid: currentUser.uid,
        nomeEmpresa: currentUserData.plano === 'Clínica' ? (currentUserData.nomeEmpresa || '') : '',
        date: date,
        time,
        patientId,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        type,
        appointmentTypeId,
        notes,
        status: 'agendado',
        naoLancarFinanceiro,
        createdAt: serverTimestamp(),
      };

      if (currentUserData.plano === 'Clínica') {
        newApptData.responsibleUserId = responsibleUserId || null; // Store null if empty or unassigned
        newApptData.responsibleUserName = responsibleUserId && responsibleUser ? responsibleUser.nomeCompleto : null;
      }


      const newApptRef = await addDoc(collection(db, 'agendamentos'), newApptData);

      if (currentUserData.plano !== 'Gratuito' && selectedAppointmentType.lancarFinanceiroAutomatico && (selectedAppointmentType.valor || 0) > 0 && !naoLancarFinanceiro) {
        await addDoc(collection(db, 'financialTransactions'), {
          ownerId: currentUser.uid,
          appointmentId: newApptRef.id,
          date: Timestamp.fromDate(parseISO(date)),
          description: `Consulta - ${type} - ${selectedPatient.name}`,
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          amount: selectedAppointmentType.valor,
          paymentMethod: 'Pix',
          status: 'Pendente',
          type: 'atendimento',
          createdAt: serverTimestamp(),
          nomeEmpresa: currentUserData.plano === 'Clínica' ? (currentUserData.nomeEmpresa || '') : '',
        });
      }
      const { name: firstActiveTypeName, id: firstActiveTypeId } = getFirstActiveTypeNameAndId();
      setNewAppointmentForm({
        ...initialAppointmentFormValues,
        date: newAppointmentForm.date,
        type: firstActiveTypeName,
        appointmentTypeId: firstActiveTypeId,
        responsibleUserId: '',
      });
      setIsNewAppointmentDialogOpen(false);
      setShowNaoLancarFinanceiroSwitch(false);
      toast({ title: "Sucesso!", description: "Agendamento adicionado.", variant: "success" });
      if (currentUser && currentUserData) fetchAppointments(currentUser, currentUserData);
    } catch (error) {
      console.error("Erro ao adicionar agendamento:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o agendamento.", variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (appointment: Appointment, dateKey: string) => {
    setEditingAppointmentInfo({ appointment, dateKey });
    const selectedType = appointmentTypes.find(t => t.id === appointment.appointmentTypeId);
    setEditAppointmentForm({
      patientId: appointment.patientId,
      type: appointment.type,
      appointmentTypeId: appointment.appointmentTypeId || '',
      date: dateKey,
      time: appointment.time,
      notes: appointment.notes || '',
      naoLancarFinanceiro: appointment.naoLancarFinanceiro || false,
      responsibleUserId: appointment.responsibleUserId || '',
    });
    if (currentUserData?.plano !== 'Gratuito') {
      setShowNaoLancarFinanceiroSwitch(!!(selectedType?.lancarFinanceiroAutomatico && (selectedType?.valor || 0) > 0));
    } else {
      setShowNaoLancarFinanceiroSwitch(false);
    }
    setIsEditAppointmentDialogOpen(true);
  };

  const handleSaveEditedAppointment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAppointmentInfo || !currentUser || !currentUserData) return;

    const { appointment: originalAppointment } = editingAppointmentInfo;
    let { patientId, type, date: newDateKey, time, notes, naoLancarFinanceiro, appointmentTypeId, responsibleUserId } = editAppointmentForm;

    if (currentUserData.plano === 'Gratuito') {
      naoLancarFinanceiro = true;
    }

    if (!patientId || !newDateKey || !time || !type || !appointmentTypeId) {
      toast({ title: "Erro de Validação", description: "Paciente, Data, Hora e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }

    const selectedAppointmentType = appointmentTypes.find(t => t.id === appointmentTypeId && t.status === 'active');
    if (!selectedAppointmentType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo ou não foi encontrado.", variant: "destructive" });
      return;
    }

    const appointmentDateTime = validateAppointmentDateTime(newDateKey, time);
    if (!appointmentDateTime) {
      toast({ title: "Data/Hora Inválida", description: "Formato de data ou hora inválido.", variant: "destructive" });
      return;
    }

    const isOriginalDateTime = originalAppointment.date === newDateKey && originalAppointment.time === time;
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

    const responsibleUser = clinicUsers.find(u => u.id === responsibleUserId);

    try {
      const apptUpdateData: any = {
        date: newDateKey,
        time,
        patientId,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        type,
        appointmentTypeId,
        notes,
        naoLancarFinanceiro,
      };

      if (currentUserData.plano === 'Clínica') {
        apptUpdateData.responsibleUserId = responsibleUserId || null;
        apptUpdateData.responsibleUserName = responsibleUserId && responsibleUser ? responsibleUser.nomeCompleto : null;
      }


      const apptRef = doc(db, 'agendamentos', originalAppointment.id);
      await updateDoc(apptRef, apptUpdateData);

      const financialTransactionsRef = collection(db, 'financialTransactions');
      const qFinance = query(financialTransactionsRef, where('appointmentId', '==', originalAppointment.id));
      const financeSnapshot = await getDocs(qFinance);
      const existingTransaction = financeSnapshot.docs.length > 0 ? { id: financeSnapshot.docs[0].id, ...financeSnapshot.docs[0].data() } : null;

      const shouldGenerateFinance = currentUserData.plano !== 'Gratuito' && selectedAppointmentType.lancarFinanceiroAutomatico && (selectedAppointmentType.valor || 0) > 0 && !naoLancarFinanceiro;

      if (shouldGenerateFinance) {
        if (existingTransaction) {
          await updateDoc(doc(db, 'financialTransactions', existingTransaction.id), {
            amount: selectedAppointmentType.valor,
            date: Timestamp.fromDate(parseISO(newDateKey)),
            description: `Consulta - ${type} - ${selectedPatient.name}`,
            status: 'Pendente',
          });
        } else {
          await addDoc(financialTransactionsRef, {
            ownerId: currentUser.uid,
            appointmentId: originalAppointment.id,
            nomeEmpresa: currentUserData.plano === 'Clínica' ? (currentUserData.nomeEmpresa || '') : '',
            date: Timestamp.fromDate(parseISO(newDateKey)),
            description: `Consulta - ${type} - ${selectedPatient.name}`,
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            amount: selectedAppointmentType.valor,
            paymentMethod: 'Pix',
            status: 'Pendente',
            type: 'atendimento',
            createdAt: serverTimestamp(),
          });
        }
      } else if (existingTransaction) {
        await updateDoc(doc(db, 'financialTransactions', existingTransaction.id), {
          status: 'Cancelado',
        });
      }


      setIsEditAppointmentDialogOpen(false);
      setEditingAppointmentInfo(null);
      setShowNaoLancarFinanceiroSwitch(false);
      toast({ title: "Sucesso!", description: "Agendamento atualizado.", variant: "success" });
      if (currentUser && currentUserData) fetchAppointments(currentUser, currentUserData);
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o agendamento.", variant: "destructive" });
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    if (!currentUser || !currentUserData) return;
    try {
      const apptRef = doc(db, 'agendamentos', appointmentId);
      await updateDoc(apptRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      if (currentUserData.plano !== 'Gratuito') {
        const financialTransactionsRef = collection(db, 'financialTransactions');
        const qFinance = query(financialTransactionsRef, where('appointmentId', '==', appointmentId));
        const financeSnapshot = await getDocs(qFinance);

        if (!financeSnapshot.empty) {
          const financeDocId = financeSnapshot.docs[0].id;
          const financeDocRef = doc(db, 'financialTransactions', financeDocId);
          const financeDocData = financeSnapshot.docs[0].data();

          if (newStatus === 'realizado' && financeDocData.status === 'Pendente') {
            await updateDoc(financeDocRef, {
              status: 'Recebido',
              updatedAt: serverTimestamp(),
            });
          } else if (newStatus === 'agendado' && (financeDocData.status === 'Recebido' || financeDocData.status === 'Cancelado')) {
             if (financeDocData.status === 'Recebido' || financeDocData.status === 'Cancelado') {
              await updateDoc(financeDocRef, {
                  status: 'Pendente',
                  updatedAt: serverTimestamp(),
              });
             }
          } else if (newStatus === 'cancelado') {
            await updateDoc(financeDocRef, {
              status: 'Cancelado',
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      toast({ title: "Status Atualizado", description: `Agendamento marcado como ${newStatus}.`, variant: "success" });
      if (currentUser && currentUserData) fetchAppointments(currentUser, currentUserData);
    } catch (error) {
      console.error(`Erro ao marcar agendamento como ${newStatus}:`, error);
      toast({ title: "Erro", description: `Não foi possível marcar como ${newStatus}.`, variant: "destructive" });
    }
  };


  const handleOpenDeleteApptDialog = (appointmentId: string, dateKey: string, patientName: string, time: string) => {
    setAppointmentToDeleteInfo({ appointmentId, dateKey, patientName, time });
    setIsDeleteApptConfirmOpen(true);
  };

  const handleConfirmDeleteAppt = async () => {
    if (!appointmentToDeleteInfo || !currentUser || !currentUserData) return;
    try {
      const apptRef = doc(db, 'agendamentos', appointmentToDeleteInfo.appointmentId);
      await updateDoc(apptRef, {
        status: 'cancelado',
        updatedAt: serverTimestamp()
      });

      if (currentUserData.plano !== 'Gratuito') {
        const financialTransactionsRef = collection(db, 'financialTransactions');
        const qFinance = query(financialTransactionsRef, where('appointmentId', '==', appointmentToDeleteInfo.appointmentId));
        const financeSnapshot = await getDocs(qFinance);

        if (!financeSnapshot.empty) {
          const financeDocId = financeSnapshot.docs[0].id;
          const financeDocRef = doc(db, 'financialTransactions', financeDocId);
          await updateDoc(financeDocRef, {
            status: 'Cancelado',
            updatedAt: serverTimestamp(),
          });
        }
      }

      toast({ title: "Agendamento Cancelado", description: `Agendamento para ${appointmentToDeleteInfo.patientName} foi cancelado.`, variant: "success" });
      if (currentUser && currentUserData) fetchAppointments(currentUser, currentUserData);
    } catch (error) {
      console.error(`Erro ao cancelar agendamento:`, error);
      toast({ title: "Erro", description: `Não foi possível cancelar o agendamento.`, variant: "destructive" });
    } finally {
      setIsDeleteApptConfirmOpen(false);
      setAppointmentToDeleteInfo(null);
    }
  };

  const goToPreviousDay = () => setSelectedDate(prev => prev ? subDays(prev, 1) : (clientToday ? subDays(clientToday, 1) : undefined));
  const goToNextDay = () => setSelectedDate(prev => prev ? addDays(prev, 1) : (clientToday ? addDays(clientToday, 1) : undefined));

  const handleAddCustomType = async () => {
    if (!currentUserData) {
      toast({ title: 'Erro', description: 'Dados do usuário não carregados.', variant: 'destructive' });
      return;
    }
    const trimmedName = newCustomType.name?.trim();
    if (!trimmedName) {
      toast({ title: 'Erro', description: 'Nome do tipo não pode ser vazio.', variant: 'destructive' });
      return;
    }
    if (appointmentTypes.some(type => type.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }

    const typeDataToSave: Partial<AppointmentTypeObject> = {
        name: trimmedName,
        status: 'active',
    };

    if (currentUserData.plano !== 'Gratuito') {
        typeDataToSave.valor = newCustomType.valor || 0;
        typeDataToSave.lancarFinanceiroAutomatico = newCustomType.lancarFinanceiroAutomatico || false;
    } else {
        typeDataToSave.valor = 0;
        typeDataToSave.lancarFinanceiroAutomatico = false;
    }


    try {
      const tiposRef = getAppointmentTypesPath(currentUserData);
      await addDoc(tiposRef, typeDataToSave);
      toast({ title: 'Sucesso', description: 'Tipo de atendimento adicionado.' });
      setNewCustomType({ name: '', valor: 0, lancarFinanceiroAutomatico: false, status: 'active' });
      setIsAddTypeDialogOpen(false);
      fetchAppointmentTypes();
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar o tipo.', variant: 'destructive' });
    }
  };

  const handleSaveEditedTypeName = async () => {
    if (!editingTypeInfo || !editingTypeInfo.type.id || !currentUserData || !editingTypeInfo.currentData) {
      toast({ title: 'Erro', description: 'Informações para edição incompletas.', variant: 'destructive' });
      return;
    }
    const { type: originalType, currentData } = editingTypeInfo;
    const newNameTrimmed = currentData.name?.trim();

    if (!newNameTrimmed) {
      toast({ title: "Erro", description: "O nome do tipo não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalType.name.toLowerCase() &&
      appointmentTypes.some(type => type.id !== originalType.id && type.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }

    const typeDataToUpdate: Partial<AppointmentTypeObject> = { name: newNameTrimmed };
    if (currentUserData.plano !== 'Gratuito') {
        typeDataToUpdate.valor = currentData.valor || 0;
        typeDataToUpdate.lancarFinanceiroAutomatico = currentData.lancarFinanceiroAutomatico || false;
    } else {
        typeDataToUpdate.valor = 0;
        typeDataToUpdate.lancarFinanceiroAutomatico = false;
    }


    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToUpdateRef = doc(tiposCollectionRef, originalType.id);
      await updateDoc(docToUpdateRef, typeDataToUpdate);

      setEditingTypeInfo(null);
      toast({ title: "Sucesso", description: `Tipo "${originalType.name}" atualizado.`, variant: "success" });
      await fetchAppointmentTypes();

      const {name: firstActiveTypeName, id: firstActiveTypeId} = getFirstActiveTypeNameAndId();
      if (newAppointmentForm.type === originalType.name) {
        setNewAppointmentForm(prev => ({ ...prev, type: newNameTrimmed, appointmentTypeId: firstActiveTypeId }));
      }
      if (editAppointmentForm.type === originalType.name) {
        setEditAppointmentForm(prev => ({ ...prev, type: newNameTrimmed, appointmentTypeId: firstActiveTypeId }));
      }
      if (attendanceType === originalType.name) {
        setAttendanceType(newNameTrimmed);
      }

    } catch (error) {
      console.error("Erro ao editar tipo:", error);
      toast({ title: "Erro", description: "Falha ao atualizar o tipo.", variant: "destructive" });
    }
  };

  const handleToggleTypeStatus = async (typeToToggle: AppointmentTypeObject) => {
    if (!typeToToggle || !typeToToggle.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações do tipo ou usuário incompletas.', variant: 'destructive' });
      setTypeToToggleStatusConfirm(null);
      return;
    }
    const newStatus = typeToToggle.status === 'active' ? 'inactive' : 'active';
    const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;
    if (newStatus === 'inactive' && activeTypesCount <= 1 && appointmentTypes.some(t => t.status === 'inactive' && t.id !== typeToToggle.id)) {
      toast({ title: "Atenção", description: "Não é possível desativar o último tipo ativo se existirem outros inativos.", variant: "warning" });
      setTypeToToggleStatusConfirm(null);
      return;
    }
    if (newStatus === 'inactive' && activeTypesCount === 1 && appointmentTypes.length === 1) {
      toast({ title: "Atenção", description: "Não é possível desativar o único tipo existente.", variant: "warning" });
      setTypeToToggleStatusConfirm(null);
      return;
    }

    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToUpdateRef = doc(tiposCollectionRef, typeToToggle.id);
      await updateDoc(docToUpdateRef, { status: newStatus });
      toast({ title: "Status Alterado", description: `O tipo "${typeToToggle.name}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.`, variant: "success" });
      setTypeToToggleStatusConfirm(null);
      await fetchAppointmentTypes();

      const {name: firstActiveName, id: firstActiveId} = getFirstActiveTypeNameAndId();
      if (newStatus === 'inactive') {
        if (newAppointmentForm.type === typeToToggle.name) {
          setNewAppointmentForm(prev => ({ ...prev, type: firstActiveName || '', appointmentTypeId: firstActiveId || ''}));
        }
        if (editAppointmentForm.type === typeToToggle.name) {
          setEditAppointmentForm(prev => ({ ...prev, type: firstActiveName || '', appointmentTypeId: firstActiveId || ''}));
        }
        if (attendanceType === typeToToggle.name) {
          setAttendanceType(firstActiveName || '');
        }
      }
    } catch (error) {
      console.error("Erro ao alterar status do tipo:", error);
      toast({ title: "Erro", description: "Falha ao alterar o status do tipo.", variant: "destructive" });
    }
  };

  const handleOpenDeleteTypeDialog = (type: AppointmentTypeObject) => {
    setTypeToDelete(type);
    setIsDeleteTypeConfirmOpen(true);
  };

  const handleConfirmDeleteType = async () => {
    if (!typeToDelete || !typeToDelete.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações para exclusão incompletas.', variant: 'destructive' });
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
      return;
    }
    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToDeleteRef = doc(tiposCollectionRef, typeToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Tipo Excluído", description: `O tipo "${typeToDelete.name}" foi removido.`, variant: "success" });
      await fetchAppointmentTypes();

      const {name: firstActiveName, id: firstActiveId} = getFirstActiveTypeNameAndId();
      if (newAppointmentForm.type === typeToDelete.name) {
        setNewAppointmentForm(prev => ({ ...prev, type: firstActiveName || '', appointmentTypeId: firstActiveId || ''}));
      }
      if (editAppointmentForm.type === typeToDelete.name) {
        setEditAppointmentForm(prev => ({ ...prev, type: firstActiveName || '', appointmentTypeId: firstActiveId || '' }));
      }
      if (attendanceType === typeToDelete.name) {
        setAttendanceType(firstActiveName || '');
      }
    } catch (error) {
      console.error("Erro ao excluir tipo:", error);
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o tipo. Verifique se ele está em uso.`, variant: "destructive" });
    } finally {
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
    }
  };

  const openConfirmWhatsAppDialog = async (appointment: Appointment) => {
    if (!currentUser) return;
    setIsFetchingPatientPhone(true);
    setSelectedApptForWhatsApp(appointment);
    setWhatsAppMsgType('predefined');
    setCustomWhatsAppMsg('');
    try {
      const patientDocRef = doc(db, 'pacientes', appointment.patientId);
      const patientDocSnap = await getDoc(patientDocRef);
      if (patientDocSnap.exists()) {
        const patientData = patientDocSnap.data() as PatientFromFirebase;
        setWhatsAppPatientDetails({ name: patientData.name, phone: patientData.phone || null });
      } else {
        setWhatsAppPatientDetails({ name: appointment.patientName, phone: null });
      }
    } catch (error) {
      console.error("Erro ao buscar dados do paciente para WhatsApp:", error);
      setWhatsAppPatientDetails({ name: appointment.patientName, phone: null });
    } finally {
      setIsFetchingPatientPhone(false);
      setIsConfirmWhatsAppDialogOpen(true);
    }
  };

  const handleSendWhatsAppConfirmation = () => {
    if (!selectedApptForWhatsApp || !whatsAppPatientDetails.phone) return;
    let message = '';
    const apptDateFormatted = format(parse(selectedApptForWhatsApp.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
    if (whatsAppMsgType === 'predefined') {
      message = `Olá ${selectedApptForWhatsApp.patientName}, tudo bem? Confirmando seu agendamento para ${selectedApptForWhatsApp.type} no dia ${apptDateFormatted} às ${selectedApptForWhatsApp.time}. Em caso de imprevisto, por favor, nos avise com antecedência. Até breve!`;
    } else {
      if (!customWhatsAppMsg.trim()) {
        toast({ title: "Mensagem Vazia", description: "Por favor, escreva uma mensagem personalizada.", variant: "warning" });
        return;
      }
      message = customWhatsAppMsg;
    }
    const cleanPhone = whatsAppPatientDetails.phone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
    setIsConfirmWhatsAppDialogOpen(false);
  };

  const handleOpenRecordAttendanceDialog = (appointment: Appointment) => {
    setAppointmentToRecordAttendance(appointment);
    const { name: firstActiveTypeName } = getFirstActiveTypeNameAndId();
    setAttendanceType(appointment.type || firstActiveTypeName || '');
    setAttendanceNote('');
    setIsRecordAttendanceDialogOpen(true);
  };

  const handleSaveAttendanceAndMarkRealizado = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !appointmentToRecordAttendance || !currentUserData) return;
    const isNoteEmpty = !attendanceNote || attendanceNote.trim() === '<p></p>' || attendanceNote.trim() === '';
    if (!attendanceType || isNoteEmpty) {
      toast({ title: "Campos Obrigatórios", description: "Tipo e observações são necessários.", variant: "destructive" });
      return;
    }
    setIsSavingAttendance(true);
    try {
      const patientDocRef = doc(db, 'pacientes', appointmentToRecordAttendance.patientId);
      const patientDocSnap = await getDoc(patientDocRef);
      if (patientDocSnap.exists()) {
        const patientData = patientDocSnap.data() as PatientFromFirebase;
        const currentHistory = patientData.history || [];
        const newHistoryEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: attendanceType,
          notes: attendanceNote,
          createdById: currentUser.uid, // Add creator ID
          createdByName: currentUserData.nomeCompleto || currentUser.displayName || 'Usuário', // Add creator name
        };
        const updatedHistory = [newHistoryEntry, ...currentHistory];
        await updateDoc(patientDocRef, { history: updatedHistory });
      } else {
        throw new Error("Documento do paciente não encontrado.");
      }
      await updateAppointmentStatus(appointmentToRecordAttendance.id, 'realizado');
      toast({ title: "Sucesso!", description: "Atendimento registrado e agendamento marcado como realizado.", variant: "success" });
      setIsRecordAttendanceDialogOpen(false);
      const { name: firstActiveTypeName } = getFirstActiveTypeNameAndId();
      setAttendanceType(firstActiveTypeName || '');
      setAttendanceNote('');
    } catch (error) {
      console.error("Erro ao registrar atendimento:", error);
      toast({ title: "Erro ao Registrar", description: "Não foi possível salvar o registro.", variant: "destructive" });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const activeAppointmentTypes = appointmentTypes.filter(t => t.status === 'active');

  if (!clientToday || !selectedDate || !clientNow || isLoadingAppointments || isLoadingTypes || isLoadingClinicUsers) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Carregando agenda...</p>
      </div>
    );
  }

  const formattedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const todaysAppointments: Appointment[] = (appointments[formattedDateKey] || []).filter(a => a.status !== 'cancelado');
  const isSelectedDatePast = selectedDate && clientToday ? isBefore(startOfDay(selectedDate), clientToday) : false;

  const apptDateTimeForActionButtons = (apptDate: string, apptTime: string) => parse(`${apptDate} ${apptTime}`, 'yyyy-MM-dd HH:mm', new Date());

  const getStatusBadgeVariant = (status: Appointment['status'] | 'Atrasado') => {
    switch (status) {
      case 'agendado': return 'default';
      case 'realizado': return 'success';
      case 'cancelado': return 'destructive';
      case 'Atrasado': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <Dialog open={isNewAppointmentDialogOpen} onOpenChange={(isOpen) => {
          setIsNewAppointmentDialogOpen(isOpen);
          if (isOpen) {
            const {name: firstActiveName, id: firstActiveId} = getFirstActiveTypeNameAndId();
            const currentFormDate = newAppointmentForm.date || format(selectedDate || new Date(), 'yyyy-MM-dd');
            setNewAppointmentForm({
              ...initialAppointmentFormValues,
              date: currentFormDate,
              type: firstActiveName,
              appointmentTypeId: firstActiveId,
              responsibleUserId: '',
            });
            if (currentUserData?.plano !== 'Gratuito') {
                const selectedType = appointmentTypes.find(t => t.id === firstActiveId);
                setShowNaoLancarFinanceiroSwitch(!!(selectedType?.lancarFinanceiroAutomatico && (selectedType?.valor || 0) > 0));
            } else {
                setShowNaoLancarFinanceiroSwitch(false);
            }
          } else {
            setShowNaoLancarFinanceiroSwitch(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={isSelectedDatePast} title={isSelectedDatePast ? "Não é possível agendar em datas passadas" : "Novo Agendamento"}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-md sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Preencha os detalhes.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAppointment} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                <Label htmlFor="newPatientId" className="block text-left sm:text-right sm:col-span-1">Paciente*</Label>
                <div className="col-span-full sm:col-span-3">
                  <Select value={newAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'patientId', value)} required>
                    <SelectTrigger id="newPatientId" className="w-full"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                    <SelectContent>
                      {isLoadingPatients ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : firebasePatients.length === 0 ? <SelectItem value="no-patients" disabled>Nenhum paciente</SelectItem> : firebasePatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {currentUserData?.plano === 'Clínica' && (
                <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                  <Label htmlFor="responsibleUserId" className="block text-left sm:text-right sm:col-span-1">Profissional</Label>
                  <div className="col-span-full sm:col-span-3">
                    <Select 
                      value={newAppointmentForm.responsibleUserId === '' ? UNASSIGNED_RESPONSIBLE_VALUE : newAppointmentForm.responsibleUserId} 
                      onValueChange={(value) => {
                          const valToStore = value === UNASSIGNED_RESPONSIBLE_VALUE ? '' : value;
                          handleFormSelectChange(setNewAppointmentForm, 'responsibleUserId', valToStore);
                      }}
                    >
                      <SelectTrigger id="responsibleUserId" className="w-full">
                        <SelectValue placeholder="Clínica / Não especificado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>Clínica / Não especificado</SelectItem>
                        {isLoadingClinicUsers ? <SelectItem value="loading-users" disabled>Carregando...</SelectItem> : clinicUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.nomeCompleto}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                <Label htmlFor="newType" className="block text-left sm:text-right sm:col-span-1">Tipo*</Label>
                <div className="col-span-full sm:col-span-3">
                  <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-1">
                    <Select value={newAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setNewAppointmentForm, 'type', value)} required>
                      <SelectTrigger id="newType" className="w-full sm:flex-grow"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {activeAppointmentTypes.map((type) => <SelectItem key={type.id || type.name} value={type.name}>{type.name}</SelectItem>)}
                        {activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum tipo ativo</SelectItem>}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 w-full sm:w-auto justify-end sm:justify-start">
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar" className="flex-shrink-0"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>

              {showNaoLancarFinanceiroSwitch && currentUserData?.plano !== 'Gratuito' && (
                <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                  <Label htmlFor="naoLancarFinanceiroNew" className="block text-left sm:text-right sm:col-span-3">Gerar Lançamento Financeiro?</Label>
                  <div className="col-span-full sm:col-span-1 flex justify-start">
                    <Switch
                      id="naoLancarFinanceiroNew"
                      checked={!newAppointmentForm.naoLancarFinanceiro}
                      onCheckedChange={(checked) => handleFormInputChange(setNewAppointmentForm, 'naoLancarFinanceiro', !checked)}
                    />
                  </div>
                </div>
              )}
               <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                <Label htmlFor="newDate" className="block text-left sm:text-right sm:col-span-1">Data*</Label>
                <div className="col-span-full sm:col-span-3">
                  <Input id="newDate" type="date" value={newAppointmentForm.date} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'date', e.target.value)} className="w-full" min={clientToday ? format(clientToday, 'yyyy-MM-dd') : undefined} required />
                </div>
              </div>
              <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                <Label htmlFor="newTime" className="block text-left sm:text-right sm:col-span-1">Hora*</Label>
                <div className="col-span-full sm:col-span-3">
                  <Input id="newTime" type="time" value={newAppointmentForm.time} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'time', e.target.value)} className="w-full" required />
                </div>
              </div>
              <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-start sm:gap-x-4">
                <Label htmlFor="newNotes" className="block text-left sm:text-right sm:col-span-1 pt-0 sm:pt-2">Observações</Label>
                <div className="col-span-full sm:col-span-3">
                  <Textarea id="newNotes" value={newAppointmentForm.notes} onChange={(e) => handleFormInputChange(setNewAppointmentForm, 'notes', e.target.value as string)} className="w-full" rows={3} />
                </div>
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
                <CardTitle>Compromissos para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Data'}</CardTitle>
                <CardDescription>({todaysAppointments.length}).</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousDay}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={goToNextDay}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appt) => {
                const appointmentDateTime = apptDateTimeForActionButtons(appt.date, appt.time);
                let displayStatus: Appointment['status'] | 'Atrasado' = appt.status;
                if (appt.status === 'agendado' && clientNow && isBefore(appointmentDateTime, clientNow)) {
                  displayStatus = 'Atrasado';
                }

                return (
                <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center w-12"><Clock className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-sm text-primary">{appt.time}</span></div>
                    <div className="border-l pl-3">
                      <p className="font-medium flex items-center gap-1"><User className="h-4 w-4" /> {appt.patientName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><ClipboardList className="h-4 w-4" /> {appt.type}</p>
                      {appt.responsibleUserName && currentUserData?.plano === 'Clínica' && <p className="text-xs text-muted-foreground flex items-center gap-1"><UserCog className="h-3 w-3" /> Prof: {appt.responsibleUserName}</p>}
                      {appt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{appt.notes}"</p>}
                       <Badge variant={getStatusBadgeVariant(displayStatus)} className="mt-1.5 text-xs capitalize">{displayStatus}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-100" onClick={() => handleOpenEditDialog(appt, formattedDateKey)} title="Editar" disabled={appt.status === 'cancelado' || appt.status === 'realizado' || (clientNow && isBefore(appointmentDateTime, clientNow) && displayStatus !== 'Atrasado')}><Edit className="h-4 w-4" /></Button>
                    {currentUserData?.plano !== 'Gratuito' && (
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={() => openConfirmWhatsAppDialog(appt)} title="Mensagem" disabled={appt.status !== 'agendado' || (clientNow && isBefore(appointmentDateTime, clientNow) && displayStatus !== 'Atrasado')}><MessageSquare className="h-4 w-4" /></Button>
                    )}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(appt.status === 'agendado' || displayStatus === 'Atrasado') && !(clientNow && isBefore(appointmentDateTime, clientNow) && displayStatus !== 'Atrasado') && <DropdownMenuItem onClick={() => updateAppointmentStatus(appt.id, 'realizado')}><CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Realizado</DropdownMenuItem>}
                            {appt.status === 'realizado' && <DropdownMenuItem onClick={() => updateAppointmentStatus(appt.id, 'agendado')}><RotateCcw className="mr-2 h-4 w-4 text-blue-500"/> Reagendar para Agendado</DropdownMenuItem>}
                            {(appt.status === 'agendado' || appt.status === 'realizado' || displayStatus === 'Atrasado') &&
                              <DropdownMenuItem onClick={() => handleOpenDeleteApptDialog(appt.id, formattedDateKey, appt.patientName, appt.time)} className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Excluir Agendamento
                              </DropdownMenuItem>
                            }
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Button variant="outline" size="sm" className="h-8 px-2 text-xs sm:text-sm sm:px-3" title="Atendimento" disabled={appt.status === 'cancelado' || appt.status === 'realizado'} onClick={() => handleOpenRecordAttendanceDialog(appt)}><FileText className="mr-0 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Reg. Atend.</span><span className="sm:hidden">Atend.</span></Button>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs sm:text-sm sm:px-3"><Link href={`/pacientes/${appt.patientSlug}`}><Eye className="mr-0 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" /><span className="sm:hidden">Ver</span><span className="hidden sm:inline">Paciente</span></Link></Button>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-muted-foreground"><CalendarPlus className="mx-auto h-12 w-12" /><p>Nenhum agendamento para {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'esta data'}.</p><Button variant="link" onClick={() => setIsNewAppointmentDialogOpen(true)} disabled={isSelectedDatePast}>{isSelectedDatePast ? "Não é possível agendar" : "Adicionar"}</Button></div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRecordAttendanceDialogOpen} onOpenChange={(isOpen) => { setIsRecordAttendanceDialogOpen(isOpen); if (!isOpen) setAppointmentToRecordAttendance(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Atendimento</DialogTitle>
            <DialogDescription>Paciente: <strong>{appointmentToRecordAttendance?.patientName}</strong> <br/>Horário: {appointmentToRecordAttendance?.time}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAttendanceAndMarkRealizado} className="space-y-4 py-4">
             <div>
              <Label htmlFor="attendanceType">Tipo*</Label>
              <div className="flex items-center gap-1 mt-1">
                <Select value={attendanceType} onValueChange={setAttendanceType} required>
                  <SelectTrigger id="attendanceType" className="flex-grow"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{activeAppointmentTypes.map((type) => <SelectItem key={type.id || type.name} value={type.name}>{type.name}</SelectItem>)}{activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum</SelectItem>}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                 <Button type="button" variant="outline" size="icon" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar" className="flex-shrink-0"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label htmlFor="attendanceNote">Observações*</Label>
              <div className="mt-1">{isClient && TiptapEditor ? <TiptapEditor content={attendanceNote} onChange={setAttendanceNote} /> : <div className="w-full h-[150px] border rounded-md bg-muted/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="ml-2">Carregando...</p></div>}</div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingAttendance}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSavingAttendance}>{isSavingAttendance ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditAppointmentDialogOpen} onOpenChange={(isOpen) => {
        setIsEditAppointmentDialogOpen(isOpen);
        if (!isOpen) {
            setEditingAppointmentInfo(null);
            setShowNaoLancarFinanceiroSwitch(false);
        }
       }}>
        <DialogContent className="w-[90vw] max-w-md sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Modifique os detalhes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditedAppointment} className="grid gap-4 py-4">
             <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
              <Label htmlFor="editPatientId" className="block text-left sm:text-right sm:col-span-1">Paciente*</Label>
              <div className="col-span-full sm:col-span-3">
                <Select value={editAppointmentForm.patientId} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm, 'patientId', value)} required>
                  <SelectTrigger id="editPatientId" className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{isLoadingPatients ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : firebasePatients.length === 0 ? <SelectItem value="no-patients" disabled>Nenhum</SelectItem> : firebasePatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {currentUserData?.plano === 'Clínica' && (
                <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                  <Label htmlFor="editResponsibleUserId" className="block text-left sm:text-right sm:col-span-1">Profissional</Label>
                  <div className="col-span-full sm:col-span-3">
                    <Select 
                      value={editAppointmentForm.responsibleUserId === '' ? UNASSIGNED_RESPONSIBLE_VALUE : editAppointmentForm.responsibleUserId} 
                      onValueChange={(value) => {
                          const valToStore = value === UNASSIGNED_RESPONSIBLE_VALUE ? '' : value;
                          handleFormSelectChange(setEditAppointmentForm, 'responsibleUserId', valToStore);
                      }}
                    >
                      <SelectTrigger id="editResponsibleUserId" className="w-full">
                        <SelectValue placeholder="Clínica / Não especificado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>Clínica / Não especificado</SelectItem>
                        {isLoadingClinicUsers ? <SelectItem value="loading-users" disabled>Carregando...</SelectItem> : clinicUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.nomeCompleto}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
              <Label htmlFor="editType" className="block text-left sm:text-right sm:col-span-1">Tipo*</Label>
              <div className="col-span-full sm:col-span-3">
                <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-1">
                  <Select value={editAppointmentForm.type} onValueChange={(value) => handleFormSelectChange(setEditAppointmentForm, 'type', value)} required>
                    <SelectTrigger id="editType" className="w-full sm:flex-grow"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{activeAppointmentTypes.map((type) => <SelectItem key={type.id || type.name} value={type.name}>{type.name}</SelectItem>)}{activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum</SelectItem>}</SelectContent>
                  </Select>
                  <div className="flex gap-1 w-full sm:w-auto justify-end sm:justify-start">
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar" className="flex-shrink-0"><Search className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
            {showNaoLancarFinanceiroSwitch && currentUserData?.plano !== 'Gratuito' && (
                <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
                  <Label htmlFor="naoLancarFinanceiroEdit" className="block text-left sm:text-right sm:col-span-3">Gerar Lançamento Financeiro?</Label>
                  <div className="col-span-full sm:col-span-1 flex justify-start">
                    <Switch
                      id="naoLancarFinanceiroEdit"
                      checked={!editAppointmentForm.naoLancarFinanceiro}
                      onCheckedChange={(checked) => handleFormInputChange(setEditAppointmentForm, 'naoLancarFinanceiro', !checked)}
                    />
                  </div>
                </div>
              )}
            <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
              <Label htmlFor="editDate" className="block text-left sm:text-right sm:col-span-1">Data*</Label>
              <div className="col-span-full sm:col-span-3">
                <Input id="editDate" type="date" value={editAppointmentForm.date} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'date', e.target.value)} className="w-full" min={clientToday && editingAppointmentInfo && editingAppointmentInfo.appointment.date === format(clientToday, 'yyyy-MM-dd') ? format(clientToday, 'yyyy-MM-dd') : undefined} required />
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-center sm:gap-x-4">
              <Label htmlFor="editTime" className="block text-left sm:text-right sm:col-span-1">Hora*</Label>
              <div className="col-span-full sm:col-span-3">
                <Input id="editTime" type="time" value={editAppointmentForm.time} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'time', e.target.value)} className="w-full" required />
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-y-1 sm:grid-cols-4 sm:items-start sm:gap-x-4">
              <Label htmlFor="editNotes" className="block text-left sm:text-right sm:col-span-1 pt-0 sm:pt-2">Observações</Label>
              <div className="col-span-full sm:col-span-3">
                <Textarea id="editNotes" value={editAppointmentForm.notes} onChange={(e) => handleFormInputChange(setEditAppointmentForm, 'notes', e.target.value as string)} className="w-full" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit"><Save className="mr-2 h-4 w-4" />Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Atendimento</DialogTitle>
            <DialogDescription>Insira os detalhes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCustomTypeName" className="text-right col-span-1">Nome*</Label>
              <Input id="newCustomTypeName" value={newCustomType.name} onChange={(e) => setNewCustomType(prev => ({ ...prev, name: e.target.value }))} className="col-span-3" />
            </div>
            {currentUserData?.plano !== 'Gratuito' && (
                <>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newCustomTypeValor" className="text-right col-span-1">Valor (R$)</Label>
                    <Input id="newCustomTypeValor" type="number" value={newCustomType.valor || ''} onChange={(e) => setNewCustomType(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))} className="col-span-3" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newCustomTypeLancar" className="text-right col-span-3">Lançar Financeiro Automático?</Label>
                    <Switch id="newCustomTypeLancar" checked={newCustomType.lancarFinanceiroAutomatico} onCheckedChange={(checked) => setNewCustomType(prev => ({ ...prev, lancarFinanceiroAutomatico: checked }))} className="col-span-1 justify-self-start" />
                    </div>
                </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setNewCustomType({ name: '', valor: 0, lancarFinanceiroAutomatico: false, status: 'active' })}>Cancelar</Button></DialogClose>
            <Button onClick={handleAddCustomType}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageTypesDialogOpen} onOpenChange={setIsManageTypesDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {appointmentTypes.map((type) => (
              <div key={type.id || type.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingTypeInfo && editingTypeInfo.type.id === type.id ? (
                  <div className="flex-grow grid grid-cols-3 gap-2 mr-2 items-center">
                    <Input value={editingTypeInfo.currentData?.name || ''} onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, name: e.target.value } } : null)} className="h-8 col-span-3" placeholder="Nome do tipo" />
                    {currentUserData?.plano !== 'Gratuito' && (
                        <>
                            <Input type="number" value={editingTypeInfo.currentData?.valor || ''} onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, valor: parseFloat(e.target.value) || 0 } } : null)} className="h-8 col-span-1" placeholder="Valor"/>
                            <div className="col-span-2 flex items-center justify-end mt-1 gap-2">
                                <Label htmlFor={`editLancar-${type.id}`} className="text-xs">Lançar Financeiro Auto.?</Label>
                                <Switch id={`editLancar-${type.id}`} checked={editingTypeInfo.currentData?.lancarFinanceiroAutomatico || false} onCheckedChange={(checked) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, lancarFinanceiroAutomatico: checked }} : null)} />
                            </div>
                        </>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow">
                    <span className={` ${type.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{type.name}</span>
                    {currentUserData?.plano !== 'Gratuito' && (
                        <div className="text-xs text-muted-foreground">
                            Valor: R$ {(type.valor || 0).toFixed(2)} - Lanç. Auto: {type.lancarFinanceiroAutomatico ? 'Sim' : 'Não'}
                        </div>
                    )}
                  </div>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {editingTypeInfo && editingTypeInfo.type.id === type.id ? (
                    <>
                      <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedTypeName} title="Salvar"><Save className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo(null)} title="Cancelar"><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo({ type: type, currentData: { name: type.name, valor: type.valor, lancarFinanceiroAutomatico: type.lancarFinanceiroAutomatico } })} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteTypeDialog(type)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                  <Switch checked={type.status === 'active'} onCheckedChange={() => setTypeToToggleStatusConfirm(type)} aria-label={`Status ${type.name}`} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400" />
                </div>
              </div>
            ))}
            {appointmentTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo.</p>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!typeToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setTypeToToggleStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Status</AlertDialogTitle><AlertDialogDescription>Deseja {typeToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} "{typeToToggleStatusConfirm?.name}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setTypeToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => typeToToggleStatusConfirm && handleToggleTypeStatus(typeToToggleStatusConfirm)} className={typeToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}>{typeToToggleStatusConfirm?.status === 'active' ? 'Desativar' : 'Ativar'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteTypeConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) setTypeToDelete(null); setIsDeleteTypeConfirmOpen(isOpen); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir "<strong>{typeToDelete?.name}</strong>"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setTypeToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteType} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteApptConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) setAppointmentToDeleteInfo(null); setIsDeleteApptConfirmOpen(isOpen); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir o agendamento para {appointmentToDeleteInfo?.patientName} às {appointmentToDeleteInfo?.time}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteAppt} className="bg-destructive hover:bg-destructive/90">Excluir Agendamento</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isConfirmWhatsAppDialogOpen} onOpenChange={setIsConfirmWhatsAppDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mensagem de Confirmação</DialogTitle><DialogDescription>Enviar para {selectedApptForWhatsApp?.patientName}. Tel: {isFetchingPatientPhone ? "Carregando..." : (whatsAppPatientDetails.phone || "Não cadastrado")}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={whatsAppMsgType} onValueChange={(value) => setWhatsAppMsgType(value as 'predefined' | 'custom')}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="predefined" id="rb-predefined-confirm" /><Label htmlFor="rb-predefined-confirm">Usar padrão</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id="rb-custom-confirm" /><Label htmlFor="rb-custom-confirm">Personalizada</Label></div>
            </RadioGroup>
            {whatsAppMsgType === 'predefined' && selectedApptForWhatsApp && <Card className="bg-muted/50"><CardContent className="p-3 text-sm text-muted-foreground"><p>Olá {selectedApptForWhatsApp.patientName}, tudo bem? Confirmando seu agendamento para {selectedApptForWhatsApp.type} no dia {format(parse(selectedApptForWhatsApp.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })} às {selectedApptForWhatsApp.time}. Em caso de imprevisto, por favor, nos avise com antecedência. Até breve!</p></CardContent></Card>}
            {whatsAppMsgType === 'custom' && <Textarea value={customWhatsAppMsg} onChange={(e) => setCustomWhatsAppMsg(e.target.value)} placeholder={`Mensagem para ${selectedApptForWhatsApp?.patientName}...`} rows={4} />}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose><Button onClick={handleSendWhatsAppConfirmation} disabled={!whatsAppPatientDetails.phone || isFetchingPatientPhone}><Send className="mr-2 h-4 w-4" /> Enviar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

