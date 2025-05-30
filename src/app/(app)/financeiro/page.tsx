
'use client';

import React, { useState, useMemo, useEffect, useCallback, FormEvent } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  Users,
  Percent,
  TrendingUp,
  PlusCircle,
  Edit2,
  Trash2,
  FileDown,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Landmark,
  Smartphone,
  CreditCardIcon,
  Coins,
  Wallet,
  ReceiptText,
  MoreHorizontal, 
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  differenceInDays,
  isBefore,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged, getAuth } from 'firebase/auth'; // Added getAuth
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';

import {
  paymentMethods,
  transactionStatuses,
  type PaymentMethod,
  type TransactionStatus,
  type TransactionType,
  transactionTypes,
} from '@/lib/financeiro-data';


export interface FinancialTransaction {
  id: string; 
  ownerId: string; 
  date: Date; 
  description: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  type: TransactionType;
  createdAt?: Date; 
  updatedAt?: Date; 
}

type PatientForSelect = {
  id: string; 
  name: string;
  slug: string; 
};


type PeriodOption =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'thisMonth', label: 'Mês Atual' },
  { value: 'lastMonth', label: 'Mês Anterior' },
  { value: 'custom', label: 'Período Personalizado' },
];

type NewTransactionForm = Omit<FinancialTransaction, 'id' | 'date' | 'ownerId' | 'createdAt' | 'updatedAt'> & { date: string };

type ReceivableEntry = {
  id: string;
  patientName?: string;
  description: string;
  dueDate: Date;
  paymentDate?: Date;
  paymentStatusDisplay: 'Pago' | 'Pendente' | 'Atrasado';
  daysOverdue?: number;
  amount: number;
  paymentMethod?: PaymentMethod;
};


