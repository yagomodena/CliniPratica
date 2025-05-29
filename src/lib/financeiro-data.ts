
import { subDays, addDays, startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';

export type PaymentMethod = 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto' | 'Transferência' | 'Outro';
export type TransactionStatus = 'Recebido' | 'Pendente' | 'Cancelado';
export type TransactionType = 'atendimento' | 'manual';

// This interface definition is primarily for client-side use after data is fetched and timestamps are converted.
// The Firestore document will store 'date', 'createdAt', 'updatedAt' as Firestore Timestamps.
export interface FinancialTransaction {
  id: string; // Firestore document ID
  ownerId: string; 
  date: Date; // JavaScript Date object
  description: string; 
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  type: TransactionType;
  createdAt?: Date; // JavaScript Date object
  updatedAt?: Date; // JavaScript Date object
}

// initialTransactions is removed as data will come from Firebase.

export const paymentMethods: PaymentMethod[] = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto', 'Transferência', 'Outro'];
export const transactionStatuses: TransactionStatus[] = ['Recebido', 'Pendente', 'Cancelado'];
export const transactionTypes: TransactionType[] = ['atendimento', 'manual'];

// placeholderPatients is removed as real patients will be fetched.

    