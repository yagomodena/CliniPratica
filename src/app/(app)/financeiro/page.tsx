
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  BarChartBig,
  PlusCircle,
  Edit2,
  Trash2,
  FileDown,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock, // Changed from CircleHelp for Pending
  AlertTriangle, // For Overdue status
  Landmark,
  Smartphone,
  CreditCardIcon,
  Coins, 
  Wallet, // Generic for 'Outro' payment method
  ReceiptText, // Icon for the new table
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Line, LineChart } from 'recharts';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  differenceInDays, // Added for overdue calculation
  isBefore, // Added for overdue calculation
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import {
  initialTransactions,
  placeholderPatients,
  paymentMethods,
  transactionStatuses,
  type FinancialTransaction,
  type PaymentMethod,
  type TransactionStatus,
  type TransactionType,
} from '@/lib/financeiro-data';
import { Badge } from '@/components/ui/badge';

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

type NewTransactionForm = Omit<FinancialTransaction, 'id' | 'date'> & { date: string };

// Type for the new "Contas a Receber" table data
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
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(initialTransactions);
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
  });

  const [clientNow, setClientNow] = useState<Date | null>(null);
  useEffect(() => {
    setClientNow(new Date());
  }, []);


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
        }
         else {
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
    return transactions.filter((t) => isWithinInterval(t.date, { start, end }));
  }, [transactions, selectedPeriod, customDateRange, getDateRangeForPeriod]);

  const summaryData = useMemo(() => {
    const receivedTransactions = filteredTransactions.filter(t => t.status === 'Recebido');
    const totalRevenue = receivedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const paidAppointments = receivedTransactions.filter(t => t.type === 'atendimento' && t.status === 'Recebido').length;
    const revenueFromAppointments = receivedTransactions.filter(t => t.type === 'atendimento').reduce((sum, t) => sum + t.amount, 0);
    const averagePerAppointment = paidAppointments > 0 ? revenueFromAppointments / paidAppointments : 0; 
    const comparisonPercentage = Math.random() > 0.5 ? 15 : -5; 

    return {
      totalRevenue,
      paidAppointments,
      averagePerAppointment,
      comparisonPercentage,
    };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    filteredTransactions.filter(t => t.status === 'Recebido').forEach(t => {
      const dayKey = format(t.date, 'dd/MM');
      dataMap.set(dayKey, (dataMap.get(dayKey) || 0) + t.amount);
    });
    return Array.from(dataMap.entries()).map(([name, value]) => ({ name, faturamento: value })).sort((a,b) => parseISO(a.name.split('/').reverse().join('-')).getTime() - parseISO(b.name.split('/').reverse().join('-')).getTime());
  }, [filteredTransactions]);

  const receivablesData = useMemo(() => {
    if (!clientNow) return [];
    const todayForComparison = startOfDay(clientNow);

    return filteredTransactions
      .filter(t => t.type === 'atendimento' && t.status !== 'Cancelado') // Focus on patient receivables
      .map((t): ReceivableEntry => {
        let paymentStatusDisplay: ReceivableEntry['paymentStatusDisplay'] = 'Pendente';
        let daysOverdue: number | undefined = undefined;
        let paymentDate: Date | undefined = undefined;

        if (t.status === 'Recebido') {
          paymentStatusDisplay = 'Pago';
          paymentDate = t.date; // Assuming payment date is the transaction date for received items
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
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()); // Sort by due date descending
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

  const handleSubmitTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transactionForm.description || transactionForm.amount <= 0 || !transactionForm.date) {
      toast({ title: 'Erro de Validação', description: 'Descrição, valor e data são obrigatórios.', variant: 'destructive' });
      return;
    }

    const transactionDate = parseISO(transactionForm.date as string);

    const newTransaction: FinancialTransaction = {
      id: editingTransaction ? editingTransaction.id : `ft-${Date.now()}`,
      date: transactionDate,
      description: transactionForm.description!,
      patientId: transactionForm.patientId,
      patientName: placeholderPatients.find(p => p.id === transactionForm.patientId)?.name,
      amount: transactionForm.amount!,
      paymentMethod: transactionForm.paymentMethod as PaymentMethod,
      status: transactionForm.status as TransactionStatus,
      notes: transactionForm.notes,
      type: transactionForm.type as TransactionType
    };

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? newTransaction : t));
      toast({ title: 'Sucesso!', description: 'Lançamento atualizado.', variant: 'success'});
    } else {
      setTransactions(prev => [newTransaction, ...prev].sort((a,b) => b.date.getTime() - a.date.getTime()));
      toast({ title: 'Sucesso!', description: 'Novo lançamento adicionado.', variant: 'success'});
    }
    
    setIsAddTransactionDialogOpen(false);
    setEditingTransaction(null);
    setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      ...transaction,
      date: format(transaction.date, 'yyyy-MM-dd'),
      amount: transaction.amount, 
    });
    setIsAddTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    toast({ title: 'Lançamento Excluído', description: 'O lançamento foi removido.', variant: 'destructive' });
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
      case 'Pendente': return 'default'; // Using default for pending, can customize
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


  if (!clientNow) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-muted-foreground">Carregando dados financeiros...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Controle Financeiro</h1>
        <Dialog open={isAddTransactionDialogOpen} onOpenChange={(isOpen) => {
          setIsAddTransactionDialogOpen(isOpen);
          if (!isOpen) {
            setEditingTransaction(null);
            setTransactionForm({ description: '', amount: 0, paymentMethod: 'Pix', status: 'Recebido', type: 'manual', date: format(new Date(), 'yyyy-MM-dd') });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Descrição*</Label>
                <Input id="description" name="description" value={transactionForm.description} onChange={handleFormInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Valor (R$)*</Label>
                <Input id="amount" name="amount" type="number" value={transactionForm.amount} onChange={handleFormInputChange} className="col-span-3" required min="0.01" step="0.01" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Data*</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={`col-span-3 justify-start text-left font-normal ${!transactionForm.date && "text-muted-foreground"}`}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {transactionForm.date ? format(parseISO(transactionForm.date), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={transactionForm.date ? parseISO(transactionForm.date) : undefined}
                        onSelect={(date) => handleDateChange(date, 'date')}
                        initialFocus
                        locale={ptBR}
                        />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Forma Pgto.*</Label>
                <Select name="paymentMethod" value={transactionForm.paymentMethod} onValueChange={(value) => handleFormSelectChange('paymentMethod', value)} required>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status*</Label>
                <Select name="status" value={transactionForm.status} onValueChange={(value) => handleFormSelectChange('status', value)} required>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {transactionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Tipo*</Label>
                <Select name="type" value={transactionForm.type} onValueChange={(value) => handleFormSelectChange('type', value as TransactionType)} required>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="atendimento">Vinculado a Atendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {transactionForm.type === 'atendimento' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="patientId" className="text-right">Paciente</Label>
                    <Select name="patientId" value={transactionForm.patientId} onValueChange={(value) => handleFormSelectChange('patientId', value)}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                        {placeholderPatients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">Observações</Label>
                <Textarea id="notes" name="notes" value={transactionForm.notes} onChange={handleFormInputChange} className="col-span-3" rows={3} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">{editingTransaction ? 'Salvar Alterações' : 'Adicionar Lançamento'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Filtro por Período</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 sm:max-w-xs">
            <Label htmlFor="period-select">Selecionar Período</Label>
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodOption)}>
              <SelectTrigger id="period-select">
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
            <div className="flex flex-col sm:flex-row gap-2 items-end w-full sm:w-auto">
              <div>
                <Label htmlFor="custom-start-date">Data Inicial</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="custom-start-date" variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDateRange?.from ? format(customDateRange.from, 'PPP', { locale: ptBR }) : <span>Data inicial</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={customDateRange?.from} onSelect={(date) => setCustomDateRange(prev => ({...prev, from: date }))} locale={ptBR} />
                    </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="custom-end-date">Data Final</Label>
                <Popover>
                    <PopoverTrigger asChild>
                         <Button id="custom-end-date" variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDateRange?.to ? format(customDateRange.to, 'PPP', { locale: ptBR }) : <span>Data final</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
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
            <p className={`text-xs ${summaryData.comparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summaryData.comparisonPercentage >= 0 ? '+' : ''}{summaryData.comparisonPercentage}% em relação ao período anterior
            </p>
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
            <div className="text-2xl font-bold text-green-600">Positiva</div>
            <p className="text-xs text-muted-foreground">Comparado ao período anterior (simulado)</p>
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
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Nova Tabela: Contas a Receber por Paciente */}
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


      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Todos os Lançamentos Financeiros</CardTitle>
                <CardDescription>Lista de todas as transações (incluindo manuais) no período selecionado.</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportExcel}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar Excel (Em breve)
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
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
                      <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(t)} title="Editar Lançamento">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)} title="Excluir Lançamento" className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Nenhum lançamento encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

