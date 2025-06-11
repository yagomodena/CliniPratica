
'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users, PlusCircle, CheckCircle, Pencil, X as XIcon, Gift, Send, Info, AlertTriangle as AlertTriangleIcon, Filter, UserCog, Wallet, MessageSquare as MessageSquareIcon, MoreHorizontal, DollarSign as DollarSignIcon, CalendarClock } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge';
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
import { PlansModal } from '@/components/sections/plans-modal';
import { parseISO, getMonth, getDate, format, startOfDay, startOfMonth, endOfMonth, subMonths, getDay, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, parse as parseDateFns, setDate, isSameMonth, differenceInDays, isFuture } from 'date-fns';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { paymentMethods, transactionTypes, type PaymentMethod, type TransactionStatus, type TransactionType } from '@/lib/financeiro-data';


type PatientForSelect = {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  hasMonthlyFee?: boolean;
  monthlyFeeAmount?: number;
  monthlyFeeDueDate?: number;
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
  status?: 'agendado' | 'cancelado' | 'realizado' | string;
};

type WeeklyAppointmentChartData = {
  day: string;
  appointments: number;
};

type MonthlyFeeEntry = {
  patientId: string;
  patientName: string;
  patientSlug: string;
  patientPhone?: string;
  dueDate: Date;
  amount: number;
  calculatedStatus: 'Pago' | 'Pendente' | 'Atrasado';
  transactionId?: string;
};

type DashboardMonthlyFeeFormState = {
  description: string;
  amountString: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  type: TransactionType;
  date: string;
  patientId: string;
  notes: string;
};

const initialDashboardMonthlyFeeFormState: DashboardMonthlyFeeFormState = {
  description: '',
  amountString: '',
  paymentMethod: 'Pix',
  status: 'Recebido',
  type: 'mensalidade_paciente',
  date: format(new Date(), 'yyyy-MM-dd'),
  patientId: '',
  notes: '',
};


const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
};

