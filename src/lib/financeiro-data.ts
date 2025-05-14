
import { subDays, addDays, startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';

export type PaymentMethod = 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto' | 'Transferência' | 'Outro';
export type TransactionStatus = 'Recebido' | 'Pendente' | 'Cancelado';
export type TransactionType = 'atendimento' | 'manual';

export interface FinancialTransaction {
  id: string;
  date: Date; // For 'atendimento' type, this is typically the appointment/due date. For 'manual', it's the transaction date.
  description: string; // Name of the Patient or manual description
  patientId?: string;
  patientName?: string;
  appointmentId?: string; // Could be used to link directly to an appointment
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  type: TransactionType;
}

const today = new Date();
const yesterday = subDays(today, 1);

export const initialTransactions: FinancialTransaction[] = [
  {
    id: 'ft001',
    date: subDays(today, 2),
    description: 'Consulta Ana Silva',
    patientId: 'p001',
    patientName: 'Ana Silva',
    amount: 150,
    paymentMethod: 'Pix',
    status: 'Recebido',
    notes: 'Sessão de acompanhamento',
    type: 'atendimento',
  },
  {
    id: 'ft002',
    date: subDays(today, 5),
    description: 'Avaliação Carlos Souza',
    patientId: 'p002',
    patientName: 'Carlos Souza',
    amount: 200,
    paymentMethod: 'Cartão de Crédito',
    status: 'Recebido',
    type: 'atendimento',
  },
  {
    id: 'ft003',
    date: subDays(today, 1), // Due yesterday, explicitly set as Pendente to test overdue logic
    description: 'Consulta Beatriz Lima',
    patientId: 'p003',
    patientName: 'Beatriz Lima',
    amount: 150,
    paymentMethod: 'Dinheiro',
    status: 'Pendente', // Will become 'Atrasado' based on date
    type: 'atendimento',
  },
  {
    id: 'ft004',
    date: subDays(startOfMonth(today), 5), // Previous month
    description: 'Consulta Fernanda Oliveira',
    patientId: 'p005',
    patientName: 'Fernanda Oliveira',
    amount: 180,
    paymentMethod: 'Pix',
    status: 'Recebido',
    type: 'atendimento',
  },
  {
    id: 'ft005',
    date: subDays(startOfMonth(today), 10), // Previous month
    description: 'Venda de Ebook Nutrição',
    amount: 49.90,
    paymentMethod: 'Cartão de Crédito',
    status: 'Recebido',
    type: 'manual', // Manual, no patient directly linked for this new table
    notes: 'Receita extra',
  },
  {
    id: 'ft006',
    date: today, // Due today
    description: 'Consulta Daniel Costa',
    patientId: 'p004',
    patientName: 'Daniel Costa',
    amount: 120,
    paymentMethod: 'Boleto',
    status: 'Pendente', // Will remain 'Pendente' if today
    type: 'atendimento',
  },
   {
    id: 'ft007',
    date: startOfDay(yesterday),
    description: 'Sessão Extra Ana Silva (Paga)',
    patientId: 'p001',
    patientName: 'Ana Silva',
    amount: 100,
    paymentMethod: 'Pix',
    status: 'Recebido',
    type: 'atendimento',
  },
  {
    id: 'ft008',
    date: subDays(today, 8),
    description: 'Workshop Online',
    amount: 250,
    paymentMethod: 'Transferência',
    status: 'Recebido',
    type: 'manual',
  },
   {
    id: 'ft009',
    date: subDays(today, 3),
    description: 'Consulta Cancelada - Carlos Souza',
    patientId: 'p002',
    patientName: 'Carlos Souza',
    amount: 0,
    paymentMethod: 'Outro',
    status: 'Cancelado', // Will be filtered out from receivables table
    type: 'atendimento',
    notes: 'Paciente cancelou com antecedência.'
  },
  {
    id: 'ft010',
    date: subDays(today, 10), // Clearly overdue
    description: 'Consulta Pendente Antiga - Ana Silva',
    patientId: 'p001',
    patientName: 'Ana Silva',
    amount: 130,
    paymentMethod: 'Pix', 
    status: 'Pendente', // Will become 'Atrasado'
    type: 'atendimento',
    notes: 'Aguardando pagamento.'
  },
  {
    id: 'ft011',
    date: addDays(today, 5), // Future due date
    description: 'Consulta Agendada Futura - Carlos Souza',
    patientId: 'p002',
    patientName: 'Carlos Souza',
    amount: 160,
    paymentMethod: 'Cartão de Débito',
    status: 'Pendente', // Will remain 'Pendente'
    type: 'atendimento',
  },
  {
    id: 'ft012',
    date: today, // Due today, still pending
    description: 'Consulta Hoje Pendente - Beatriz Lima',
    patientId: 'p003',
    patientName: 'Beatriz Lima',
    amount: 150,
    paymentMethod: 'Dinheiro',
    status: 'Pendente', // Will remain 'Pendente' if today
    type: 'atendimento',
  }
];

export const paymentMethods: PaymentMethod[] = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto', 'Transferência', 'Outro'];
export const transactionStatuses: TransactionStatus[] = ['Recebido', 'Pendente', 'Cancelado'];
export const transactionTypes: TransactionType[] = ['atendimento', 'manual'];

// Placeholder patient data for the select in AddTransactionDialog
export const placeholderPatients = [
  { id: 'p001', name: 'Ana Silva' },
  { id: 'p002', name: 'Carlos Souza' },
  { id: 'p003', name: 'Beatriz Lima' },
  { id: 'p004', name: 'Daniel Costa' },
  { id: 'p005', name: 'Fernanda Oliveira' },
];
