
import { subDays, addDays, startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';

export type PaymentMethod = 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto' | 'Transferência' | 'Outro';
export type TransactionStatus = 'Recebido' | 'Pendente' | 'Cancelado';
export type TransactionType = 'atendimento' | 'manual';

export interface FinancialTransaction {
  id: string;
  ownerId: string;
  date: Date;
  description: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string; // Added to link to agenda item
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  type: TransactionType;
  createdAt?: Date;
  updatedAt?: Date;
}

export const paymentMethods: PaymentMethod[] = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto', 'Transferência', 'Outro'];
export const transactionStatuses: TransactionStatus[] = ['Recebido', 'Pendente', 'Cancelado'];
export const transactionTypes: TransactionType[] = ['atendimento', 'manual'];