type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica';
type StatusCobranca = 'ativo' | 'pendente' | 'cancelado' | 'trial' | 'trial_ended' | string; // Added new statuses


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

  const [monthlyFeeEntries, setMonthlyFeeEntries] = useState<MonthlyFeeEntry[]>([]);
  const [isLoadingMonthlyFees, setIsLoadingMonthlyFees] = useState(true);
  const [isWhatsAppMonthlyFeeDialogOpen, setIsWhatsAppMonthlyFeeDialogOpen] = useState(false);
  const [selectedPatientForWhatsAppMonthlyFee, setSelectedPatientForWhatsAppMonthlyFee] = useState<MonthlyFeeEntry | null>(null);
  const [whatsAppMonthlyFeeMsgType, setWhatsAppMonthlyFeeMsgType] = useState<'due_soon' | 'overdue' | 'custom'>('due_soon');
  const [customWhatsAppMonthlyFeeMsg, setCustomWhatsAppMonthlyFeeMsg] = useState('');

  const [isRegisterMonthlyPaymentDashboardDialogOpen, setIsRegisterMonthlyPaymentDashboardDialogOpen] = useState(false);
  const [selectedPatientForMonthlyPaymentDashboard, setSelectedPatientForMonthlyPaymentDashboard] = useState<MonthlyFeeEntry | null>(null);
  const [transactionFormForDashboardMonthlyFee, setTransactionFormForDashboardMonthlyFee] =
    useState<DashboardMonthlyFeeFormState>(initialDashboardMonthlyFeeFormState);


  const [todayAppointmentsFilter, setTodayAppointmentsFilter] = useState<DashboardFilterType>('mine');
  const [weeklyAppointmentsFilter, setWeeklyAppointmentsFilter] = useState<DashboardFilterType>('mine');

  const [isCancelTrialConfirmOpen, setIsCancelTrialConfirmOpen] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);


  const isFreePlan = currentUserData?.plano === 'Gratuito';
  const isProfessionalOrClinicPlan = currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica';
  const canSendWhatsAppMessages = currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica';


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
            setIsPlanWarningVisible(data.plano === 'Gratuito' && data.statusCobranca !== 'trial'); // Show warning only if free and not in trial

            // Calculate trial days remaining
            if (data.statusCobranca === 'trial' && data.trialEndsAt) {
                const endsAtDate = (data.trialEndsAt as Timestamp).toDate();
                const remaining = differenceInDays(endsAtDate, new Date());
                setTrialDaysRemaining(remaining > 0 ? remaining : 0);
            } else {
                setTrialDaysRemaining(null);
            }

          } else {
            console.warn("User document not found for UID:", user.uid);
            setCurrentUserData({ uid: user.uid, plano: "Gratuito" });
            setBillingStatus('ativo');
            setIsPlanWarningVisible(true);
            setTrialDaysRemaining(null);
          }
        }, (error) => {
          console.error("Error listening to user document for dashboard:", error);
          setCurrentUserData({ uid: user.uid, plano: "Gratuito" });
          setBillingStatus('ativo');
          setIsPlanWarningVisible(true);
          setTrialDaysRemaining(null);
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
        setMonthlyFeeEntries([]);
        setIsLoadingMonthlyFees(false);
        setCurrentUserData(null);
        setBillingStatus(null);
        setIsPlanWarningVisible(false);
        setTrialDaysRemaining(null);
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
          status: data.status as AppointmentForDashboard['status'] | undefined,
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
    if (!currentAuthUser || !now || !uData) return;
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

      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
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

  const fetchMonthlyFeeEntriesData = useCallback(async (currentAuthUser: FirebaseUser, uData: any, now: Date) => {
    if (!currentAuthUser || !now || !uData || (uData.plano !== 'Profissional' && uData.plano !== 'Clínica')) {
      setIsLoadingMonthlyFees(false);
      setMonthlyFeeEntries([]);
      return;
    }
    setIsLoadingMonthlyFees(true);
    const entries: MonthlyFeeEntry[] = [];

    try {
      const patientsRef = collection(db, 'pacientes');
      let pq;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        pq = query(patientsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), where('hasMonthlyFee', '==', true));
      } else {
        pq = query(patientsRef, where('uid', '==', currentAuthUser.uid), where('hasMonthlyFee', '==', true));
      }
      const patientsSnapshot = await getDocs(pq);

      const financialTransactionsRef = collection(db, 'financialTransactions');

      for (const patientDoc of patientsSnapshot.docs) {
        const patientData = patientDoc.data();
        if (patientData.monthlyFeeAmount && patientData.monthlyFeeDueDate) {
          const dueDateThisMonth = setDate(now, patientData.monthlyFeeDueDate);

          let paymentQuery;
          if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
             paymentQuery = query(
                financialTransactionsRef,
                where('nomeEmpresa', '==', uData.nomeEmpresa),
                where('patientId', '==', patientDoc.id),
                where('type', '==', 'mensalidade_paciente'),
                where('status', '==', 'Recebido'),
                where('date', '>=', Timestamp.fromDate(startOfMonth(now))),
                where('date', '<=', Timestamp.fromDate(endOfMonth(now)))
            );
          } else {
             paymentQuery = query(
                financialTransactionsRef,
                where('ownerId', '==', currentAuthUser.uid),
                where('patientId', '==', patientDoc.id),
                where('type', '==', 'mensalidade_paciente'),
                where('status', '==', 'Recebido'),
                where('date', '>=', Timestamp.fromDate(startOfMonth(now))),
                where('date', '<=', Timestamp.fromDate(endOfMonth(now)))
            );
          }

          const paymentSnapshot = await getDocs(paymentQuery);
          const paidTransaction = paymentSnapshot.docs.length > 0 ? paymentSnapshot.docs[0] : null;

          let calculatedStatus: MonthlyFeeEntry['calculatedStatus'] = 'Pendente';
          if (paidTransaction) {
            calculatedStatus = 'Pago';
          } else if (isBefore(startOfDay(dueDateThisMonth), startOfDay(now))) {
            calculatedStatus = 'Atrasado';
          }

          entries.push({
            patientId: patientDoc.id,
            patientName: patientData.name,
            patientSlug: patientData.slug,
            patientPhone: patientData.phone,
            dueDate: dueDateThisMonth,
            amount: patientData.monthlyFeeAmount,
            calculatedStatus,
            transactionId: paidTransaction?.id,
          });
        }
      }
      setMonthlyFeeEntries(entries.sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime()));
    } catch (error: any) {
      console.error("Erro ao buscar mensalidades:", error);
      toast({ title: "Erro nas Mensalidades", description: "Não foi possível carregar os dados de mensalidades.", variant: "destructive" });
      setMonthlyFeeEntries([]);
    } finally {
      setIsLoadingMonthlyFees(false);
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
              phone: data.phone as string | undefined,
              hasMonthlyFee: data.hasMonthlyFee as boolean | undefined,
              monthlyFeeAmount: data.monthlyFeeAmount as number | undefined,
              monthlyFeeDueDate: data.monthlyFeeDueDate as number | undefined,
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
            fetchMonthlyRevenueData(usuario, currentUserData, clientNow),
            fetchMonthlyFeeEntriesData(usuario, currentUserData, clientNow)
          ]);

        } catch (error) {
          console.error("Erro ao buscar dados do dashboard:", error);
          toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar informações do dashboard.", variant: "destructive" });
          setFirebasePatients([]);
          setBirthdayPatients([]);
          setAlerts([]);
          setTodaysFirebaseAppointments([]);
          setActualWeeklyAppointmentsData(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => ({ day, appointments: 0 })));
          setMonthlyFeeEntries([]);
          setIsLoadingFirebasePatients(false);
        }
      };
      fetchAllDashboardData();
    }
  }, [usuario, currentUserData, clientNow, clientTodayString, toast, fetchAlerts, fetchTodaysAppointments, fetchWeeklyAppointments, fetchMonthlyRevenueData, fetchMonthlyFeeEntriesData, todayAppointmentsFilter, weeklyAppointmentsFilter]);


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
      if (usuario && currentUserData) await fetchAlerts(usuario, currentUserData);
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
      if (usuario && currentUserData) await fetchAlerts(usuario, currentUserData);
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
      if (usuario && currentUserData) await fetchAlerts(usuario, currentUserData);
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

  const getDaysUntilDue = (dueDate: Date): number | null => {
    if (!clientNow) return null;
    if (isBefore(startOfDay(dueDate), startOfDay(clientNow))) return 0;
    return differenceInDays(startOfDay(dueDate), startOfDay(clientNow));
  };

  const openWhatsAppMonthlyFeeDialog = (patientFeeEntry: MonthlyFeeEntry) => {
    setSelectedPatientForWhatsAppMonthlyFee(patientFeeEntry);
    if (patientFeeEntry.calculatedStatus === 'Atrasado') {
      setWhatsAppMonthlyFeeMsgType('overdue');
    } else {
      setWhatsAppMonthlyFeeMsgType('due_soon');
    }
    setCustomWhatsAppMonthlyFeeMsg('');
    setIsWhatsAppMonthlyFeeDialogOpen(true);
  };

  const handleSendWhatsAppMonthlyFeeMessage = () => {
    if (!selectedPatientForWhatsAppMonthlyFee || !selectedPatientForWhatsAppMonthlyFee.patientPhone) {
      toast({ title: "Erro", description: "Paciente ou telefone não selecionado.", variant: "destructive"});
      return;
    }
    let message = '';
    const { patientName, amount, dueDate } = selectedPatientForWhatsAppMonthlyFee;

    if (whatsAppMonthlyFeeMsgType === 'due_soon') {
      const daysUntil = getDaysUntilDue(dueDate);
      if (daysUntil === null) {
        message = `Olá ${patientName}, tudo bem? Gostaríamos de lembrar sobre sua mensalidade de R$${amount.toFixed(2)}.`;
      } else if (daysUntil === 0) {
        message = `Olá ${patientName}, tudo bem? Sua mensalidade de R$${amount.toFixed(2)} vence hoje. Lembre-se de efetuar o pagamento!`;
      } else {
        message = `Olá ${patientName}, tudo bem? Faltam ${daysUntil} dia${daysUntil > 1 ? 's' : ''} para o vencimento da sua mensalidade de R$${amount.toFixed(2)}.`;
      }
    } else if (whatsAppMonthlyFeeMsgType === 'overdue') {
      message = `Olá ${patientName}, tudo bem? Identificamos que sua mensalidade de R$${amount.toFixed(2)}, vencida em ${format(dueDate, 'dd/MM/yyyy', { locale: ptBR })}, está em atraso. Por favor, regularize sua situação.`;
    } else {
      if (!customWhatsAppMonthlyFeeMsg.trim()) {
        toast({ title: "Mensagem Vazia", description: "Por favor, escreva uma mensagem personalizada.", variant: "warning"});
        return;
      }
      message = customWhatsAppMonthlyFeeMsg;
    }

    const cleanPhone = selectedPatientForWhatsAppMonthlyFee.patientPhone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappLink, '_blank');
    toast({ title: "Mensagem Pronta", description: `Abrindo WhatsApp para ${patientName}.`, variant: "success"});
    setIsWhatsAppMonthlyFeeDialogOpen(false);
  };


  const handleOpenRegisterMonthlyPaymentDashboardDialog = (feeEntry: MonthlyFeeEntry) => {
    if (!clientNow || !feeEntry) return;
    setSelectedPatientForMonthlyPaymentDashboard(feeEntry);
    setTransactionFormForDashboardMonthlyFee({
        description: `Mensalidade ${feeEntry.patientName} - ${format(feeEntry.dueDate, 'MMMM/yyyy', {locale: ptBR})}`,
        amountString: feeEntry.amount.toString(),
        paymentMethod: 'Pix',
        status: 'Recebido',
        type: 'mensalidade_paciente',
        date: format(clientNow, 'yyyy-MM-dd'),
        patientId: feeEntry.patientId,
        notes: '',
    });
    setIsRegisterMonthlyPaymentDashboardDialogOpen(true);
  };

  const handleSaveDashboardMonthlyPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!usuario || !currentUserData || !selectedPatientForMonthlyPaymentDashboard) {
      toast({ title: "Erro", description: "Dados insuficientes para registrar pagamento.", variant: "destructive" });
      return;
    }

    const { description, amountString, paymentMethod, status, type, date, patientId, notes } = transactionFormForDashboardMonthlyFee;

    const numericAmount = parseFloat(amountString);

    if (!description || amountString.trim() === '' || isNaN(numericAmount) || !paymentMethod || !status || !type || !date || !patientId ) {
      toast({ title: "Erro de Validação", description: "Todos os campos marcados com * são obrigatórios.", variant: "destructive" });
      return;
    }
     if (numericAmount <= 0) {
       toast({ title: "Valor Inválido", description: "O valor da transação deve ser maior que zero.", variant: "destructive" });
       return;
    }
    let parsedDate;
    try {
      parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) throw new Error("Data inválida");
    } catch {
      toast({ title: "Data Inválida", description: "Por favor, insira uma data válida.", variant: "destructive" });
      return;
    }

    const transactionData: any = {
      ownerId: usuario.uid,
      nomeEmpresa: currentUserData.plano === 'Clínica' ? currentUserData.nomeEmpresa || '' : '',
      date: Timestamp.fromDate(parsedDate),
      description,
      amount: numericAmount,
      paymentMethod: paymentMethod as PaymentMethod,
      status: status as TransactionStatus,
      type: type as TransactionType,
      notes: notes || '',
      patientId: patientId,
      patientName: selectedPatientForMonthlyPaymentDashboard.patientName,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'financialTransactions'), transactionData);
      toast({ title: "Sucesso!", description: "Pagamento da mensalidade registrado.", variant: "success" });
      setTransactionFormForDashboardMonthlyFee(initialDashboardMonthlyFeeFormState);
      setIsRegisterMonthlyPaymentDashboardDialogOpen(false);
      setSelectedPatientForMonthlyPaymentDashboard(null);
      if (usuario && currentUserData && clientNow) {
          fetchMonthlyFeeEntriesData(usuario, currentUserData, clientNow);
          fetchMonthlyRevenueData(usuario, currentUserData, clientNow);
      }
    } catch (error) {
      console.error("Erro ao salvar pagamento da mensalidade:", error);
      toast({ title: "Erro", description: "Não foi possível registrar o pagamento.", variant: "destructive" });
    }
  };

  const handleMarkMonthlyFeeAsPending = async (transactionId: string | undefined, patientId: string) => {
    if (!usuario || !currentUserData || !clientNow) return;
    if (!transactionId) {
        toast({ title: "Ação não permitida", description: "Não há transação de pagamento registrada para esta mensalidade.", variant: "warning" });
        return;
    }
    try {
        const transactionRef = doc(db, 'financialTransactions', transactionId);
        await updateDoc(transactionRef, {
            status: 'Pendente',
            updatedAt: serverTimestamp()
        });
        toast({ title: "Status Atualizado", description: `Mensalidade marcada como Pendente.`, variant: "success" });
        fetchMonthlyFeeEntriesData(usuario, currentUserData, clientNow);
        fetchMonthlyRevenueData(usuario, currentUserData, clientNow);
    } catch (error) {
        console.error("Erro ao marcar mensalidade como pendente:", error);
        toast({ title: "Erro", description: "Não foi possível atualizar o status da mensalidade.", variant: "destructive" });
    }
  };


  const getStatusBadgeVariant = (status: AppointmentForDashboard['status'] | MonthlyFeeEntry['calculatedStatus'] | 'Atrasado' | undefined) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'agendado': return 'default';
      case 'realizado': return 'success';
      case 'cancelado': return 'destructive';
      case 'Atrasado': return 'warning';
      case 'Pago': return 'success';
      case 'Pendente': return 'default';
      default: return 'secondary';
    }
  };

  const handleCancelTrial = async () => {
    if (!usuario || !currentUserData) return;
    try {
      const userDocRef = doc(db, 'usuarios', usuario.uid);
      await updateDoc(userDocRef, {
        statusCobranca: 'cancelado',
        plano: 'Gratuito', // Optionally downgrade to free plan
        trialEndsAt: null, // Clear trial end date
        updatedAt: serverTimestamp()
      });
      toast({ title: "Período de Teste Cancelado", description: "Seu período de teste foi cancelado.", variant: "success" });
      setIsCancelTrialConfirmOpen(false);
      // Re-fetch user data which will update the UI
    } catch (error) {
      console.error("Erro ao cancelar período de teste:", error);
      toast({ title: "Erro", description: "Não foi possível cancelar o período de teste.", variant: "destructive" });
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      </div>

      {currentUserData?.statusCobranca === 'trial' && trialDaysRemaining !== null && (
        <Card className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 shadow-md">
          <CardHeader className="flex flex-row items-start space-y-0 pb-2">
            <CalendarClock className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
                Período de Teste Ativo!
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-blue-600 dark:text-blue-300/90">
              {trialDaysRemaining > 0
                ? `Você tem ${trialDaysRemaining} dia${trialDaysRemaining === 1 ? '' : 's'} restante${trialDaysRemaining === 1 ? '' : 's'} no seu período de teste gratuito.`
                : 'Seu período de teste gratuito termina hoje!'}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400">
              Após o término, a cobrança para o plano {currentUserData?.plano ? `"${currentUserData.plano}"` : "selecionado"} será iniciada para você continuar utilizando todas as funcionalidades.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button size="sm" variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800" onClick={() => setIsPlansModalOpen(true)}>
                    Ver Planos Pagos
                </Button>
                <AlertDialog open={isCancelTrialConfirmOpen} onOpenChange={setIsCancelTrialConfirmOpen}>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
                            <XIcon className="mr-1.5 h-4 w-4" /> Cancelar Período de Teste
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Período de Teste?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar seu período de teste? Você perderá o acesso às funcionalidades pagas e sua conta será revertida para o plano Gratuito (se aplicável) ou poderá ser suspensa após o término.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelTrial} className="bg-destructive hover:bg-destructive/90">
                            Sim, Cancelar Teste
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

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
               Sua assinatura está com o pagamento pendente. Se você já realizou o pagamento, por favor, aguarde até 24 horas para a atualização do status em nosso sistema. Caso contrário, entre em contato com o suporte para regularizar.
            </p>
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
              Sua assinatura foi cancelada ou seu período de teste foi interrompido. Para continuar utilizando todos os recursos do CliniPrática, por favor, escolha um novo plano.
            </p>
             <Button variant="link" className="p-0 h-auto mt-2 text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200" onClick={() => setIsPlansModalOpen(true)}>
              Ver Planos e Reativar
            </Button>
          </CardContent>
        </Card>
      )}

      {billingStatus === 'trial_ended' && (
        <Card className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 shadow-md">
          <CardHeader className="flex flex-row items-start space-y-0 pb-2">
            <AlertTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="flex-1">
                <CardTitle className="text-base font-semibold text-yellow-700 dark:text-yellow-300">Período de Teste Finalizado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-600 dark:text-yellow-300/90">
              Seu período de teste gratuito terminou. Para continuar acessando todas as funcionalidades do CliniPrática, por favor, escolha um dos nossos planos pagos ou entre em contato com o suporte.
            </p>
             <Button variant="default" size="sm" className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-900" onClick={() => setIsPlansModalOpen(true)}>
              Escolher Plano
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
              todaysFirebaseAppointments.map((appt) => {
                const appointmentFullDateTime = clientNow && clientTodayString ? parseDateFns(`${clientTodayString} ${appt.time}`, 'yyyy-MM-dd HH:mm', new Date()) : null;
                let displayStatus: AppointmentForDashboard['status'] | 'Atrasado' | undefined = appt.status;
                if (appt.status === 'agendado' && appointmentFullDateTime && clientNow && isBefore(appointmentFullDateTime, clientNow)) {
                  displayStatus = 'Atrasado';
                }

                return (
                <div key={appt.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium shrink-0">{appt.time}</span> -
                    <span className="text-muted-foreground truncate ml-1" title={appt.patientName}>{appt.patientName}</span>
                    {displayStatus && (
                      <Badge variant={getStatusBadgeVariant(displayStatus)} className="ml-2 text-xs capitalize">
                        {displayStatus}
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
                );
              })
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
              <DialogContent className="w-[90vw] max-w-md sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Alerta</DialogTitle>
                  <DialogDescription>
                    Selecione o paciente e descreva o motivo do alerta. Ele aparecerá no Dashboard.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAlert}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                      <Label htmlFor="alertPatientId" className="text-left sm:text-right sm:col-span-1">
                        Paciente*
                      </Label>
                      <Select
                        value={alertForm.patientId}
                        onValueChange={(value) => handleAlertFormSelectChange('patientId', value)}

                      >
                        <SelectTrigger className="col-span-full sm:col-span-3">
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
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                      <Label htmlFor="alertReason" className="text-left sm:text-right sm:col-span-1 pt-0 sm:pt-2">
                        Motivo*
                      </Label>
                      <Textarea
                        id="alertReason"
                        value={alertForm.reason}
                        onChange={(e) => handleAlertFormInputChange('reason', e.target.value)}
                        className="col-span-full sm:col-span-3"
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
                       {canSendWhatsAppMessages && (
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
                            <MessageSquareIcon className="h-4 w-4" />
                            </Button>
                        )}
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

        {isProfessionalOrClinicPlan && (
          <Card className="shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Mensalidades do Mês
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4 max-h-[230px] overflow-y-auto">
                {isLoadingMonthlyFees ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Carregando mensalidades...</p>
                ) : monthlyFeeEntries.length > 0 ? (
                    monthlyFeeEntries.map((entry) => (
                        <div key={entry.patientId} className="flex items-center justify-between text-sm gap-2 p-1.5 rounded hover:bg-muted/50">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" title={entry.patientName}>{entry.patientName}</p>
                                <p className="text-xs text-muted-foreground">
                                    Vence: {format(entry.dueDate, 'dd/MM')} - R${entry.amount.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge variant={getStatusBadgeVariant(entry.calculatedStatus)} className="text-xs capitalize h-6">
                                    {entry.calculatedStatus}
                                </Badge>
                                {canSendWhatsAppMessages && (
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-green-600 hover:text-green-700"
                                    title="Enviar mensagem WhatsApp"
                                    disabled={!entry.patientPhone}
                                    onClick={() => openWhatsAppMonthlyFeeDialog(entry)}
                                    >
                                        <MessageSquareIcon className="h-4 w-4" />
                                    </Button>
                                )}
                                {entry.calculatedStatus === 'Pendente' || entry.calculatedStatus === 'Atrasado' ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-primary hover:text-primary/80"
                                        title="Registrar Pagamento"
                                        onClick={() => handleOpenRegisterMonthlyPaymentDashboardDialog(entry)}
                                    >
                                        <DollarSignIcon className="h-4 w-4" />
                                    </Button>
                                ) : entry.calculatedStatus === 'Pago' ? (
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-orange-500 hover:text-orange-600"
                                        title="Marcar como Pendente"
                                        onClick={() => handleMarkMonthlyFeeAsPending(entry.transactionId, entry.patientId)}
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensalidade pendente/registrada para este mês.</p>
                )}
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
        <DialogContent className="w-[90vw] max-w-md sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Alerta</DialogTitle>
            <DialogDescription>
              Modifique as informações do alerta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAlert}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="editAlertPatientId" className="text-left sm:text-right sm:col-span-1">
                  Paciente*
                </Label>
                <Select
                  value={alertForm.patientId}
                  onValueChange={(value) => handleAlertFormSelectChange('patientId', value)}

                >
                  <SelectTrigger className="col-span-full sm:col-span-3">
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                <Label htmlFor="editAlertReason" className="text-left sm:text-right sm:col-span-1 pt-0 sm:pt-2">
                  Motivo*
                </Label>
                <Textarea
                  id="editAlertReason"
                  value={alertForm.reason}
                  onChange={(e) => handleAlertFormInputChange('reason', e.target.value)}
                  className="col-span-full sm:col-span-3"
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
        <DialogContent className="w-[90vw] max-w-md sm:max-w-lg">
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

      <Dialog open={isWhatsAppMonthlyFeeDialogOpen} onOpenChange={setIsWhatsAppMonthlyFeeDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensagem de Mensalidade</DialogTitle>
            <DialogDescription>
              Enviar para {selectedPatientForWhatsAppMonthlyFee?.patientName}.
              Tel: {selectedPatientForWhatsAppMonthlyFee?.patientPhone || "Não cadastrado"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={whatsAppMonthlyFeeMsgType} onValueChange={(value) => setWhatsAppMonthlyFeeMsgType(value as 'due_soon' | 'overdue' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due_soon" id="rb-mf-due_soon" />
                <Label htmlFor="rb-mf-due_soon">Lembrete Próximo Vencimento</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="overdue" id="rb-mf-overdue" />
                <Label htmlFor="rb-mf-overdue">Aviso de Atraso</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="rb-mf-custom" />
                <Label htmlFor="rb-mf-custom">Personalizada</Label>
              </div>
            </RadioGroup>

            {(whatsAppMonthlyFeeMsgType === 'due_soon' && selectedPatientForWhatsAppMonthlyFee) && (
              <Card className="bg-muted/50"><CardContent className="p-3 text-sm text-muted-foreground">
                <p>
                  Olá {selectedPatientForWhatsAppMonthlyFee.patientName}, tudo bem?
                  {getDaysUntilDue(selectedPatientForWhatsAppMonthlyFee.dueDate) === 0
                    ? ` Sua mensalidade de R$${selectedPatientForWhatsAppMonthlyFee.amount.toFixed(2)} vence hoje. Lembre-se de efetuar o pagamento!`
                    : ` Faltam ${getDaysUntilDue(selectedPatientForWhatsAppMonthlyFee.dueDate)} dia${(getDaysUntilDue(selectedPatientForWhatsAppMonthlyFee.dueDate) || 0) > 1 ? 's' : ''} para o vencimento da sua mensalidade de R$${selectedPatientForWhatsAppMonthlyFee.amount.toFixed(2)}.`
                  }
                </p>
              </CardContent></Card>
            )}
             {(whatsAppMonthlyFeeMsgType === 'overdue' && selectedPatientForWhatsAppMonthlyFee) && (
              <Card className="bg-muted/50"><CardContent className="p-3 text-sm text-muted-foreground">
                <p>Olá {selectedPatientForWhatsAppMonthlyFee.patientName}, tudo bem? Identificamos que sua mensalidade de R$${selectedPatientForWhatsAppMonthlyFee.amount.toFixed(2)}, vencida em ${format(selectedPatientForWhatsAppMonthlyFee.dueDate, 'dd/MM/yyyy', { locale: ptBR })}, está em atraso. Por favor, regularize sua situação.</p>
              </CardContent></Card>
            )}
            {whatsAppMonthlyFeeMsgType === 'custom' && (
              <Textarea
                value={customWhatsAppMonthlyFeeMsg}
                onChange={(e) => setCustomWhatsAppMonthlyFeeMsg(e.target.value)}
                placeholder={`Mensagem para ${selectedPatientForWhatsAppMonthlyFee?.patientName}...`}
                rows={4}
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSendWhatsAppMonthlyFeeMessage} disabled={!selectedPatientForWhatsAppMonthlyFee?.patientPhone}>
              <Send className="mr-2 h-4 w-4" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterMonthlyPaymentDashboardDialogOpen} onOpenChange={(isOpen) => {
          setIsRegisterMonthlyPaymentDashboardDialogOpen(isOpen);
          if (!isOpen) {
              setSelectedPatientForMonthlyPaymentDashboard(null);
              setTransactionFormForDashboardMonthlyFee(initialDashboardMonthlyFeeFormState);
          }
      }}>
          <DialogContent className="w-[90vw] max-w-md sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Registrar Pagamento de Mensalidade</DialogTitle>
              <DialogDescription>Confirme os dados para registrar o pagamento da mensalidade de <strong>{selectedPatientForMonthlyPaymentDashboard?.patientName}</strong>.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveDashboardMonthlyPayment} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="dashMonthlyPaymentDescription" className="text-left sm:text-right sm:col-span-1">Descrição*</Label>
                <Input id="dashMonthlyPaymentDescription" value={transactionFormForDashboardMonthlyFee.description} onChange={(e) => setTransactionFormForDashboardMonthlyFee(prev => ({ ...prev, description: e.target.value }))} className="col-span-full sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="dashMonthlyPaymentAmount" className="text-left sm:text-right sm:col-span-1">Valor (R$)*</Label>
                <Input
                  id="dashMonthlyPaymentAmount"
                  type="number"
                  step="0.01"
                  value={transactionFormForDashboardMonthlyFee.amountString}
                  onChange={(e) => setTransactionFormForDashboardMonthlyFee(prev => ({ ...prev, amountString: e.target.value }))}
                  className="col-span-full sm:col-span-3"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="dashMonthlyPaymentDate" className="text-left sm:text-right sm:col-span-1">Data Pagamento*</Label>
                <Input id="dashMonthlyPaymentDate" type="date" value={transactionFormForDashboardMonthlyFee.date} onChange={(e) => setTransactionFormForDashboardMonthlyFee(prev => ({...prev, date: e.target.value}))} className="col-span-full sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="dashMonthlyPaymentMethod" className="text-left sm:text-right sm:col-span-1">Método*</Label>
                <Select value={transactionFormForDashboardMonthlyFee.paymentMethod} onValueChange={(value) => setTransactionFormForDashboardMonthlyFee(prev => ({...prev, paymentMethod: value as PaymentMethod}))}>
                  <SelectTrigger id="dashMonthlyPaymentMethod" className="col-span-full sm:col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                </Select>
              </div>
               <Input type="hidden" value={transactionFormForDashboardMonthlyFee.status} />
               <Input type="hidden" value={transactionFormForDashboardMonthlyFee.type} />
               <Input type="hidden" value={transactionFormForDashboardMonthlyFee.patientId} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                <Label htmlFor="dashMonthlyPaymentNotes" className="text-left sm:text-right sm:col-span-1 pt-0 sm:pt-2">Observações</Label>
                <Textarea id="dashMonthlyPaymentNotes" value={transactionFormForDashboardMonthlyFee.notes} onChange={(e) => setTransactionFormForDashboardMonthlyFee(prev => ({...prev, notes: e.target.value}))} className="col-span-full sm:col-span-3" rows={2} placeholder="Detalhes adicionais"/>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Registrar Pagamento</Button>
              </DialogFooter>
            </form>
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