export default function FinanceiroPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [transactionForm, setTransactionForm] = useState<Partial<NewTransactionForm>>({
    description: '',
    amount: 0,
    paymentMethod: 'Pix',
    status: 'Recebido',
    type: 'manual',
    date: format(new Date(), 'yyyy-MM-dd'),
    patientId: '', 
  });

  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
  const [firebasePatients, setFirebasePatients] = useState<PatientForSelect[]>([]);
  const [isLoadingFirebasePatients, setIsLoadingFirebasePatients] = useState(true);

  const [isDeleteTransactionConfirmOpen, setIsDeleteTransactionConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<FinancialTransaction | null>(null);


  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserPlan(userDocSnap.data()?.plano || "Gratuito");
        } else {
          setCurrentUserPlan("Gratuito"); // Default if user data not found
        }
      } else {
        setCurrentUserPlan(null);
        setTransactions([]);
        setIsLoadingTransactions(false);
        setFirebasePatients([]);
        setIsLoadingFirebasePatients(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  const fetchFinancialTransactions = useCallback(async (user: FirebaseUser) => {
    if (!user) return;
    setIsLoadingTransactions(true);
    try {
      const transactionsRef = collection(db, 'financialTransactions');
      const q = query(transactionsRef, where('ownerId', '==', user.uid), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: FinancialTransaction[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTransactions.push({
          id: docSnap.id,
          ownerId: data.ownerId,
          date: (data.date as Timestamp).toDate(),
          description: data.description,
          patientId: data.patientId,
          patientName: data.patientName,
          appointmentId: data.appointmentId,
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          status: data.status as TransactionStatus,
          notes: data.notes,
          type: data.type as TransactionType,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
        });
      });
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      console.error("Erro ao buscar transações financeiras:", error);
      let description = "Não foi possível carregar os lançamentos.";
      if (error.code === 'failed-precondition') {
         description = "A consulta requer um índice no Firestore. Verifique o console do Firebase (geralmente para 'ownerId' e 'date' na coleção 'financialTransactions').";
      }
      toast({ title: "Erro nos Lançamentos", description, variant: "destructive" });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);

  const fetchPatientsForSelect = useCallback(async (user: FirebaseUser) => {
    if (!user) return;
    setIsLoadingFirebasePatients(true);
    try {
      const patientsRef = collection(db, 'pacientes');
      const q = query(patientsRef, where('uid', '==', user.uid), where('status', '==', 'Ativo'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedPatients: PatientForSelect[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedPatients.push({
          id: docSnap.id,
          name: docSnap.data().name as string,
          slug: docSnap.data().slug as string,
        });
      });
      setFirebasePatients(fetchedPatients);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      toast({ title: "Erro ao buscar pacientes", description: "Não foi possível carregar a lista de pacientes ativos.", variant: "destructive" });
    } finally {
      setIsLoadingFirebasePatients(false);
    }
  }, [toast]);


  useEffect(() => {
    if (currentUser) {
      fetchFinancialTransactions(currentUser);
      fetchPatientsForSelect(currentUser);
    }
  }, [currentUser, fetchFinancialTransactions, fetchPatientsForSelect]);


  const getDateRangeForPeriod = useCallback((period: PeriodOption, range?: DateRange): { start: Date; end: Date } => {
    const now = clientNow || new Date(); 
    let start: Date, end: Date;

    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case 'last7days':
        start = startOfDay(subDays(now, 6));
        end = endOfDay(now);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        const prevMonth = subMonths(now, 1);
        start = startOfMonth(prevMonth);
        end = endOfMonth(prevMonth);
        break;
      case 'custom':
        if (range?.from && range?.to) {
          start = startOfDay(range.from);
          end = endOfDay(range.to);
        } else if (range?.from) {
          start = startOfDay(range.from);
          end = endOfDay(range.from);
        } else {
          // Fallback to current month if custom range is incomplete
          start = startOfMonth(now); 
          end = endOfMonth(now);
        }
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }
    return { start, end };
  }, [clientNow]);

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(selectedPeriod, customDateRange);
    return transactions.filter((t) => {
        try {
            return isWithinInterval(t.date, { start, end });
        } catch (e) {
            console.error("Error filtering transaction by date", t, e);
            return false;
        }
    });
  }, [transactions, selectedPeriod, customDateRange, getDateRangeForPeriod]);


  const getPreviousPeriodRange = useCallback((currentStart: Date, currentEnd: Date, periodType: PeriodOption): { start: Date; end: Date } => {
    let prevStart: Date, prevEnd: Date;

    switch (periodType) {
      case 'today':
        prevEnd = subDays(currentStart, 1); // Yesterday
        prevStart = startOfDay(prevEnd);
        break;
      case 'yesterday':
        prevEnd = subDays(currentStart, 1); // Day before yesterday
        prevStart = startOfDay(prevEnd);
        break;
      case 'last7days':
        prevEnd = subDays(currentStart, 1);
        prevStart = subDays(prevEnd, 6); // The 7 days before the current 7-day range
        break;
      case 'thisMonth':
        prevStart = startOfMonth(subMonths(currentStart, 1)); // Last month
        prevEnd = endOfMonth(prevStart);
        break;
      case 'lastMonth':
        prevStart = startOfMonth(subMonths(currentStart, 1)); // Month before last month
        prevEnd = endOfMonth(prevStart);
        break;
      case 'custom':
        const diff = differenceInDays(currentEnd, currentStart);
        prevEnd = subDays(currentStart, 1);
        prevStart = subDays(prevEnd, diff);
        break;
      default: // Fallback, should ideally not be reached
        prevStart = startOfMonth(subMonths(currentStart, 1));
        prevEnd = endOfMonth(prevStart);
    }
    return { start: startOfDay(prevStart), end: endOfDay(prevEnd) };
  }, []);


  const summaryData = useMemo(() => {
    const { start: currentPeriodStart, end: currentPeriodEnd } = getDateRangeForPeriod(selectedPeriod, customDateRange);
    
    const currentPeriodTransactions = transactions.filter(t => 
        t.status === 'Recebido' && isWithinInterval(t.date, { start: currentPeriodStart, end: currentPeriodEnd })
    );
    const totalRevenue = currentPeriodTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const paidAppointments = currentPeriodTransactions.filter(t => t.type === 'atendimento').length;
    const revenueFromAppointments = currentPeriodTransactions.filter(t => t.type === 'atendimento').reduce((sum, t) => sum + t.amount, 0);
    const averagePerAppointment = paidAppointments > 0 ? revenueFromAppointments / paidAppointments : 0;

    // Calculate previous period revenue
    const { start: prevPeriodStart, end: prevPeriodEnd } = getPreviousPeriodRange(currentPeriodStart, currentPeriodEnd, selectedPeriod);
    const previousPeriodTransactions = transactions.filter(t =>
        t.status === 'Recebido' && isWithinInterval(t.date, { start: prevPeriodStart, end: prevPeriodEnd })
    );
    const previousPeriodRevenue = previousPeriodTransactions.reduce((sum, t) => sum + t.amount, 0);

    let comparisonPercentage: number | null = null;
    if (previousPeriodRevenue > 0) {
      comparisonPercentage = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    } else if (totalRevenue > 0) {
      comparisonPercentage = 100; // Infinite increase if previous was 0 and current is > 0
    } else if (previousPeriodRevenue === 0 && totalRevenue === 0) {
      comparisonPercentage = 0; // No change
    }
    // If previousPeriodRevenue > 0 and totalRevenue is 0, comparisonPercentage will be -100, which is correct.

    return {
      totalRevenue,
      paidAppointments,
      averagePerAppointment,
      comparisonPercentage,
    };
  }, [transactions, selectedPeriod, customDateRange, getDateRangeForPeriod, getPreviousPeriodRange]);


  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    filteredTransactions.filter(t => t.status === 'Recebido').forEach(t => {
      const dayKey = format(t.date, 'dd/MM');
      dataMap.set(dayKey, (dataMap.get(dayKey) || 0) + t.amount);
    });
    return Array.from(dataMap.entries())
      .map(([name, value]) => ({ name, faturamento: value }))
      .sort((a,b) => {
        const [dayA, monthA] = a.name.split('/').map(Number);
        const [dayB, monthB] = b.name.split('/').map(Number);
        const dateA = new Date(clientNow?.getFullYear() || new Date().getFullYear(), monthA - 1, dayA);
        const dateB = new Date(clientNow?.getFullYear() || new Date().getFullYear(), monthB - 1, dayB);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredTransactions, clientNow]);


  const receivablesData = useMemo(() => {
    if (!clientNow) return [];
    const todayForComparison = startOfDay(clientNow);

    return filteredTransactions
      .filter(t => t.type === 'atendimento' && t.status !== 'Cancelado') 
      .map((t): ReceivableEntry => {
        let paymentStatusDisplay: ReceivableEntry['paymentStatusDisplay'] = 'Pendente';
        let daysOverdue: number | undefined = undefined;
        let paymentDate: Date | undefined = undefined;

        if (t.status === 'Recebido') {
          paymentStatusDisplay = 'Pago';
          paymentDate = t.date; 
        } else if (t.status === 'Pendente') {
          const dueDate = startOfDay(t.date);
          if (isBefore(dueDate, todayForComparison)) {
            paymentStatusDisplay = 'Atrasado';
            daysOverdue = differenceInDays(todayForComparison, dueDate);
          } else {
            paymentStatusDisplay = 'Pendente';
          }
        }

        return {
          id: t.id,
          patientName: t.patientName || 'N/A',
          description: t.description,
          dueDate: t.date,
          paymentDate,
          paymentStatusDisplay,
          daysOverdue,
          amount: t.amount,
          paymentMethod: t.paymentMethod,
        };
      })
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }, [filteredTransactions, clientNow]);


  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTransactionForm((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFormSelectChange = (
    name: keyof NewTransactionForm,
    value: string
  ) => {
    setTransactionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined, fieldName: keyof NewTransactionForm) => {
    if (date) {
      setTransactionForm(prev => ({ ...prev, [fieldName]: format(date, 'yyyy-MM-dd')}));
    }
  }

  const handleSubmitTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    if (!transactionForm.description || transactionForm.amount == undefined || transactionForm.amount <= 0 || !transactionForm.date) {
      toast({ title: 'Erro de Validação', description: 'Descrição, valor e data são obrigatórios.', variant: 'destructive' });
      return;
    }

    const transactionDate = parseISO(transactionForm.date as string);
    const selectedPatient = firebasePatients.find(p => p.id === transactionForm.patientId);

    const transactionDataToSave = {
      ownerId: currentUser.uid,
      date: Timestamp.fromDate(transactionDate),
      description: transactionForm.description!,
      patientId: transactionForm.patientId || null,
      patientName: selectedPatient?.name || (transactionForm.type === 'manual' ? null : transactionForm.patientName),
      appointmentId: transactionForm.appointmentId || null,
      amount: transactionForm.amount!,
      paymentMethod: transactionForm.paymentMethod as PaymentMethod,
      status: transactionForm.status as TransactionStatus,
      notes: transactionForm.notes || '',
      type: transactionForm.type as TransactionType,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingTransaction) {
        const transactionRef = doc(db, 'financialTransactions', editingTransaction.id);
        await updateDoc(transactionRef, transactionDataToSave);
        toast({ title: 'Sucesso!', description: 'Lançamento atualizado.', variant: 'success'});
      } else {
        await addDoc(collection(db, 'financialTransactions'), {
          ...transactionDataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso!', description: 'Novo lançamento adicionado.', variant: 'success'});
      }
      
      setIsAddTransactionDialogOpen(false);
      setEditingTransaction(null);
      setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd'), patientId: '' });
      await fetchFinancialTransactions(currentUser); 
    } catch (error) {
        console.error("Erro ao salvar lançamento:", error);
        toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o lançamento.", variant: "destructive"});
    }
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      ...transaction,
      date: format(transaction.date, 'yyyy-MM-dd'), 
      amount: transaction.amount, 
      patientId: transaction.patientId || '', 
    });
    setIsAddTransactionDialogOpen(true);
  };
  
  const openDeleteTransactionDialog = (transaction: FinancialTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteTransactionConfirmOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!currentUser || !transactionToDelete) return;
    try {
        await deleteDoc(doc(db, 'financialTransactions', transactionToDelete.id));
        toast({ title: 'Lançamento Excluído', description: `O lançamento "${transactionToDelete.description}" foi removido.`, variant: 'destructive' });
        await fetchFinancialTransactions(currentUser); 
    } catch (error) {
        console.error("Erro ao excluir lançamento:", error);
        toast({ title: "Erro ao Excluir", description: "Não foi possível remover o lançamento.", variant: "destructive"});
    } finally {
        setIsDeleteTransactionConfirmOpen(false);
        setTransactionToDelete(null);
    }
  };

  const handleQuickStatusChange = async (transactionId: string, newStatus: TransactionStatus) => {
    if (!currentUser) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    try {
      const transactionRef = doc(db, 'financialTransactions', transactionId);
      await updateDoc(transactionRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Status Atualizado!', description: `Status do lançamento alterado para ${newStatus}.`, variant: 'success'});
      await fetchFinancialTransactions(currentUser);
    } catch (error) {
      console.error("Erro ao atualizar status do lançamento:", error);
      toast({ title: "Erro ao Atualizar Status", description: "Não foi possível atualizar o status do lançamento.", variant: "destructive"});
    }
  };
  
  const handleExportExcel = () => {
    console.log("Exportando dados para Excel (simulado):", filteredTransactions);
    toast({
      title: "Exportar para Excel",
      description: "Funcionalidade de exportação para Excel em desenvolvimento.",
    });
  };

  const getPaymentStatusBadgeVariant = (status: ReceivableEntry['paymentStatusDisplay']) => {
    switch (status) {
      case 'Pago': return 'success';
      case 'Pendente': return 'default';
      case 'Atrasado': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTransactionStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case 'Recebido': return 'success';
      case 'Pendente': return 'warning';
      case 'Cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

   const getPaymentMethodIcon = (method?: PaymentMethod) => {
    if (!method) return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    switch (method) {
      case 'Dinheiro': return <Coins className="h-4 w-4 text-green-600" />;
      case 'Cartão de Crédito':
      case 'Cartão de Débito': return <CreditCardIcon className="h-4 w-4 text-blue-500" />;
      case 'Pix': return <Smartphone className="h-4 w-4 text-sky-500" />;
      case 'Boleto':
      case 'Transferência': return <Landmark className="h-4 w-4 text-purple-500" />;
      default: return <Wallet className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEvolutionTextAndColor = (percentage: number | null): { text: string; colorClass: string } => {
    if (percentage === null) return { text: "Dados Indisponíveis", colorClass: "text-muted-foreground" };
    if (percentage > 5) return { text: "Crescimento Forte", colorClass: "text-green-600" };
    if (percentage > 0) return { text: "Crescimento", colorClass: "text-green-600" };
    if (percentage === 0) return { text: "Estável", colorClass: "text-foreground" };
    if (percentage < -5) return { text: "Redução Significativa", colorClass: "text-red-600" };
    if (percentage < 0) return { text: "Redução", colorClass: "text-red-600" };
    return { text: "Estável", colorClass: "text-foreground" };
  };


  if (!clientNow || isLoadingTransactions || !currentUser || currentUserPlan === null) { // Add currentUserPlan check
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-muted-foreground">Carregando dados financeiros...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">Controle Financeiro</h1>
        {currentUserPlan !== 'Gratuito' && (
          <Dialog open={isAddTransactionDialogOpen} onOpenChange={(isOpen) => {
            setIsAddTransactionDialogOpen(isOpen);
            if (!isOpen) {
              setEditingTransaction(null);
              setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd'), patientId: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'Editar Lançamento' : 'Adicionar Novo Lançamento'}</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do lançamento financeiro.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTransaction} className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="description" className="sm:text-right">Descrição*</Label>
                  <Input id="description" name="description" value={transactionForm.description} onChange={handleFormInputChange} className="col-span-1 sm:col-span-3" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="amount" className="sm:text-right">Valor (R$)*</Label>
                  <Input id="amount" name="amount" type="number" value={transactionForm.amount} onChange={handleFormInputChange} className="col-span-1 sm:col-span-3" required min="0.01" step="0.01" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="date" className="sm:text-right col-span-1">Data*</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                          variant={"outline"}
                          className={`col-span-1 sm:col-span-3 justify-start text-left font-normal w-full ${!transactionForm.date && "text-muted-foreground"}`}
                          >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {transactionForm.date ? format(parseISO(transactionForm.date), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                          mode="single"
                          selected={transactionForm.date ? parseISO(transactionForm.date) : undefined}
                          onSelect={(date) => handleDateChange(date, 'date')}
                          locale={ptBR}
                          initialFocus
                          />
                      </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="paymentMethod" className="sm:text-right">Forma Pgto.*</Label>
                  <Select name="paymentMethod" value={transactionForm.paymentMethod} onValueChange={(value) => handleFormSelectChange('paymentMethod', value)} required>
                    <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="status" className="sm:text-right">Status*</Label>
                  <Select name="status" value={transactionForm.status} onValueChange={(value) => handleFormSelectChange('status', value)} required>
                    <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {transactionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                  <Label htmlFor="type" className="sm:text-right">Tipo*</Label>
                  <Select name="type" value={transactionForm.type} onValueChange={(value) => handleFormSelectChange('type', value as TransactionType)} required>
                    <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="atendimento">Vinculado a Atendimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {transactionForm.type === 'atendimento' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="patientId" className="sm:text-right">Paciente</Label>
                      <Select name="patientId" value={transactionForm.patientId || ''} onValueChange={(value) => handleFormSelectChange('patientId', value)}>
                      <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue placeholder={isLoadingFirebasePatients ? "Carregando..." : "Selecione (opcional)"} /></SelectTrigger>
                      <SelectContent>
                          {isLoadingFirebasePatients ? (
                              <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : firebasePatients.length === 0 ? (
                              <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>
                          ) : (
                            firebasePatients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                          )}
                      </SelectContent>
                      </Select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-x-4 gap-y-2">
                  <Label htmlFor="notes" className="sm:text-right sm:pt-2">Observações</Label>
                  <Textarea id="notes" name="notes" value={transactionForm.notes} onChange={handleFormInputChange} className="col-span-1 sm:col-span-3" rows={3} />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit">{editingTransaction ? 'Salvar Alterações' : 'Adicionar Lançamento'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {currentUserPlan !== 'Gratuito' ? (
        <>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Filtro por Período</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
              <div className="w-full sm:max-w-xs">
                <Label htmlFor="period-select">Selecionar Período</Label>
                <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodOption)}>
                  <SelectTrigger id="period-select" className="w-full">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriod === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end w-full mt-4 sm:mt-0">
                  <div className="flex-1">
                    <Label htmlFor="custom-start-date">Data Inicial</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="custom-start-date" variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customDateRange?.from ? format(customDateRange.from, 'PPP', { locale: ptBR }) : <span>Data inicial</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={customDateRange?.from} onSelect={(date) => setCustomDateRange(prev => ({...prev, from: date }))} locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 mt-2 sm:mt-0">
                    <Label htmlFor="custom-end-date">Data Final</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="custom-end-date" variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customDateRange?.to ? format(customDateRange.to, 'PPP', { locale: ptBR }) : <span>Data final</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={customDateRange?.to} onSelect={(date) => setCustomDateRange(prev => ({...prev, to: date }))} disabled={{ before: customDateRange?.from }} locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Bruto (Recebido)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {summaryData.totalRevenue.toFixed(2)}</div>
                {summaryData.comparisonPercentage !== null ? (
                    <p className={`text-xs ${summaryData.comparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summaryData.comparisonPercentage >= 0 ? '+' : ''}{summaryData.comparisonPercentage.toFixed(1)}% em relação ao período anterior
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">Não há dados do período anterior para comparação.</p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atendimentos Pagos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.paidAppointments}</div>
                <p className="text-xs text-muted-foreground">No período selecionado</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média por Atendimento Pago</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {summaryData.averagePerAppointment.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Considerando atendimentos pagos</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evolução do Faturamento</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getEvolutionTextAndColor(summaryData.comparisonPercentage).colorClass}`}>
                    {getEvolutionTextAndColor(summaryData.comparisonPercentage).text}
                </div>
                {summaryData.comparisonPercentage !== null ? (
                    <p className="text-xs text-muted-foreground">
                        {summaryData.comparisonPercentage >= 0 ? '+' : ''}{summaryData.comparisonPercentage.toFixed(1)}% em relação ao período anterior
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">Não há dados do período anterior.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Gráfico de Faturamento no Período</CardTitle>
              <CardDescription>Evolução do faturamento (status Recebido) por dia no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ faturamento: { label: 'Faturamento (R$)', color: 'hsl(var(--primary))' } }} className="h-[300px] w-full">
                <ResponsiveContainer>
                  <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {currentUserPlan !== 'Essencial' && (
            <Card className="shadow-md">
                <CardHeader>
                <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Contas a Receber por Paciente</CardTitle>
                <CardDescription>Status de pagamento dos atendimentos no período selecionado.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Data Pgto.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Dias Atraso</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                        <TableHead className="text-center">Forma Pgto.</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {receivablesData.length > 0 ? (
                        receivablesData.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.patientName}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{format(item.dueDate, 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{item.paymentDate ? format(item.paymentDate, 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell>
                            <Badge variant={getPaymentStatusBadgeVariant(item.paymentStatusDisplay)} className="capitalize text-xs whitespace-nowrap">
                                {item.paymentStatusDisplay === 'Pago' && <CheckCircle className="mr-1 h-3 w-3" />}
                                {item.paymentStatusDisplay === 'Pendente' && <Clock className="mr-1 h-3 w-3" />}
                                {item.paymentStatusDisplay === 'Atrasado' && <AlertTriangle className="mr-1 h-3 w-3" />}
                                {item.paymentStatusDisplay}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                            {item.paymentStatusDisplay === 'Atrasado' && item.daysOverdue !== undefined && item.daysOverdue > 0
                                ? <span className="text-destructive font-medium">{item.daysOverdue}</span>
                                : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${item.paymentStatusDisplay === 'Atrasado' ? 'text-destructive' : item.paymentStatusDisplay === 'Pago' ? 'text-green-600' : ''}`}>
                            {item.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                {getPaymentMethodIcon(item.paymentMethod)}
                                <span className="text-xs text-muted-foreground">{item.paymentMethod || '-'}</span>
                            </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                            Nenhum atendimento com pendência ou pago encontrado para o período selecionado.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          )}


          <Card className="shadow-md">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                    <CardTitle>Todos os Lançamentos Financeiros</CardTitle>
                    <CardDescription>Lista de todas as transações (incluindo manuais) no período selecionado.</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportExcel} className="w-full mt-2 sm:mt-0 sm:w-auto">
                    <FileDown className="mr-2 h-4 w-4" /> Exportar Excel (Em breve)
                </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Valor (R$)</TableHead>
                    <TableHead>Forma Pgto.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(t.date, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          {t.description}
                          {t.notes && <p className="text-xs text-muted-foreground italic mt-1">"{t.notes}"</p>}
                        </TableCell>
                        <TableCell>{t.patientName || '-'}</TableCell>
                        <TableCell className={`font-medium ${t.status === 'Cancelado' ? 'text-muted-foreground line-through' : (t.status === 'Pendente' ? 'text-orange-600' : 'text-green-600')}`}>
                          {t.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1">
                            {getPaymentMethodIcon(t.paymentMethod)}
                            <span className="text-xs">{t.paymentMethod}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTransactionStatusBadgeVariant(t.status)} className="capitalize text-xs whitespace-nowrap">
                              {t.status === 'Recebido' && <CheckCircle className="mr-1 h-3 w-3" />}
                              {t.status === 'Pendente' && <Clock className="mr-1 h-3 w-3" />}
                              {t.status === 'Cancelado' && <XCircle className="mr-1 h-3 w-3" />}
                              {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Mais ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTransaction(t)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteTransactionDialog(t)} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {t.status === 'Pendente' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleQuickStatusChange(t.id, 'Recebido')}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    Marcar como Recebido
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickStatusChange(t.id, 'Cancelado')}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    Marcar como Cancelado
                                  </DropdownMenuItem>
                                </>
                              )}
                              {t.status === 'Recebido' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleQuickStatusChange(t.id, 'Pendente')}>
                                    <Clock className="mr-2 h-4 w-4 text-orange-500" />
                                    Marcar como Pendente
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickStatusChange(t.id, 'Cancelado')}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    Marcar como Cancelado
                                  </DropdownMenuItem>
                                </>
                              )}
                              {t.status === 'Cancelado' && (
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(t.id, 'Pendente')}>
                                  <Clock className="mr-2 h-4 w-4 text-orange-500" />
                                  Marcar como Pendente
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        {isLoadingTransactions ? "Carregando lançamentos..." : "Nenhum lançamento encontrado para o período selecionado."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Acesso Restrito</CardTitle>
            <CardDescription>
              A funcionalidade completa de Controle Financeiro está disponível nos planos Essencial, Profissional e Clínica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Com o plano Gratuito, você tem acesso limitado a esta seção.</p>
            <Button className="mt-4" onClick={() => console.log("Redirecionar para página de planos")}>
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={isDeleteTransactionConfirmOpen} onOpenChange={setIsDeleteTransactionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento "<strong>{transactionToDelete?.description}</strong>" no valor de R$ {transactionToDelete?.amount.toFixed(2)}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setTransactionToDelete(null); setIsDeleteTransactionConfirmOpen(false); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTransaction} className="bg-destructive hover:bg-destructive/90">
              Excluir Lançamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

