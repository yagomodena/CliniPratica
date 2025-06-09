
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { CalendarCheck, FileText, DollarSign, User, Loader2, AlertTriangle, Eye, Info, ExternalLink } from "lucide-react";
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { format, parseISO, startOfMonth, endOfMonth, isSameMonth, setDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

type HistoryItem = {
  id: string;
  date: string;
  type: string;
  notes: string;
};

type Appointment = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: 'agendado' | 'cancelado' | 'realizado';
  responsibleUserName?: string;
  notes?: string;
};

type PatientData = {
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  history: HistoryItem[];
  objetivoPaciente?: string;
  anamnese?: string;
  hasMonthlyFee?: boolean;
  monthlyFeeAmount?: number;
  monthlyFeeDueDate?: number;
  nomeEmpresa?: string; // To potentially link to professional's portal if needed
};

type MonthlyFeeStatus = {
  status: 'Pago' | 'Pendente' | 'Atrasado' | 'N/A';
  amount?: number;
  dueDateDay?: number;
  paymentDate?: string;
  transactionId?: string;
};


export default function PatientDashboardPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthlyFeeStatus, setMonthlyFeeStatus] = useState<MonthlyFeeStatus>({ status: 'N/A' });
  const [isLoading, setIsLoading] = useState(true);

  const [isHistoryNoteModalOpen, setIsHistoryNoteModalOpen] = useState(false);
  const [selectedHistoryNote, setSelectedHistoryNote] = useState<HistoryItem | null>(null);

  const fetchPatientData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      // Fetch patient document
      const patientDocRef = doc(db, 'pacientes', id);
      const patientDocSnap = await getDoc(patientDocRef);

      if (patientDocSnap.exists()) {
        const data = patientDocSnap.data() as any;
        let uniqueIdCounter = Date.now();
        const processedHistory = (data.history || []).map((histItem: any) => ({
          ...histItem,
          id: histItem.id || `hist-portal-${id}-${uniqueIdCounter++}`
        })).sort((a: HistoryItem, b: HistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setPatientData({
          name: data.name,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar || undefined,
          history: processedHistory,
          objetivoPaciente: data.objetivoPaciente,
          anamnese: data.anamnese,
          hasMonthlyFee: data.hasMonthlyFee,
          monthlyFeeAmount: data.monthlyFeeAmount,
          monthlyFeeDueDate: data.monthlyFeeDueDate,
          nomeEmpresa: data.nomeEmpresa,
        });

        // Fetch appointments
        const apptsRef = collection(db, 'agendamentos');
        const apptsQuery = query(
          apptsRef,
          where('patientId', '==', id),
          orderBy('date', 'desc'),
          orderBy('time', 'desc')
        );
        const apptsSnapshot = await getDocs(apptsQuery);
        const fetchedAppointments: Appointment[] = [];
        apptsSnapshot.forEach(docSnap => {
          const apptData = docSnap.data();
          fetchedAppointments.push({
            id: docSnap.id,
            date: apptData.date,
            time: apptData.time,
            type: apptData.type,
            status: apptData.status as Appointment['status'],
            responsibleUserName: apptData.responsibleUserName,
            notes: apptData.notes,
          });
        });
        setAppointments(fetchedAppointments);

        // Check monthly fee status
        if (data.hasMonthlyFee && data.monthlyFeeAmount && data.monthlyFeeDueDate) {
            const today = new Date();
            const dueDateThisMonth = setDate(today, data.monthlyFeeDueDate);
            
            const finTxRef = collection(db, 'financialTransactions');
            let finTxQuery;

            // Determine whose transactions to query based on whether a professional's company name is set
            if (data.nomeEmpresa) {
                 finTxQuery = query(
                    finTxRef,
                    where('nomeEmpresa', '==', data.nomeEmpresa), // Assuming the clinic admin sets this
                    where('patientId', '==', id),
                    where('type', '==', 'mensalidade_paciente'),
                    where('date', '>=', Timestamp.fromDate(startOfMonth(today))),
                    where('date', '<=', Timestamp.fromDate(endOfMonth(today)))
                );
            } else {
                // This case might be tricky if we don't know the professional's UID
                // For now, we'll assume monthly fees are tied to an ownerId (professional's UID)
                // If the patient document has 'uid' (professional's uid who created patient), use that.
                // This part might need refinement based on how finance is structured.
                // Let's assume the patient document has a `uid` field pointing to the professional.
                 const professionalUid = data.uid; // This field needs to exist on the patient document
                 if (professionalUid) {
                    finTxQuery = query(
                        finTxRef,
                        where('ownerId', '==', professionalUid),
                        where('patientId', '==', id),
                        where('type', '==', 'mensalidade_paciente'),
                        where('date', '>=', Timestamp.fromDate(startOfMonth(today))),
                        where('date', '<=', Timestamp.fromDate(endOfMonth(today)))
                    );
                 } else {
                     console.warn("Professional UID (ownerId) not found on patient document, cannot accurately check monthly fee payment.");
                 }
            }

            let currentFeeStatus: MonthlyFeeStatus = {
              status: 'Pendente',
              amount: data.monthlyFeeAmount,
              dueDateDay: data.monthlyFeeDueDate,
            };

            if(finTxQuery) {
                const paymentSnapshot = await getDocs(finTxQuery);
                const paidTransaction = paymentSnapshot.docs.find(d => d.data().status === 'Recebido');

                if (paidTransaction) {
                    currentFeeStatus.status = 'Pago';
                    currentFeeStatus.paymentDate = format((paidTransaction.data().date as Timestamp).toDate(), 'dd/MM/yyyy');
                    currentFeeStatus.transactionId = paidTransaction.id;
                } else if (isSameMonth(dueDateThisMonth, today) && today > dueDateThisMonth) {
                    currentFeeStatus.status = 'Atrasado';
                }
            }
            setMonthlyFeeStatus(currentFeeStatus);
        } else {
          setMonthlyFeeStatus({ status: 'N/A' });
        }

      } else {
        router.replace('/portal-paciente/login');
      }
    } catch (error) {
      console.error("Erro ao buscar dados do paciente:", error);
      // Optionally, show a toast message here
      router.replace('/portal-paciente/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const id = localStorage.getItem('patientPortalId');
    if (id) {
      setPatientId(id);
      fetchPatientData(id);
    } else {
      router.replace('/portal-paciente/login');
    }
  }, [router, fetchPatientData]);

  const handleOpenHistoryModal = (note: HistoryItem) => {
    setSelectedHistoryNote(note);
    setIsHistoryNoteModalOpen(true);
  };
  
  const formatDate = (dateString: string | undefined, formatStr = 'PPP') => {
    if (!dateString) return 'Data não disponível';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return format(new Date(year, month - 1, day), formatStr, { locale: ptBR });
    } catch {
      try { return format(parseISO(dateString), formatStr, { locale: ptBR }); }
      catch { return dateString; }
    }
  };

  const getAppointmentStatusBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'agendado': return 'default';
      case 'realizado': return 'success';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
    }
  };
  
  const getMonthlyFeeStatusBadgeVariant = (status: MonthlyFeeStatus['status']) => {
    switch (status) {
      case 'Pago': return 'success';
      case 'Pendente': return 'warning';
      case 'Atrasado': return 'destructive';
      default: return 'secondary';
    }
  };


  if (isLoading || !patientData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando suas informações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-accent/80 p-6 text-primary-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
              <AvatarImage src={patientData.avatar || undefined} alt={patientData.name} data-ai-hint="person face" />
              <AvatarFallback className="text-3xl bg-white text-primary">
                {patientData.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-3xl font-bold">{patientData.name}</CardTitle>
              {patientData.email && <CardDescription className="text-blue-100 mt-1">{patientData.email}</CardDescription>}
              {patientData.phone && <CardDescription className="text-blue-100">{patientData.phone}</CardDescription>}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" /> Meus Agendamentos</CardTitle>
            <CardDescription>Seus próximos e últimos agendamentos.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {appointments.length > 0 ? (
              <ul className="space-y-3">
                {appointments.map(appt => (
                  <li key={appt.id} className="p-3 bg-muted/50 rounded-md text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{format(parseISO(appt.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        <p className="text-muted-foreground">{appt.type}</p>
                         {appt.responsibleUserName && <p className="text-xs text-muted-foreground">Profissional: {appt.responsibleUserName}</p>}
                      </div>
                      <Badge variant={getAppointmentStatusBadgeVariant(appt.status)} className="capitalize text-xs">{appt.status}</Badge>
                    </div>
                    {appt.notes && appt.status === 'agendado' && <p className="text-xs text-muted-foreground mt-1 italic">Obs: "{appt.notes}"</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum agendamento encontrado.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary" /> Minha Mensalidade</CardTitle>
            <CardDescription>Status da sua mensalidade para o mês atual.</CardDescription>
          </CardHeader>
          <CardContent>
            {patientData.hasMonthlyFee ? (
              <div className="space-y-2">
                <p className="text-sm"><strong>Valor:</strong> R$ {monthlyFeeStatus.amount?.toFixed(2) || 'N/A'}</p>
                <p className="text-sm"><strong>Vencimento (dia):</strong> {monthlyFeeStatus.dueDateDay?.toString().padStart(2, '0') || 'N/A'}</p>
                <div className="flex items-center gap-2">
                   <p className="text-sm"><strong>Status:</strong></p>
                   <Badge variant={getMonthlyFeeStatusBadgeVariant(monthlyFeeStatus.status)} className="capitalize">{monthlyFeeStatus.status}</Badge>
                </div>
                {monthlyFeeStatus.status === 'Pago' && monthlyFeeStatus.paymentDate && (
                  <p className="text-xs text-muted-foreground">Pago em: {monthlyFeeStatus.paymentDate}</p>
                )}
                 {monthlyFeeStatus.status === 'Atrasado' && (
                   <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive flex items-center gap-2">
                     <AlertTriangle className="h-5 w-5"/>
                     Sua mensalidade está atrasada. Por favor, entre em contato com o profissional.
                   </div>
                 )}
                 {monthlyFeeStatus.status === 'Pendente' && (
                   <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-md text-sm text-warning-foreground flex items-center gap-2">
                     <Info className="h-5 w-5"/>
                     Sua mensalidade está pendente de pagamento.
                   </div>
                 )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Você não possui mensalidade configurada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Minhas Evoluções</CardTitle>
          <CardDescription>Acompanhe seu histórico de atendimentos.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto">
          {patientData.history.length > 0 ? (
            <div className="space-y-4">
              {patientData.history.map((item) => (
                <Card key={item.id} className="bg-muted/30">
                  <CardHeader className="pb-2 flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold">{item.type}</CardTitle>
                        <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenHistoryModal(item)} className="h-8 px-2 text-xs">
                      <Eye className="mr-1 h-3 w-3"/> Ver Detalhes
                    </Button>
                  </CardHeader>
                   <CardContent className="pt-0">
                        <div className="text-sm text-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: item.notes }} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum histórico de atendimento encontrado.</p>
          )}
        </CardContent>
      </Card>

      {patientData.objetivoPaciente && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Objetivo Principal</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{patientData.objetivoPaciente}</p>
            </CardContent>
        </Card>
      )}
      
      {patientData.anamnese && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Anamnese</CardTitle>
                 <CardDescription>Informações de sua anamnese. Atualizadas pelo seu profissional.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="prose prose-sm max-w-none p-3 border rounded-md bg-muted/30 min-h-[100px]" dangerouslySetInnerHTML={{ __html: patientData.anamnese }} />
            </CardContent>
        </Card>
      )}

      <Dialog open={isHistoryNoteModalOpen} onOpenChange={setIsHistoryNoteModalOpen}>
        <DialogContent className="w-[90vw] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Evolução</DialogTitle>
            {selectedHistoryNote && (
              <DialogDescription>
                Informações sobre o registro do seu atendimento.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto text-sm">
            {selectedHistoryNote && (
              <>
                <div className="mb-4 space-y-1 border-b pb-3">
                  <p><strong>Tipo de Atendimento:</strong> {selectedHistoryNote.type || 'Não especificado'}</p>
                  <p><strong>Data do Registro:</strong> {formatDate(selectedHistoryNote.date)}</p>
                </div>
                <h3 className="font-semibold mb-2 text-base">Observações:</h3>
                <div
                  className="history-note-content prose prose-sm sm:prose-base max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedHistoryNote.notes || '<p>Nenhuma observação registrada.</p>' }}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

