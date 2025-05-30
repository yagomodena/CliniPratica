
'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users, PlusCircle, CheckCircle, Pencil, X as XIcon, Gift } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
  orderBy
} from "firebase/firestore";
import { MessageCircle } from "lucide-react";

// Type for patients fetched from Firebase, used in select dropdowns for alerts
type PatientForSelect = {
  id: string; // Firestore document ID
  name: string;
  slug: string; // Slug for linking
};

// Patient data structure for birthday checks (can be simplified or expanded as needed)
type PatientForBirthday = {
  id: string;
  name: string;
  dob?: string; // Date of birth as YYYY-MM-DD
  phone?: string;
  slug: string; // Slug for linking
};


// Alert data structure, now includes Firestore document ID
type Alert = {
  id: string; // Firestore document ID
  uid: string;
  patientId: string; // Firestore document ID of the patient
  patientName: string;
  patientSlug: string;
  reason: string;
  createdAt: Date; // Converted from Firestore Timestamp
};

// New Alert Form structure
type AlertForm = {
  patientId: string;
  reason: string;
}

type AppointmentForDashboard = {
  id: string;
  time: string;
  patientName: string;
  patientSlug: string;
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

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isNewAlertDialogOpen, setIsNewAlertDialogOpen] = useState(false);
  const [isEditAlertDialogOpen, setIsEditAlertDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPlanWarningVisible, setIsPlanWarningVisible] = useState(true);
  const [birthdayPatients, setBirthdayPatients] = useState<PatientForBirthday[]>([]);
  const [usuario, setUsuario] = useState<FirebaseUser | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<string>("");

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


  const isFreePlan = currentUserPlan === 'Gratuito';

  useEffect(() => {
    const now = new Date();
    setClientNow(now);
    setClientTodayString(format(startOfDay(now), 'yyyy-MM-dd'));
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentUserPlan(data.plano || "Gratuito");
        }
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
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAlerts = useCallback(async (currentUsuario: FirebaseUser) => {
    if (!currentUsuario) return;
    console.log("Buscando alertas para o UID:", currentUsuario.uid);
    try {
      const alertsRef = collection(db, 'alertas');
      const q = query(alertsRef, where('uid', '==', currentUsuario.uid), orderBy('createdAt', 'desc'));
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
              console.warn(`Formato inválido de createdAt para alerta ${docSnap.id}:`, data.createdAt, "- Usando data atual como fallback.");
              createdAtDate = new Date();
            }
          } catch (parseError) {
            console.warn(`Erro ao parsear createdAt para alerta ${docSnap.id}:`, data.createdAt, parseError, "- Usando data atual como fallback.");
            createdAtDate = new Date();
          }
        } else {
          console.warn(`Tipo de createdAt ausente ou não tratado para alerta ${docSnap.id}, usando data atual como fallback.`);
          createdAtDate = new Date();
        }

        fetchedAlerts.push({
          id: docSnap.id,
          uid: data.uid as string,
          patientId: data.patientId as string,
          patientName: data.patientName as string,
          patientSlug: data.patientSlug as string,
          reason: data.reason as string,
          createdAt: createdAtDate,
        });
      });
      setAlerts(fetchedAlerts);
    } catch (error: any) {
      console.error("Erro detalhado ao buscar alertas:", error);
      let description = "Não foi possível carregar os alertas. Tente recarregar a página.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada ao buscar alertas. Verifique as regras de segurança do Firestore.";
      } else if (error.code === 'failed-precondition') {
        description = "Falha ao buscar alertas: consulta requer um índice no Firestore. Verifique o console do Firebase para a mensagem de erro original, que geralmente inclui um link direto para criar o índice necessário (geralmente para 'uid' e 'createdAt' na coleção 'alertas'). Certifique-se de que o índice foi criado corretamente e está ATIVADO.";
      }
      toast({ title: "Erro ao buscar alertas", description, variant: "destructive" });
    }
  }, [toast]);

  const fetchTodaysAppointments = useCallback(async (currentUsuario: FirebaseUser, dateString: string) => {
    if (!currentUsuario || !dateString) return;
    setIsLoadingTodaysAppointments(true);
    try {
      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', currentUsuario.uid),
        where('date', '==', dateString),
        orderBy('time')
      );
      const querySnapshot = await getDocs(q);
      const fetchedAppointments: AppointmentForDashboard[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedAppointments.push({
          id: docSnap.id,
          time: data.time as string,
          patientName: data.patientName as string,
          patientSlug: data.patientSlug as string,
        });
      });
      setTodaysFirebaseAppointments(fetchedAppointments);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos de hoje:", error);
      let description = "Não foi possível carregar os agendamentos de hoje.";
      if (error.code === 'failed-precondition') {
        description = "Falha ao buscar agendamentos de hoje: consulta requer um índice no Firestore (geralmente para 'uid', 'date' e 'time' na coleção 'agendamentos'). Verifique o console do Firebase.";
      }
      toast({ title: "Erro nos agendamentos", description, variant: "destructive" });
      setTodaysFirebaseAppointments([]);
    } finally {
      setIsLoadingTodaysAppointments(false);
    }
  }, [toast]);

  const fetchWeeklyAppointments = useCallback(async (currentUsuario: FirebaseUser, now: Date) => {
    if (!currentUsuario || !now) return;
    setIsLoadingWeeklyAppointments(true);
    const weekDaysPt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const daysOfWeekData: WeeklyAppointmentChartData[] = weekDaysPt.slice(1).concat(weekDaysPt[0]).map(day => ({ day, appointments: 0 })); // Seg-Dom

    try {
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      const apptsRef = collection(db, 'agendamentos');
      const q = query(
        apptsRef,
        where('uid', '==', currentUsuario.uid),
        where('date', '>=', format(startOfCurrentWeek, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfCurrentWeek, 'yyyy-MM-dd'))
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        try {
          const apptDate = parseISO(data.date as string);
          const dayIndex = (getDay(apptDate) + 6) % 7; // 0=Seg, 1=Ter, ..., 6=Dom
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
      setActualWeeklyAppointmentsData(daysOfWeekData); // Set to default empty week on error
    } finally {
      setIsLoadingWeeklyAppointments(false);
    }
  }, [toast]);

  const fetchMonthlyRevenueData = useCallback(async (currentUsuario: FirebaseUser, now: Date) => {
    if (!currentUsuario || !now) return;
    setIsLoadingRevenue(true);

    let currentMonthTotal = 0;
    let previousMonthTotal = 0;

    try {
      const transactionsRef = collection(db, 'financialTransactions');

      // Current Month
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      const currentMonthQuery = query(
        transactionsRef,
        where('ownerId', '==', currentUsuario.uid),
        where('status', '==', 'Recebido'),
        where('date', '>=', Timestamp.fromDate(startOfCurrentMonth)),
        where('date', '<=', Timestamp.fromDate(endOfCurrentMonth))
      );
      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      currentMonthSnapshot.forEach(doc => currentMonthTotal += (doc.data().amount as number || 0));
      setMonthlyRevenue(currentMonthTotal);

      // Previous Month
      const startOfPreviousMonth = startOfMonth(subMonths(now, 1));
      const endOfPreviousMonth = endOfMonth(subMonths(now, 1));
      const previousMonthQuery = query(
        transactionsRef,
        where('ownerId', '==', currentUsuario.uid),
        where('status', '==', 'Recebido'),
        where('date', '>=', Timestamp.fromDate(startOfPreviousMonth)),
        where('date', '<=', Timestamp.fromDate(endOfPreviousMonth))
      );
      const previousMonthSnapshot = await getDocs(previousMonthQuery);
      previousMonthSnapshot.forEach(doc => previousMonthTotal += (doc.data().amount as number || 0));

      if (previousMonthTotal > 0) {
        const percentage = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
        setRevenueComparisonPercentage(percentage);
      } else if (currentMonthTotal > 0) {
        setRevenueComparisonPercentage(100); // Or handle as "N/A" or "∞"
      } else {
        setRevenueComparisonPercentage(0);
      }

    } catch (error: any) {
      console.error("Erro ao buscar faturamento do mês:", error);
      let description = "Não foi possível carregar os dados de faturamento.";
      if (error.code === 'failed-precondition') {
        description = "A consulta de faturamento requer um índice no Firestore. Verifique o console do Firebase (para 'ownerId', 'status', e 'date' na coleção 'financialTransactions').";
      }
      toast({ title: "Erro no Faturamento", description, variant: "destructive" });
      setMonthlyRevenue(null);
      setRevenueComparisonPercentage(null);
    } finally {
      setIsLoadingRevenue(false);
    }
  }, [toast]);


  useEffect(() => {
    if (usuario && clientNow && clientTodayString) {
      const fetchAllDashboardData = async () => {
        setIsLoadingFirebasePatients(true); // Start loading patients
        try {
          // Fetch Patients & Birthdays
          const patientsRef = collection(db, 'pacientes');
          const pq = query(patientsRef, where('uid', '==', usuario.uid), where('status', '==', 'Ativo'));
          const patientsSnapshot = await getDocs(pq);
          const fetchedPatients: PatientForSelect[] = [];
          const fetchedBirthdayPatientsData: PatientForBirthday[] = [];
          const todayDate = clientNow; // Use client's current date for birthday check
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
                  });
                }
              } catch (e) {
                console.error("Error parsing DOB for birthday check:", data.dob, e);
              }
            }
          });
          setFirebasePatients(fetchedPatients);
          setBirthdayPatients(fetchedBirthdayPatientsData);
          setIsLoadingFirebasePatients(false); // Finish loading patients

          // Fetch other data concurrently
          await Promise.all([
            fetchAlerts(usuario),
            fetchTodaysAppointments(usuario, clientTodayString),
            fetchWeeklyAppointments(usuario, clientNow),
            fetchMonthlyRevenueData(usuario, clientNow)
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
  }, [usuario, clientNow, clientTodayString, toast, fetchAlerts, fetchTodaysAppointments, fetchWeeklyAppointments, fetchMonthlyRevenueData]);


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
    if (!usuario) {
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
      const newAlertData = {
        uid: usuario.uid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        reason: alertForm.reason.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'alertas'), newAlertData);

      setAlertForm({ patientId: '', reason: '' });
      setIsNewAlertDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: `Alerta adicionado para ${selectedPatient.name}.`,
        variant: "success",
      });
      await fetchAlerts(usuario);
    } catch (error: any) {
      console.error("Erro ao adicionar alerta:", error);
      let description = "Não foi possível salvar o alerta.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada ao salvar o alerta. Verifique as regras de segurança do Firestore.";
      } else if (error.code === 'failed-precondition') {
        description = "Falha ao salvar o alerta: A operação pode requerer um índice no Firestore que ainda não está ativo. Verifique o console do Firebase.";
      }
      toast({ title: "Erro ao adicionar alerta", description, variant: "destructive" });
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
    if (!editingAlert || !alertForm.patientId || !alertForm.reason.trim() || !usuario) {
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
      await updateDoc(alertRef, {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientSlug: selectedPatient.slug,
        reason: alertForm.reason.trim(),
      });

      setEditingAlert(null);
      setAlertForm({ patientId: '', reason: '' });
      setIsEditAlertDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: "Alerta atualizado com sucesso.",
        variant: "success",
      });
      await fetchAlerts(usuario);
    } catch (error: any) {
      console.error("Erro ao editar alerta:", error);
      let description = "Não foi possível atualizar o alerta.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada ao atualizar o alerta. Verifique as regras de segurança do Firestore.";
      }
      toast({ title: "Erro", description, variant: "destructive" });
    }
  };


  const handleResolveAlert = async (alertId: string) => {
    if (!usuario) return;
    try {
      await deleteDoc(doc(db, 'alertas', alertId));
      toast({
        title: "Alerta Resolvido",
        description: "O alerta foi removido.",
        variant: "success"
      });
      await fetchAlerts(usuario);
    } catch (error: any) {
      console.error("Erro ao resolver alerta:", error);
      let description = "Não foi possível remover o alerta.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada ao remover o alerta. Verifique as regras de segurança do Firestore.";
      }
      toast({ title: "Erro", description, variant: "destructive" });
    }
  };


  const handleSelectPlan = (planName: PlanName) => {
    console.log("Updating plan to:", planName);
    setCurrentUserPlan(planName);
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
              <AlertCircle className="h-4 w-4 text-accent mr-2" />
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos da Semana</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              {isLoadingWeeklyAppointments ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando dados...</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <RechartsBarChart data={actualWeeklyAppointmentsData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
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
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
            {isLoadingTodaysAppointments ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando agendamentos...</p>
            ) : todaysFirebaseAppointments.length > 0 ? (
              todaysFirebaseAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium shrink-0">{appt.time}</span>
                  <span className="text-muted-foreground truncate flex-1 min-w-0 text-left sm:text-right" title={appt.patientName}>{appt.patientName}</span>
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
                        required
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
                        required
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
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
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

        /* CARD DE ANIVERSARIANTES */
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
              birthdayPatients.map((patient) => {
                const message = `Olá ${patient.name}! Parabéns pelo seu aniversário 🎉 Desejamos muita saúde e felicidades!`;
                const whatsappLink = `https://wa.me/55${patient.phone}?text=${encodeURIComponent(message)}`;

                return (
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
                      <Link
                        href={whatsappLink}
                        target="_blank"
                        className="shrink-0"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-green-600 hover:text-green-700"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </Link>

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
                );
              })
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
                  required
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
                  required
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

      <PlansModal
        isOpen={isPlansModalOpen}
        onOpenChange={setIsPlansModalOpen}
        currentPlanName={currentUserPlan}
        onSelectPlan={handleSelectPlan}
      />

    </div>
  );
}

