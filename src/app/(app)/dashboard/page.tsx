
'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users, PlusCircle, CheckCircle, Pencil, X as XIcon, Gift, Send, Info, AlertTriangle as AlertTriangleIcon, Filter, UserCog } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { Bar, CartesianGrid, XAxis, YAxis, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, ResponsiveContainer } from "recharts";
import Link from "next/link";
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
import { PlansModal } from '@/components/sections/plans-modal';
import { parseISO, getMonth, getDate, format, startOfDay, startOfMonth, endOfMonth, subMonths, getDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { MessageCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


type PatientForSelect = {
  id: string;
  name: string;
  slug: string;
};

type PatientForBirthday = {
  id: string;
  name: string;
  dob?: string;
  phone?: string;
  slug: string;
};


type Alert = {
  id: string;
  uid: string;
  nomeEmpresa?: string;
  patientId: string;
  patientName: string;
  patientSlug: string;
  reason: string;
  createdAt: Date;
};

type AlertForm = {
  patientId: string;
  reason: string;
}

type AppointmentForDashboard = {
  id: string;
  time: string;
  patientName: string;
  patientSlug: string;
  responsibleUserName?: string;
  status?: 'agendado' | 'cancelado' | 'realizado' | string; // Added status
};

type WeeklyAppointmentChartData = {
  day: string;
  appointments: number;
};


const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
};

type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica';
type StatusCobranca = 'ativo' | 'pendente' | 'cancelado' | string;

type DashboardFilterType = 'mine' | 'all_clinic';


export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isNewAlertDialogOpen, setIsNewAlertDialogOpen] = useState(false);
  const [isEditAlertDialogOpen, setIsEditAlertDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPlanWarningVisible, setIsPlanWarningVisible] = useState(true);

  const [usuario, setUsuario] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [billingStatus, setBillingStatus] = useState<StatusCobranca | null>(null);


  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [clientTodayString, setClientTodayString] = useState<string>('');

  const [firebasePatients, setFirebasePatients] = useState<PatientForSelect[]>([]);
  const [isLoadingFirebasePatients, setIsLoadingFirebasePatients] = useState(true);
  const [todaysFirebaseAppointments, setTodaysFirebaseAppointments] = useState<AppointmentForDashboard[]>([]);
  const [isLoadingTodaysAppointments, setIsLoadingTodaysAppointments] = useState(true);

  const [actualWeeklyAppointmentsData, setActualWeeklyAppointmentsData] = useState<WeeklyAppointmentChartData[]>([]);
  const [isLoadingWeeklyAppointments, setIsLoadingWeeklyAppointments] = useState(true);

  const [monthlyRevenue, setMonthlyRevenue] = useState<number | null>(null);
  const [revenueComparisonPercentage, setRevenueComparisonPercentage] = useState<number | null>(null);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);

  const [birthdayPatients, setBirthdayPatients] = useState<PatientForBirthday[]>([]);
  const [isBirthdayMessageDialogOpen, setIsBirthdayMessageDialogOpen] = useState(false);
  const [selectedBirthdayPatient, setSelectedBirthdayPatient] = useState<PatientForBirthday | null>(null);
  const [birthdayMessageType, setBirthdayMessageType] = useState<'predefined' | 'custom'>('predefined');
  const [customBirthdayMessage, setCustomBirthdayMessage] = useState('');

  const [todayAppointmentsFilter, setTodayAppointmentsFilter] = useState<DashboardFilterType>('mine');
  const [weeklyAppointmentsFilter, setWeeklyAppointmentsFilter] = useState<DashboardFilterType>('mine');


  const isFreePlan = currentUserData?.plano === 'Gratuito';

  useEffect(() => {
    const now = new Date();
    setClientNow(now);
    setClientTodayString(format(startOfDay(now), 'yyyy-MM-dd'));
  }, []);


 useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUserData({ ...data, uid: user.uid, plano: data.plano || "Gratuito" });
            setBillingStatus(data.statusCobranca || 'ativo');
             setIsPlanWarningVisible(data.plano === 'Gratuito');
          } else {
            console.warn("User document not found for UID:", user.uid);
            setCurrentUserData({ uid: user.uid, plano: "Gratuito" });
            setBillingStatus('ativo');
            setIsPlanWarningVisible(true);
          }
        }, (error) => {
          console.error("Error listening to user document for dashboard:", error);
          setCurrentUserData({ uid: user.uid, plano: "Gratuito" });
          setBillingStatus('ativo');
          setIsPlanWarningVisible(true);
          toast({
              title: "Erro ao carregar dados do usuário",
              description: "Não foi possível carregar suas informações em tempo real.",
              variant: "warning"
          });
        });
      } else {
        setFirebasePatients([]);
        setAlerts([]);
        setIsLoadingFirebasePatients(false);
        setTodaysFirebaseAppointments([]);
        setIsLoadingTodaysAppointments(false);
        setActualWeeklyAppointmentsData([]);
        setIsLoadingWeeklyAppointments(false);
        setMonthlyRevenue(null);
        setRevenueComparisonPercentage(null);
        setIsLoadingRevenue(false);
        setBirthdayPatients([]);
        setCurrentUserData(null);
        setBillingStatus(null);
        setIsPlanWarningVisible(false);
      }
    });
    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
    };
  }, [toast]);


  const fetchAlerts = useCallback(async (currentAuthUser: FirebaseUser, uData: any) => {
    if (!currentAuthUser) return;
    try {
      const alertsRef = collection(db, 'alertas');
      let q;
      if (uData?.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(alertsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), orderBy('createdAt', 'desc'));
      } else {
        q = query(alertsRef, where('uid', '==', currentAuthUser.uid), orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const fetchedAlerts: Alert[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let createdAtDate: Date;

        if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
          createdAtDate = (data.createdAt as Timestamp).toDate();
        } else if (data.createdAt && (typeof data.createdAt === 'string' || typeof data.createdAt === 'number')) {
          try {
            createdAtDate = new Date(data.createdAt);
            if (isNaN(createdAtDate.getTime())) {
              createdAtDate = new Date();
            }
          } catch (parseError) {
            createdAtDate = new Date();
          }
        } else {
          createdAtDate = new Date();
        }

        fetchedAlerts.push({
          id: docSnap.id,
          uid: data.uid as string,
          nomeEmpresa: data.nomeEmpresa as string | undefined,
          patientId: data.patientId as string,
          patientName: data.patientName as string,
          patientSlug: data.patientSlug as string,
          reason: data.reason as string,
          createdAt: createdAtDate,
        });
      });
      setAlerts(fetchedAlerts);
    } catch (error: any) {
      console.error("Erro ao buscar alertas:", error);
      toast({ title: "Erro ao buscar alertas", description: "Não foi possível carregar os alertas.", variant: "destructive" });
    }
  }, [toast]);

  const fetchTodaysAppointments = useCallback(async (currentAuthUser: FirebaseUser, uData: any, dateString: string, filterType: DashboardFilterType) => {
    if (!currentAuthUser || !dateString || !uData) return;
    setIsLoadingTodaysAppointments(true);
    try {
      const apptsRef = collection(db, 'agendamentos');
      let q;

      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        if (filterType === 'mine') {
          q = query(apptsRef,
            where('nomeEmpresa', '==', uData.nomeEmpresa),
            where('date', '==', dateString),
            where('responsibleUserId', '==', currentAuthUser.uid),
            orderBy('time')
          );
        } else { 
          q = query(apptsRef,
            where('nomeEmpresa', '==', uData.nomeEmpresa),
            where('date', '==', dateString),
            orderBy('time')
          );
        }
      } else { 
        q = query(apptsRef,
          where('uid', '==', currentAuthUser.uid),
          where('date', '==', dateString),
          orderBy('time')
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedAppointments: AppointmentForDashboard[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedAppointments.push({
          id: docSnap.id,
          time: data.time as string,
          patientName: data.patientName as string,
          patientSlug: data.patientSlug as string,
          responsibleUserName: data.responsibleUserName as string | undefined,
          status: data.status as AppointmentForDashboard['status'] | undefined, // Include status
        });
      });
      setTodaysFirebaseAppointments(fetchedAppointments);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos de hoje:", error);
      toast({ title: "Erro nos agendamentos", description: "Não foi possível carregar os agendamentos de hoje.", variant: "destructive" });
      setTodaysFirebaseAppointments([]);
    } finally {
      setIsLoadingTodaysAppointments(false);
    }
  }, [toast]);

  const fetchWeeklyAppointments = useCallback(async (currentAuthUser: FirebaseUser, uData: any, now: Date, filterType: DashboardFilterType) => {
    if (!currentAuthUser || !now || !uData) return;
    setIsLoadingWeeklyAppointments(true);
    const weekDaysPt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const daysOfWeekData: WeeklyAppointmentChartData[] = weekDaysPt.slice(1).concat(weekDaysPt[0]).map(day => ({ day, appointments: 0 }));

    try {
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

      const apptsRef = collection(db, 'agendamentos');
      let q;

      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        if (filterType === 'mine') {
          q = query(apptsRef,
            where('nomeEmpresa', '==', uData.nomeEmpresa),
            where('date', '>=', format(startOfCurrentWeek, 'yyyy-MM-dd')),
            where('date', '<=', format(endOfCurrentWeek, 'yyyy-MM-dd')),
            where('responsibleUserId', '==', currentAuthUser.uid) 
          );
        } else { 
          q = query(apptsRef,
            where('nomeEmpresa', '==', uData.nomeEmpresa),
            where('date', '>=', format(startOfCurrentWeek, 'yyyy-MM-dd')),
            where('date', '<=', format(endOfCurrentWeek, 'yyyy-MM-dd'))
          );
        }
      } else { 
        q = query(apptsRef,
          where('uid', '==', currentAuthUser.uid),
          where('date', '>=', format(startOfCurrentWeek, 'yyyy-MM-dd')),
          where('date', '<=', format(endOfCurrentWeek, 'yyyy-MM-dd'))
        );
      }

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        try {
          const apptDate = parseISO(data.date as string);
          const dayIndex = (getDay(apptDate) + 6) % 7; 
          if (daysOfWeekData[dayIndex]) {
            daysOfWeekData[dayIndex].appointments += 1;
          }
        } catch (e) {
          console.error("Error parsing appointment date for weekly chart:", data.date, e);
        }
      });
      setActualWeeklyAppointmentsData(daysOfWeekData);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos da semana:", error);
      toast({ title: "Erro nos agendamentos da semana", description: "Não foi possível carregar os dados do gráfico.", variant: "destructive" });
      setActualWeeklyAppointmentsData(daysOfWeekData);
    } finally {
      setIsLoadingWeeklyAppointments(false);
    }
  }, [toast]);


  const fetchMonthlyRevenueData = useCallback(async (currentAuthUser: FirebaseUser, uData: any, now: Date) => {
    if (!currentAuthUser || !now) return;
    setIsLoadingRevenue(true);

    let currentMonthTotal = 0;
    let previousMonthTotal = 0;

    try {
      const transactionsRef = collection(db, 'financialTransactions');
      const baseQueryConditions = (targetDate: Date) => [
        where('status', '==', 'Recebido'),
        where('date', '>=', Timestamp.fromDate(startOfMonth(targetDate))),
        where('date', '<=', Timestamp.fromDate(endOfMonth(targetDate)))
      ];

      let currentMonthQuery;
      let previousMonthQuery;

      if (uData?.plano === 'Clínica' && uData.nomeEmpresa) {
        currentMonthQuery = query(transactionsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), ...baseQueryConditions(now));
        previousMonthQuery = query(transactionsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), ...baseQueryConditions(subMonths(now, 1)));
      } else {
        currentMonthQuery = query(transactionsRef, where('ownerId', '==', currentAuthUser.uid), ...baseQueryConditions(now));
        previousMonthQuery = query(transactionsRef, where('ownerId', '==', currentAuthUser.uid), ...baseQueryConditions(subMonths(now, 1)));
      }

      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      currentMonthSnapshot.forEach(doc => currentMonthTotal += (doc.data().amount as number || 0));
      setMonthlyRevenue(currentMonthTotal);

      const previousMonthSnapshot = await getDocs(previousMonthQuery);
      previousMonthSnapshot.forEach(doc => previousMonthTotal += (doc.data().amount as number || 0));

      if (previousMonthTotal > 0) {
        const percentage = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
        setRevenueComparisonPercentage(percentage);
      } else if (currentMonthTotal > 0) {
        setRevenueComparisonPercentage(100); 
      } else {
        setRevenueComparisonPercentage(0);
      }

    } catch (error: any) {
      console.error("Erro ao buscar faturamento do mês:", error);
      toast({ title: "Erro no Faturamento", description: "Não foi possível carregar os dados de faturamento.", variant: "destructive" });
      setMonthlyRevenue(null);
      setRevenueComparisonPercentage(null);
    } finally {
      setIsLoadingRevenue(false);
    }
  }, [toast]);


  useEffect(() => {
    if (usuario && currentUserData && clientNow && clientTodayString) {
      const fetchAllDashboardData = async () => {
        setIsLoadingFirebasePatients(true);
        try {
          const patientsRef = collection(db, 'pacientes');
          let pq;
           if (currentUserData.plano === 'Clínica' && currentUserData.nomeEmpresa) {
            pq = query(patientsRef, where('nomeEmpresa', '==', currentUserData.nomeEmpresa), where('status', '==', 'Ativo'));
           } else {
            pq = query(patientsRef, where('uid', '==', usuario.uid), where('status', '==', 'Ativo'));
           }
          const patientsSnapshot = await getDocs(pq);
          const fetchedPatients: PatientForSelect[] = [];
          const fetchedBirthdayPatientsData: PatientForBirthday[] = [];
          const todayDate = clientNow;
          const currentMonth = getMonth(todayDate);
          const currentDay = getDate(todayDate);

          patientsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedPatients.push({
              id: docSnap.id,
              name: data.name as string,
              slug: data.slug as string,
            });
            if (data.dob) {
              try {
                const dobDate = parseISO(data.dob);
                if (getMonth(dobDate) === currentMonth && getDate(dobDate) === currentDay) {
                  fetchedBirthdayPatientsData.push({
                    id: docSnap.id,
                    name: data.name as string,
                    dob: data.dob as string,
                    slug: data.slug as string,
                    phone: data.phone as string,
                  });
                }
              } catch (e) {
                console.error("Error parsing DOB for birthday check:", data.dob, e);
              }
            }
          });
          setFirebasePatients(fetchedPatients);
          setBirthdayPatients(fetchedBirthdayPatientsData);
          setIsLoadingFirebasePatients(false);

          await Promise.all([
            fetchAlerts(usuario, currentUserData),
            fetchTodaysAppointments(usuario, currentUserData, clientTodayString, todayAppointmentsFilter),
            fetchWeeklyAppointments(usuario, currentUserData, clientNow, weeklyAppointmentsFilter),
            fetchMonthlyRevenueData(usuario, currentUserData, clientNow)
          ]);

        } catch (error) {
          console.error("Erro ao buscar dados do dashboard:", error);
          toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar informações do dashboard.", variant: "destructive" });
          setFirebasePatients([]);
          setBirthdayPatients([]);
          setAlerts([]);
          setTodaysFirebaseAppointments([]);
          setActualWeeklyAppointmentsData(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => ({ day, appointments: 0 })));
          setIsLoadingFirebasePatients(false);
        }
      };
      fetchAllDashboardData();
    }
  }, [usuario, currentUserData, clientNow, clientTodayString, toast, fetchAlerts, fetchTodaysAppointments, fetchWeeklyAppointments, fetchMonthlyRevenueData, todayAppointmentsFilter, weeklyAppointmentsFilter]);


  const [alertForm, setAlertForm] = useState<AlertForm>({
    patientId: '',
    reason: '',
  });

  const handleAlertFormInputChange = (field: keyof AlertForm, value: string) => {
    setAlertForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAlertFormSelectChange = (field: keyof AlertForm, value: string) => {
    setAlertForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAlert = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!usuario || !currentUserData) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    if (!alertForm.patientId || !alertForm.reason.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, selecione um paciente e descreva o motivo do alerta.",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = firebasePatients.find(p => p.id === alertForm.patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    try {
      const newAlertData: Partial<Alert> = {
        uid: usuario.uid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        reason: alertForm.reason.trim(),
        createdAt: serverTimestamp() as any,
      };
      if(currentUserData.plano === 'Clínica' && currentUserData.nomeEmpresa){
        newAlertData.nomeEmpresa = currentUserData.nomeEmpresa;
      }

      await addDoc(collection(db, 'alertas'), newAlertData);

      setAlertForm({ patientId: '', reason: '' });
      setIsNewAlertDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: `Alerta adicionado para ${selectedPatient.name}.`,
        variant: "success",
      });
      await fetchAlerts(usuario, currentUserData);
    } catch (error: any) {
      console.error("Erro ao adicionar alerta:", error);
      toast({ title: "Erro ao adicionar alerta", description: "Não foi possível salvar o alerta.", variant: "destructive" });
    }
  };

  const handleOpenEditAlert = (alertToEdit: Alert) => {
    setEditingAlert(alertToEdit);
    setAlertForm({
      patientId: alertToEdit.patientId,
      reason: alertToEdit.reason,
    });
    setIsEditAlertDialogOpen(true);
  };

  const handleEditAlert = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAlert || !alertForm.patientId || !alertForm.reason.trim() || !usuario || !currentUserData) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = firebasePatients.find(p => p.id === alertForm.patientId);
    if (!selectedPatient) {
      toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
      return;
    }

    try {
      const alertRef = doc(db, 'alertas', editingAlert.id);
      const updatedAlertData: Partial<Alert> = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        reason: alertForm.reason.trim(),
      };

      await updateDoc(alertRef, updatedAlertData);

      setEditingAlert(null);
      setAlertForm({ patientId: '', reason: '' });
      setIsEditAlertDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: "Alerta atualizado com sucesso.",
        variant: "success",
      });
      await fetchAlerts(usuario, currentUserData);
    } catch (error: any) {
      console.error("Erro ao editar alerta:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o alerta.", variant: "destructive" });
    }
  };


  const handleResolveAlert = async (alertId: string) => {
    if (!usuario || !currentUserData) return;
    try {
      await deleteDoc(doc(db, 'alertas', alertId));
      toast({
        title: "Alerta Resolvido",
        description: "O alerta foi removido.",
        variant: "success"
      });
      await fetchAlerts(usuario, currentUserData);
    } catch (error: any) {
      console.error("Erro ao resolver alerta:", error);
      toast({ title: "Erro", description: "Não foi possível remover o alerta.", variant: "destructive" });
    }
  };


  const handleSelectPlan = (planName: PlanName) => {
    console.log("Updating plan to:", planName);
    if (currentUserData) {
        setCurrentUserData((prev: any) => ({...prev, plano: planName}));
    }
  };

  const openBirthdayMessageDialog = (patient: PatientForBirthday) => {
    setSelectedBirthdayPatient(patient);
    setBirthdayMessageType('predefined');
    setCustomBirthdayMessage('');
    setIsBirthdayMessageDialogOpen(true);
  };

  const handleSendBirthdayMessage = () => {
    if (!selectedBirthdayPatient || !selectedBirthdayPatient.phone) {
      toast({ title: "Erro", description: "Paciente ou telefone não selecionado.", variant: "destructive"});
      return;
    }
    let message = '';
    if (birthdayMessageType === 'predefined') {
      message = `Olá ${selectedBirthdayPatient.name}! Parabéns pelo seu aniversário 🎉 Desejamos muita saúde e felicidades!`;
    } else {
      if (!customBirthdayMessage.trim()) {
        toast({ title: "Mensagem Vazia", description: "Por favor, escreva uma mensagem personalizada.", variant: "warning"});
        return;
      }
      message = customBirthdayMessage;
    }

    const cleanPhone = selectedBirthdayPatient.phone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappLink, '_blank');
    toast({ title: "Mensagem Pronta", description: `Abrindo WhatsApp para enviar mensagem para ${selectedBirthdayPatient.name}.`, variant: "success"});
    setIsBirthdayMessageDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: AppointmentForDashboard['status']) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'agendado': return 'default';
      case 'realizado': return 'success';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      </div>

      {isFreePlan && isPlanWarningVisible && (
        <Card className="bg-accent/20 border-accent shadow-md relative">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-accent mr-2" />
              <CardTitle className="text-sm font-bold text-black">
                Aviso de Plano
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 absolute top-2 right-2 text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => setIsPlanWarningVisible(false)}
              aria-label="Fechar aviso de plano"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-black text-sm text-center sm:text-left">
              Você está no plano gratuito.
              Com ele, você tem acesso à <strong>Agenda Básica</strong> e ao <strong>Cadastro de até 10 pacientes.</strong>
              Para desbloquear as demais funcionalidades do sistema, faça o upgrade para um plano <strong>Essencial</strong>, <strong>Profissional</strong> ou <strong>Clínica</strong>.
            </p>
            <Button size="sm" onClick={() => setIsPlansModalOpen(true)} className="w-full sm:w-auto">
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      )}

      {billingStatus === 'pendente' && (
        <Card className="bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700 shadow-md">
          <CardHeader className="flex flex-row items-start space-y-0 pb-2">
            <AlertTriangleIcon className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
            <div className="flex-1">
                <CardTitle className="text-base font-semibold text-orange-700 dark:text-orange-300">Pagamento Pendente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600 dark:text-orange-300/90">
              Sua assinatura está com o pagamento pendente. Por favor, verifique sua conta do Mercado Pago para regularizar a situação e evitar a interrupção dos serviços.
            </p>
            <Button variant="link" className="p-0 h-auto mt-2 text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200" asChild>
              <Link href="/configuracoes?tab=plano">Verificar Assinatura</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {billingStatus === 'cancelado' && (
        <Card className="bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700 shadow-md">
          <CardHeader className="flex flex-row items-start space-y-0 pb-2">
            <XIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
             <div className="flex-1">
                <CardTitle className="text-base font-semibold text-red-700 dark:text-red-300">Assinatura Cancelada</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-300/90">
              Sua assinatura foi cancelada. Para continuar utilizando todos os recursos do CliniPrática, por favor, escolha um novo plano.
            </p>
             <Button variant="link" className="p-0 h-auto mt-2 text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200" onClick={() => setIsPlansModalOpen(true)}>
              Ver Planos e Reativar
            </Button>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos da Semana</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {currentUserData?.plano === 'Clínica' && (
              <div className="mb-4">
                <Label htmlFor="weekly-filter" className="text-xs text-muted-foreground">Filtrar por:</Label>
                <Select value={weeklyAppointmentsFilter} onValueChange={(value) => setWeeklyAppointmentsFilter(value as DashboardFilterType)}>
                  <SelectTrigger id="weekly-filter" className="h-8 text-xs">
                    <SelectValue placeholder="Filtrar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">Meus Agendamentos</SelectItem>
                    <SelectItem value="all_clinic">Todos da Clínica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="h-[200px] w-full">
              {isLoadingWeeklyAppointments ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando dados...</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <RechartsBarChart data={actualWeeklyAppointmentsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="appointments" fill="var(--color-appointments)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Agendados Hoje</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[230px] overflow-y-auto"> 
            {currentUserData?.plano === 'Clínica' && (
              <div className="mb-3">
                <Label htmlFor="today-filter" className="text-xs text-muted-foreground">Filtrar por:</Label>
                <Select value={todayAppointmentsFilter} onValueChange={(value) => setTodayAppointmentsFilter(value as DashboardFilterType)}>
                  <SelectTrigger id="today-filter" className="h-8 text-xs">
                    <SelectValue placeholder="Filtrar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">Meus Agendamentos</SelectItem>
                    <SelectItem value="all_clinic">Todos da Clínica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isLoadingTodaysAppointments ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando agendamentos...</p>
            ) : todaysFirebaseAppointments.length > 0 ? (
              todaysFirebaseAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium shrink-0">{appt.time}</span> -
                    <span className="text-muted-foreground truncate ml-1" title={appt.patientName}>{appt.patientName}</span>
                    {appt.status && (
                      <Badge variant={getStatusBadgeVariant(appt.status)} className="ml-2 text-xs capitalize">
                        {appt.status}
                      </Badge>
                    )}
                    {currentUserData?.plano === 'Clínica' && appt.responsibleUserName && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCog className="h-3 w-3"/> {appt.responsibleUserName}
                      </div>
                    )}
                  </div>
                  <Link href={`/pacientes/${appt.patientSlug}`} passHref className="shrink-0">
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
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Alertas Importantes</CardTitle>
            </div>
            <Dialog open={isNewAlertDialogOpen} onOpenChange={setIsNewAlertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Novo Alerta"
                  onClick={(e) => {
                    if (isFreePlan) {
                      e.preventDefault();
                      toast({
                        title: "Plano necessário",
                        description: "Essa funcionalidade está disponível apenas para planos Essencial, Profissional ou Clínica.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Alerta</DialogTitle>
                  <DialogDescription>
                    Selecione o paciente e descreva o motivo do alerta. Ele aparecerá no Dashboard.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAlert}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="alertPatientId" className="text-right">
                        Paciente*
                      </Label>
                      <Select
                        value={alertForm.patientId}
                        onValueChange={(value) => handleAlertFormSelectChange('patientId', value)}

                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingFirebasePatients ? (
                            <SelectItem value="loading" disabled>Carregando pacientes...</SelectItem>
                          ) : firebasePatients.length === 0 ? (
                            <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>
                          ) : (
                            firebasePatients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="alertReason" className="text-right pt-2">
                        Motivo*
                      </Label>
                      <Textarea
                        id="alertReason"
                        value={alertForm.reason}
                        onChange={(e) => handleAlertFormInputChange('reason', e.target.value)}
                        className="col-span-3"
                        rows={3}
                        placeholder="Descreva o alerta (ex: Verificar exame, Agendar retorno urgente)"

                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Alerta</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[230px] overflow-y-auto">
            {isFreePlan ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>Este recurso está disponível apenas para os planos:</p>
                <strong className="text-primary">Essencial, Profissional ou Clínica</strong>
              </div>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between text-sm space-x-2 bg-muted/30 p-2 rounded-md">
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{alert.patientName}: </span>
                      <span className="text-muted-foreground break-words">{alert.reason}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:bg-blue-100" onClick={() => handleOpenEditAlert(alert)} title="Editar Alerta">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:bg-green-100" onClick={() => handleResolveAlert(alert.id)} title="Marcar como resolvido">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta ativo.</p>
            )
            }
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Gift className="h-4 w-4 text-muted-foreground" />
              Aniversariantes do Dia 🎂
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
            {isFreePlan ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>Este recurso está disponível apenas para os planos:</p>
                <strong className="text-primary">Essencial, Profissional ou Clínica</strong>
              </div>
            ) : isLoadingFirebasePatients ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Carregando aniversariantes...
              </p>
            ) : birthdayPatients.length > 0 ? (
              birthdayPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span
                      className="font-medium truncate flex-1 min-w-0"
                      title={patient.name}
                    >
                      {patient.name}
                    </span>
                    <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-green-600 hover:text-green-700"
                          title={patient.phone ? "Enviar mensagem no WhatsApp" : "Telefone não disponível"}
                          disabled={!patient.phone}
                          onClick={() => {
                            if (patient.phone) {
                                openBirthdayMessageDialog(patient);
                            } else {
                                toast({ title: "Telefone Indisponível", description: `Telefone de ${patient.name} não cadastrado.`, variant: "warning" });
                            }
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      <Link
                        href={`/pacientes/${patient.slug}`}
                        passHref
                        className="shrink-0"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-primary hover:text-primary/80"
                          title="Ver paciente"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum aniversariante hoje.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
            <span className="text-muted-foreground text-sm">R$</span>
          </CardHeader>
          <CardContent>
            {isFreePlan ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>Este recurso está disponível apenas para os planos:</p>
                <strong className="text-primary">Essencial, Profissional ou Clínica</strong>
              </div>
            ) : isLoadingRevenue ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando dados...</p>
            ) : monthlyRevenue !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {monthlyRevenue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                {revenueComparisonPercentage !== null && (
                  <p className={`text-xs ${revenueComparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueComparisonPercentage >= 0 ? '+' : ''}
                    {revenueComparisonPercentage.toFixed(1)}% em relação ao mês passado
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Dados indisponíveis.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
            <CardDescription>Principais ações do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" asChild className="w-full">
              <Link href="/pacientes?action=novo">
                <Users className="mr-2 h-4 w-4" /> Novo Paciente
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/agenda?action=novo">
                <CalendarCheck className="mr-2 h-4 w-4" /> Novo Agendamento
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Precisa de Ajuda?</CardTitle>
            <CardDescription>Acesse nossa central de ajuda ou entre em contato.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/contato-suporte">Central de Ajuda</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/contato-suporte">Falar com Suporte</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditAlertDialogOpen} onOpenChange={(isOpen) => {
        setIsEditAlertDialogOpen(isOpen);
        if (!isOpen) {
          setEditingAlert(null);
          setAlertForm({ patientId: '', reason: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Alerta</DialogTitle>
            <DialogDescription>
              Modifique as informações do alerta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAlert}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editAlertPatientId" className="text-right">
                  Paciente*
                </Label>
                <Select
                  value={alertForm.patientId}
                  onValueChange={(value) => handleAlertFormSelectChange('patientId', value)}

                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFirebasePatients ? (
                      <SelectItem value="loading" disabled>Carregando pacientes...</SelectItem>
                    ) : firebasePatients.length === 0 ? (
                      <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>
                    ) : (
                      firebasePatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="editAlertReason" className="text-right pt-2">
                  Motivo*
                </Label>
                <Textarea
                  id="editAlertReason"
                  value={alertForm.reason}
                  onChange={(e) => handleAlertFormInputChange('reason', e.target.value)}
                  className="col-span-3"
                  rows={3}
                  placeholder="Descreva o alerta"

                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => { setEditingAlert(null); setAlertForm({ patientId: '', reason: '' }); }}>Cancelar</Button>
              </DialogClose>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

       
      <Dialog open={isBirthdayMessageDialogOpen} onOpenChange={setIsBirthdayMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mensagem de Aniversário</DialogTitle>
            <DialogDescription>
              Enviar mensagem para {selectedBirthdayPatient?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={birthdayMessageType} onValueChange={(value) => setBirthdayMessageType(value as 'predefined' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="predefined" id="rb-predefined" />
                <Label htmlFor="rb-predefined">Usar mensagem padrão</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="rb-custom" />
                <Label htmlFor="rb-custom">Escrever mensagem personalizada</Label>
              </div>
            </RadioGroup>

            {birthdayMessageType === 'predefined' && selectedBirthdayPatient && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm text-muted-foreground">
                  <p>Olá {selectedBirthdayPatient.name}! Parabéns pelo seu aniversário 🎉 Desejamos muita saúde e felicidades!</p>
                </CardContent>
              </Card>
            )}

            {birthdayMessageType === 'custom' && (
              <Textarea
                value={customBirthdayMessage}
                onChange={(e) => setCustomBirthdayMessage(e.target.value)}
                placeholder={`Escreva sua mensagem para ${selectedBirthdayPatient?.name}...`}
                rows={4}
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSendBirthdayMessage}>
              <Send className="mr-2 h-4 w-4" /> Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlansModal
        isOpen={isPlansModalOpen}
        onOpenChange={setIsPlansModalOpen}
        currentPlanName={currentUserData?.plano || ""}
        onSelectPlan={handleSelectPlan}
        currentUser={usuario}
        currentUserName={currentUserData?.nomeCompleto || usuario?.displayName}
      />

    </div>
  );
}

