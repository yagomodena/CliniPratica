
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users, PlusCircle, CheckCircle, Pencil, X as XIcon, Gift } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, BarChart as RechartsBarChart } from "recharts";
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
import { parseISO, getMonth, getDate, format } from 'date-fns';
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

const weeklyAppointmentsData = [
  { day: "Seg", appointments: 5 },
  { day: "Ter", appointments: 8 },
  { day: "Qua", appointments: 6 },
  { day: "Qui", appointments: 9 },
  { day: "Sex", appointments: 7 },
];

const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
};

const todaysAppointments = [
  { time: "09:00", name: "Ana Silva Pereira de Andrade", slug: "ana-silva" },
  { time: "10:30", name: "Carlos Alberto Souza Junior", slug: "carlos-souza" },
  { time: "14:00", name: "Beatriz Lima", slug: "beatriz-lima" },
  { time: "16:00", name: "Daniel Costa e Silva", slug: "daniel-costa" },
];

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

  const [firebasePatients, setFirebasePatients] = useState<PatientForSelect[]>([]);
  const [isLoadingFirebasePatients, setIsLoadingFirebasePatients] = useState(true);

  const isFreePlan = currentUserPlan === 'Gratuito';
  const monthlyBilling = isFreePlan ? null : 450.80;


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
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAlerts = async (currentUsuario: FirebaseUser) => {
    if (!currentUsuario) return;
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
            if (isNaN(createdAtDate.getTime())) { // Check if parsing resulted in Invalid Date
              console.warn(`Invalid createdAt date format for alert ${docSnap.id}:`, data.createdAt);
              createdAtDate = new Date(); // Fallback to now
            }
          } catch (parseError) {
            console.warn(`Error parsing createdAt for alert ${docSnap.id}:`, data.createdAt, parseError);
            createdAtDate = new Date(); // Fallback to now
          }
        } else {
          console.warn(`Missing or unhandled createdAt type for alert ${docSnap.id}, defaulting to now.`);
          createdAtDate = new Date(); // Fallback if createdAt is missing or type not handled
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
      console.error("Erro ao buscar alertas:", error);
      let description = "Não foi possível carregar os alertas.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada ao buscar alertas. Verifique as regras de segurança do Firestore.";
      } else if (error.code === 'failed-precondition') {
        description = "Falha ao buscar alertas. Provavelmente falta um índice no Firestore. Verifique o console do Firebase para um link para criá-lo (geralmente para 'uid' e 'createdAt' na coleção 'alertas').";
      }
      toast({ title: "Erro ao buscar alertas", description, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (usuario) {
      const fetchPatientsAndAlerts = async () => {
        setIsLoadingFirebasePatients(true);
        try {
          // Fetch Patients
          const patientsRef = collection(db, 'pacientes');
          const pq = query(patientsRef, where('uid', '==', usuario.uid), where('status', '==', 'Ativo'));
          const patientsSnapshot = await getDocs(pq);
          const fetchedPatients: PatientForSelect[] = [];
          const fetchedBirthdayPatientsData: PatientForBirthday[] = [];
          const todayDate = new Date();
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

          // Fetch Alerts
          await fetchAlerts(usuario);

        } catch (error) {
          console.error("Erro ao buscar dados do dashboard:", error);
          toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar informações.", variant: "destructive" });
          setFirebasePatients([]);
          setBirthdayPatients([]);
          setAlerts([]);
        } finally {
          setIsLoadingFirebasePatients(false);
        }
      };
      fetchPatientsAndAlerts();
    }
  }, [usuario, toast]);


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
      }
      toast({ title: "Erro", description, variant: "destructive" });
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
            <CardTitle className="text-sm font-medium">Atendimentos da Semana</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <RechartsBarChart data={weeklyAppointmentsData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="appointments" fill="var(--color-appointments)" radius={4} />
                </RechartsBarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Agendados Hoje</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appt, index) => (
                <div key={index} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium shrink-0">{appt.time}</span>
                  <span className="text-muted-foreground truncate flex-1 min-w-0 text-left sm:text-right" title={appt.name}>{appt.name}</span>
                  <Link href={`/pacientes/${appt.slug}`} passHref className="shrink-0">
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
                <p className="text-sm text-muted-foreground text-center py-8">Carregando aniversariantes...</p>
            ) : birthdayPatients.length > 0 ? (
              birthdayPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium truncate flex-1 min-w-0" title={patient.name}>{patient.name}</span>
                  <Link href={`/pacientes/${patient.slug}`} passHref className="shrink-0">
                    <Button variant="ghost" size="sm" className="h-auto p-1 text-primary hover:text-primary/80">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum aniversariante hoje.</p>
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
            ) : monthlyBilling !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {monthlyBilling.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  +5.2% em relação ao mês passado
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
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

