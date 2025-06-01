
'use client';

import React, { useState, useMemo, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
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
  Loader2, 
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
import { User as FirebaseUser, onAuthStateChanged, getAuth } from 'firebase/auth';
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
  nomeEmpresa?: string; 
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

type NewTransactionForm = Omit<FinancialTransaction, 'id' | 'date' | 'ownerId' | 'createdAt' | 'updatedAt' | 'nomeEmpresa'> & { date: string };

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
  const router = useRouter();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
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
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [firebasePatients, setFirebasePatients] = useState<PatientForSelect[]>([]);
  const [isLoadingFirebasePatients, setIsLoadingFirebasePatients] = useState(true);

  const [isDeleteTransactionConfirmOpen, setIsDeleteTransactionConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<FinancialTransaction | null>(null);


  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setCurrentUser(user);
      setIsLoadingPage(true); // Start loading when auth state changes
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const uData = { ...userDocSnap.data(), uid: user.uid };
          setCurrentUserData(uData);
          // Permission check for sub-users
          if (uData.plano === 'Clínica' && uData.cargo !== 'Administrador' && (!uData.permissoes || uData.permissoes.financeiro === false)) {
            toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar a área Financeira.", variant: "destructive" });
            router.push('/dashboard');
            setIsLoadingPage(false);
            return;
          }
        } else {
          setCurrentUserData({ uid: user.uid, plano: "Gratuito" }); // Default if Firestore doc missing
           // If no specific permissions, assume free plan users (who shouldn't be here anyway) can't access
           if (!userDocSnap.exists() || userDocSnap.data()?.plano === "Gratuito") {
             toast({ title: "Acesso Restrito", description: "Esta funcionalidade não está disponível para o seu plano.", variant: "destructive" });
             router.push('/dashboard');
             setIsLoadingPage(false);
             return;
           }
        }
      } else {
        setCurrentUserData(null);
        setTransactions([]);
        setFirebasePatients([]);
        toast({ title: "Sessão Expirada", description: "Faça login para continuar.", variant: "destructive" });
        router.push('/login');
      }
      setIsLoadingPage(false); // Finish loading after auth and data setup
    });
    return () => unsubscribe();
  }, [toast, router]);


  useEffect(() => {
    setClientNow(new Date());
  }, []);

  const fetchFinancialTransactions = useCallback(async (userAuth: FirebaseUser, uData: any) => {
    if (!userAuth || !uData) { 
      setIsLoadingTransactions(false);
      return;
    }
    setIsLoadingTransactions(true);
    try {
      const transactionsRef = collection(db, 'financialTransactions');
      let q;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(transactionsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), orderBy('date', 'desc'));
      } else {
        q = query(transactionsRef, where('ownerId', '==', userAuth.uid), orderBy('date', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: FinancialTransaction[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTransactions.push({
          id: docSnap.id,
          ownerId: data.ownerId,
          nomeEmpresa: data.nomeEmpresa,
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
      toast({ title: "Erro ao Buscar Transações", description: "Não foi possível carregar as transações financeiras.", variant: "destructive" });
      setTransactions([]); // Clear transactions on error
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);

  const fetchPatientsForSelect = useCallback(async (userAuth: FirebaseUser, uData: any) => {
    if (!userAuth || !uData) {
      setIsLoadingFirebasePatients(false);
      return;
    }
    setIsLoadingFirebasePatients(true);
    try {
      const patientsRef = collection(db, 'pacientes');
      let q;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(patientsRef, where('nomeEmpresa', '==', uData.nomeEmpresa), where('status', '==', 'Ativo'), orderBy('name'));
      } else {
        q = query(patientsRef, where('uid', '==', userAuth.uid), where('status', '==', 'Ativo'), orderBy('name'));
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedPatients: PatientForSelect[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedPatients.push({
          id: docSnap.id,
          name: data.name as string,
          slug: data.slug as string,
        });
      });
      setFirebasePatients(fetchedPatients);
    } catch (error: any) {
      console.error("Erro ao buscar pacientes:", error);
      toast({ title: "Erro ao Buscar Pacientes", description: "Não foi possível carregar a lista de pacientes.", variant: "destructive" });
      setFirebasePatients([]);
    } finally {
      setIsLoadingFirebasePatients(false);
    }
  }, [toast]);


  useEffect(() => {
    if (currentUser && currentUserData) {
      fetchFinancialTransactions(currentUser, currentUserData);
      fetchPatientsForSelect(currentUser, currentUserData);
    } else {
      setIsLoadingTransactions(false);
      setIsLoadingFirebasePatients(false);
    }
  }, [currentUser, currentUserData, fetchFinancialTransactions, fetchPatientsForSelect]);

  const getDateRange = (period: PeriodOption, customRange?: DateRange): { start: Date; end: Date } | null => {
    if (!clientNow) return null;
    const today = startOfDay(clientNow);

    switch (period) {
      case 'today':
        return { start: today, end: endOfDay(today) };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: endOfDay(yesterday) };
      case 'last7days':
        return { start: subDays(today, 6), end: endOfDay(today) };
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfDay(today) }; // Changed from endOfMonth(today) to endOfDay(today) to include today's transactions if it's "thisMonth"
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      case 'custom':
        if (customRange?.from && customRange?.to) {
          return { start: startOfDay(customRange.from), end: endOfDay(customRange.to) };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredTransactions = useMemo(() => {
    const range = getDateRange(selectedPeriod, customDateRange);
    if (!range) return transactions; // Or an empty array if no range means no data

    return transactions.filter((transaction) =>
      isWithinInterval(transaction.date, { start: range.start, end: range.end })
    );
  }, [transactions, selectedPeriod, customDateRange, clientNow]);

  const { totalRecebido, totalPendente, totalPrevisto, totalCancelado, chartData } = useMemo(() => {
    let recebido = 0;
    let pendente = 0;
    let cancelado = 0;
    const monthlySummary: { [key: string]: number } = {};

    filteredTransactions.forEach((transaction) => {
      if (transaction.status === 'Recebido') {
        recebido += transaction.amount;
      } else if (transaction.status === 'Pendente') {
        pendente += transaction.amount;
      } else if (transaction.status === 'Cancelado') {
        cancelado += transaction.amount;
      }

      if (transaction.status === 'Recebido') {
        const monthYear = format(transaction.date, 'MMM/yy', { locale: ptBR });
        monthlySummary[monthYear] = (monthlySummary[monthYear] || 0) + transaction.amount;
      }
    });

    const chart = Object.entries(monthlySummary)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => parseISO(a.month.split('/').reverse().join('-')).getTime() - parseISO(b.month.split('/').reverse().join('-')).getTime());


    return {
      totalRecebido: recebido,
      totalPendente: pendente,
      totalPrevisto: recebido + pendente,
      totalCancelado: cancelado,
      chartData: chart,
    };
  }, [filteredTransactions]);

  const handleFormInputChange = (field: keyof NewTransactionForm, value: string | number | boolean) => {
    setTransactionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSelectChange = (field: keyof NewTransactionForm, value: string) => {
     setTransactionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (dateString: string) => {
    setTransactionForm(prev => ({ ...prev, date: dateString }));
  };

  const handleSaveTransaction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !currentUserData) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    const { description, amount, paymentMethod, status, type, date, patientId, notes } = transactionForm;
    
    if (!description || !amount || !paymentMethod || !status || !type || !date ) {
      toast({ title: "Erro de Validação", description: "Descrição, Valor, Data, Método de Pagamento, Status e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }

    if (amount <= 0) {
       toast({ title: "Valor Inválido", description: "O valor da transação deve ser maior que zero.", variant: "destructive" });
       return;
    }
    
    let parsedDate;
    try {
      parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Data inválida");
      }
    } catch {
      toast({ title: "Data Inválida", description: "Por favor, insira uma data válida.", variant: "destructive" });
      return;
    }


    const selectedPatient = firebasePatients.find(p => p.id === patientId);
    const transactionData: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      ownerId: currentUser.uid,
      nomeEmpresa: currentUserData.plano === 'Clínica' ? currentUserData.nomeEmpresa || '' : '',
      date: Timestamp.fromDate(parsedDate) as any, // Cast for Firestore compatibility
      description,
      amount: Number(amount),
      paymentMethod: paymentMethod as PaymentMethod,
      status: status as TransactionStatus,
      type: type as TransactionType,
      notes: notes || '',
      patientId: selectedPatient?.id || '',
      patientName: selectedPatient?.name || '',
    };

    try {
      if (editingTransaction) {
        const transactionRef = doc(db, 'financialTransactions', editingTransaction.id);
        await updateDoc(transactionRef, { ...transactionData, updatedAt: serverTimestamp() });
        toast({ title: "Sucesso!", description: "Transação atualizada.", variant: "success" });
      } else {
        await addDoc(collection(db, 'financialTransactions'), { ...transactionData, createdAt: serverTimestamp() });
        toast({ title: "Sucesso!", description: "Transação adicionada.", variant: "success" });
      }
      
      setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd'), patientId: '' });
      setIsAddTransactionDialogOpen(false);
      setEditingTransaction(null);
      if (currentUser && currentUserData) {
          fetchFinancialTransactions(currentUser, currentUserData);
      }
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast({ title: "Erro", description: "Não foi possível salvar a transação.", variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      description: transaction.description,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      type: transaction.type,
      date: format(transaction.date, 'yyyy-MM-dd'),
      patientId: transaction.patientId || '',
      notes: transaction.notes || '',
    });
    setIsAddTransactionDialogOpen(true);
  };

  const handleOpenDeleteDialog = (transaction: FinancialTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteTransactionConfirmOpen(true);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!transactionToDelete || !currentUser) return;
    try {
      await deleteDoc(doc(db, 'financialTransactions', transactionToDelete.id));
      toast({ title: "Transação Excluída", description: "A transação foi removida com sucesso.", variant: "success" });
      if (currentUser && currentUserData) {
          fetchFinancialTransactions(currentUser, currentUserData);
      }
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir a transação.", variant: "destructive" });
    } finally {
      setIsDeleteTransactionConfirmOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleUpdateTransactionStatus = async (transactionId: string, newStatus: TransactionStatus) => {
    if (!currentUser) return;
    try {
        const transactionRef = doc(db, 'financialTransactions', transactionId);
        await updateDoc(transactionRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        toast({ title: "Status Atualizado", description: `Status da transação alterado para ${newStatus}.`, variant: "success" });
        if (currentUser && currentUserData) {
          fetchFinancialTransactions(currentUser, currentUserData);
        }
    } catch (error) {
        console.error("Erro ao atualizar status da transação:", error);
        toast({ title: "Erro", description: "Não foi possível atualizar o status da transação.", variant: "destructive" });
    }
};


  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'Dinheiro': return <Coins className="h-4 w-4" />;
      case 'Cartão de Crédito': return <CreditCardIcon className="h-4 w-4" />;
      case 'Cartão de Débito': return <CreditCardIcon className="h-4 w-4" />;
      case 'Pix': return <Smartphone className="h-4 w-4" />;
      case 'Boleto': return <ReceiptText className="h-4 w-4" />;
      case 'Transferência': return <Landmark className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case 'Recebido': return 'success';
      case 'Pendente': return 'warning';
      case 'Cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  const isFreePlan = currentUserData?.plano === 'Gratuito';
  const isEssencialPlan = currentUserData?.plano === 'Essencial';

  if (isLoadingPage) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Carregando financeiro...</p></div>;
  }
  
  if (isFreePlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <DollarSign className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          A funcionalidade de Controle Financeiro não está disponível no plano Gratuito.
          Para acessar este recurso e gerenciar suas finanças, por favor, faça upgrade do seu plano.
        </p>
        <Button onClick={() => router.push('/configuracoes?tab=plano')}>Ver Planos e Fazer Upgrade</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
        <Dialog open={isAddTransactionDialogOpen} onOpenChange={(isOpen) => {
            setIsAddTransactionDialogOpen(isOpen);
            if (!isOpen) {
                setEditingTransaction(null);
                setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd'), patientId: ''});
            }
        }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Transação</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação Manual'}</DialogTitle>
              <DialogDescription>Insira os detalhes da transação financeira.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTransaction} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right col-span-1">Descrição*</Label>
                <Input id="description" value={transactionForm.description} onChange={(e) => handleFormInputChange('description', e.target.value)} className="col-span-3" placeholder="Ex: Consulta, Sessão Extra" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right col-span-1">Valor (R$)*</Label>
                <Input id="amount" type="number" step="0.01" value={transactionForm.amount} onChange={(e) => handleFormInputChange('amount', parseFloat(e.target.value) || 0)} className="col-span-3" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right col-span-1">Data*</Label>
                <Input id="date" type="date" value={transactionForm.date} onChange={(e) => handleDateChange(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right col-span-1">Método*</Label>
                <Select value={transactionForm.paymentMethod} onValueChange={(value) => handleFormSelectChange('paymentMethod', value)}>
                  <SelectTrigger id="paymentMethod" className="col-span-3"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right col-span-1">Status*</Label>
                <Select value={transactionForm.status} onValueChange={(value) => handleFormSelectChange('status', value)}>
                  <SelectTrigger id="status" className="col-span-3"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{transactionStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right col-span-1">Tipo*</Label>
                 <Select value={transactionForm.type} onValueChange={(value) => handleFormSelectChange('type', value)} disabled={editingTransaction?.type === 'atendimento'}>
                  <SelectTrigger id="type" className="col-span-3"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{transactionTypes.map(type => <SelectItem key={type} value={type} disabled={editingTransaction?.type === 'atendimento' && type === 'atendimento'}>{type === 'atendimento' ? 'Lançado pela Agenda' : 'Manual'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="patientId" className="text-right col-span-1">Associar Paciente</Label>
                <Select value={transactionForm.patientId} onValueChange={(value) => handleFormSelectChange('patientId', value)} >
                  <SelectTrigger id="patientId" className="col-span-3">
                    <SelectValue placeholder="Selecione o paciente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                     {isLoadingFirebasePatients ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : firebasePatients.length === 0 ? <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem> : <> <SelectItem value="">Nenhum</SelectItem> {firebasePatients.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))} </>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right col-span-1 pt-2">Observações</Label>
                <Textarea id="notes" value={transactionForm.notes} onChange={(e) => handleFormInputChange('notes', e.target.value)} className="col-span-3" rows={2} placeholder="Detalhes adicionais sobre a transação"/>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar Transação</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {totalRecebido.toFixed(2)}</div></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {totalPendente.toFixed(2)}</div></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Previsto</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {totalPrevisto.toFixed(2)}</div></CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cancelado</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {totalCancelado.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Transações Financeiras</CardTitle>
              <CardDescription>Visão geral das suas movimentações.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedPeriod} onValueChange={(value) => { setSelectedPeriod(value as PeriodOption); if (value !== 'custom') setCustomDateRange(undefined); }}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                </SelectContent>
              </Select>
              {selectedPeriod === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date-range-picker" variant={"outline"} className={"w-full sm:w-[260px] justify-start text-left font-normal" + (!customDateRange && " text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (customDateRange.to ? (<>{format(customDateRange.from, "LLL dd, y", { locale: ptBR })} - {format(customDateRange.to, "LLL dd, y", { locale: ptBR })}</>) : (format(customDateRange.from, "LLL dd, y"))) : (<span>Selecione o período</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={customDateRange?.from} selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={2} locale={ptBR} /></PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Carregando transações...</p></div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell w-[200px]">Paciente</TableHead>
                    <TableHead className="w-[130px]">Valor (R$)</TableHead>
                    <TableHead className="hidden sm:table-cell w-[150px]">Método</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(transaction.date, 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={transaction.description}>
                        {transaction.description}
                        {transaction.type === 'atendimento' && <Badge variant="outline" className="ml-2 text-xs bg-blue-100 border-blue-300 text-blue-700">Agenda</Badge>}
                      </TableCell>
                       <TableCell className="hidden md:table-cell">
                        {transaction.patientName || <span className="text-muted-foreground italic">N/A</span>}
                       </TableCell>
                      <TableCell className={`font-semibold ${transaction.status === 'Cancelado' ? 'text-destructive line-through' : 'text-foreground'}`}>
                        {transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="flex items-center gap-1.5">
                            {getPaymentMethodIcon(transaction.paymentMethod)} {transaction.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transaction.status)} className="capitalize">{transaction.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(transaction)} disabled={transaction.type === 'atendimento' && editingTransaction?.id !== transaction.id}>
                                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                {transaction.status === 'Pendente' && (
                                    <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(transaction.id, 'Recebido')}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Marcar como Recebido
                                    </DropdownMenuItem>
                                )}
                                {transaction.status === 'Recebido' && (
                                    <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(transaction.id, 'Pendente')}>
                                    <Clock className="mr-2 h-4 w-4 text-orange-500" /> Marcar como Pendente
                                    </DropdownMenuItem>
                                )}
                                {transaction.status !== 'Cancelado' && (
                                    <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(transaction.id, 'Cancelado')} className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" /> Cancelar Transação
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(transaction)} className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Permanentemente
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">Nenhuma transação encontrada para o período selecionado.</p>
          )}
        </CardContent>
      </Card>

      {isEssencialPlan && (
        <Card className="shadow-md bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
              Funcionalidade Limitada no Plano Essencial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700">
            <p>
              No plano <strong>Essencial</strong>, o controle financeiro permite o lançamento e acompanhamento de transações gerais.
              A funcionalidade de <strong>Contas a Receber por Paciente</strong>, com detalhes de pagamentos pendentes, recebidos e atrasados por cada paciente, está disponível nos planos <strong>Profissional</strong> e <strong>Clínica</strong>.
            </p>
            <Button variant="link" className="p-0 h-auto mt-2 text-amber-700 hover:text-amber-800" onClick={() => router.push('/configuracoes?tab=plano')}>
              Conheça os planos Profissional ou Clínica para mais detalhes.
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Receivables section will only be shown if not on Free or Essencial plan */}
      {!isFreePlan && !isEssencialPlan && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Contas a Receber Detalhadas (Em Breve)</CardTitle>
            <CardDescription>
              Acompanhe os pagamentos pendentes, recebidos e atrasados de cada paciente.
              Esta funcionalidade está em desenvolvimento e será lançada em breve para os planos Profissional e Clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-16 text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12" />
            <p>Em breve: Lista detalhada de recebíveis por paciente.</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteTransactionConfirmOpen} onOpenChange={setIsDeleteTransactionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente a transação "<strong>{transactionToDelete?.description}</strong>"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteTransaction} className="bg-destructive hover:bg-destructive/90">
              Excluir Transação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
