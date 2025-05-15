
'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, BarChart, CalendarCheck, Users, PlusCircle, Trash2, CheckCircle, Pencil, X as XIcon, Gift } from "lucide-react"; // Added XIcon, Gift
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
import { parseISO, getMonth, getDate } from 'date-fns'; // Added date-fns imports

// --- Placeholder Data (Shared between Agenda and Pacientes) ---
// Reusing patient data for alert selection
const initialPatients = [
  { id: 'p001', name: 'Ana Silva', email: 'ana.silva@email.com', phone: '(11) 98765-4321', dob: '1985-03-15', address: 'Rua Exemplo, 123, São Paulo - SP', status: 'Ativo' },
  { id: 'p002', name: 'Carlos Souza', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ', status: 'Ativo' },
  { id: 'p003', name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 99999-8888', dob: new Date().toISOString().slice(0,10), address: 'Praça Modelo, 789, Belo Horizonte - MG', status: 'Ativo' }, // Beatriz's birthday is today for testing
  { id: 'p004', name: 'Daniel Costa', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR', status: 'Inativo' },
  { id: 'p005', name: 'Fernanda Oliveira', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS', status: 'Ativo' },
];
// --- End Placeholder Data ---

// Alert data structure
type Alert = {
  id: string;
  patientId: string;
  patientName: string;
  reason: string;
  createdAt: Date;
  status: 'active' | 'resolved';
};

// New Alert Form structure
type AlertForm = {
    patientId: string;
    reason: string;
}

// Initial alert data (replace static with state)
const initialAlerts: Alert[] = [
    { id: 'a001', patientId: 'p005', patientName: "Fernanda Oliveira", reason: "Retorno agendado para revisão detalhada dos exames e acompanhamento do plano alimentar. Verificar se há necessidade de ajustes na suplementação.", createdAt: new Date(2024, 7, 1), status: 'active' },
    { id: 'a002', patientId: 'p002', patientName: "Carlos Souza", reason: "Verificar resultados de exame e discutir próximos passos do tratamento.", createdAt: new Date(2024, 7, 3), status: 'active' }, // Assuming Carlos is in initialPatients
];

// Placeholder data for charts and appointments
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

// Define plan names (adjust if needed based on your plan data)
type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica';

// Mock plan status (replace with actual logic)
const isFreePlan = true; // This logic determines if the warning card shows
const monthlyBilling = isFreePlan ? null : 450.80; // Example value for paid plan
type PatientForBirthday = typeof initialPatients[0];

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [isNewAlertDialogOpen, setIsNewAlertDialogOpen] = useState(false);
  const [isEditAlertDialogOpen, setIsEditAlertDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [patients] = useState(initialPatients.filter(p => p.status === 'Ativo'));
  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPlanWarningVisible, setIsPlanWarningVisible] = useState(true); // State for plan warning visibility
  const [birthdayPatients, setBirthdayPatients] = useState<PatientForBirthday[]>([]);


  // Assume the current plan is Gratuito based on existing logic for the warning card
  const [currentUserPlan, setCurrentUserPlan] = useState<PlanName>('Gratuito');

  const [alertForm, setAlertForm] = useState<AlertForm>({
    patientId: '',
    reason: '',
  });

  useEffect(() => {
    const todayDate = new Date();
    const currentMonth = getMonth(todayDate); // 0-indexed
    const currentDay = getDate(todayDate);

    const todaysBirthdays = initialPatients.filter(patient => {
      if (!patient.dob) return false;
      try {
        const dobDate = parseISO(patient.dob); // 'yyyy-MM-dd'
        return getMonth(dobDate) === currentMonth && getDate(dobDate) === currentDay;
      } catch (e) {
        console.error("Error parsing DOB for birthday check:", patient.dob, e);
        return false;
      }
    });
    setBirthdayPatients(todaysBirthdays);
  }, []); // Run once on mount

  const handleAlertFormInputChange = (field: keyof AlertForm, value: string) => {
    setAlertForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAlertFormSelectChange = (field: keyof AlertForm, value: string) => {
     setAlertForm(prev => ({ ...prev, [field]: value }));
   };

  const handleAddAlert = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     if (!alertForm.patientId || !alertForm.reason.trim()) {
       toast({
         title: "Erro de Validação",
         description: "Por favor, selecione um paciente e descreva o motivo do alerta.",
         variant: "destructive",
       });
       return;
     }

     const selectedPatient = patients.find(p => p.id === alertForm.patientId);
     if (!selectedPatient) {
         toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
         return;
     }

     const newAlertEntry: Alert = {
       id: `a${Date.now()}`, // Simple unique ID
       patientId: selectedPatient.id,
       patientName: selectedPatient.name,
       reason: alertForm.reason.trim(),
       createdAt: new Date(),
       status: 'active',
     };

     setAlerts(prev => [newAlertEntry, ...prev]); // Add new alert to the beginning

     setAlertForm({ patientId: '', reason: '' }); // Reset form
     setIsNewAlertDialogOpen(false);
     toast({
         title: "Sucesso!",
         description: `Alerta adicionado para ${selectedPatient.name}.`,
         variant: "success",
     });
     console.log("New alert added:", newAlertEntry);
  };

  const handleOpenEditAlert = (alertToEdit: Alert) => {
      setEditingAlert(alertToEdit);
      setAlertForm({ 
          patientId: alertToEdit.patientId,
          reason: alertToEdit.reason,
      });
      setIsEditAlertDialogOpen(true);
  };

  const handleEditAlert = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAlert || !alertForm.patientId || !alertForm.reason.trim()) {
         toast({
             title: "Erro de Validação",
             description: "Por favor, preencha todos os campos.",
             variant: "destructive",
         });
         return;
     }

     const selectedPatient = patients.find(p => p.id === alertForm.patientId);
     if (!selectedPatient) {
         toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
         return;
     }

     setAlerts(prev => prev.map(alert =>
        alert.id === editingAlert.id
            ? { ...alert, patientId: selectedPatient.id, patientName: selectedPatient.name, reason: alertForm.reason.trim() }
            : alert
     ));

     setEditingAlert(null);
     setAlertForm({ patientId: '', reason: '' }); 
     setIsEditAlertDialogOpen(false);
     toast({
         title: "Sucesso!",
         description: "Alerta atualizado com sucesso.",
         variant: "success", 
     });
     console.log("Alert updated:", editingAlert.id);
  };


  const handleResolveAlert = (alertId: string) => {
     setAlerts(prev => prev.filter(alert => alert.id !== alertId));
     toast({
        title: "Alerta Resolvido",
        description: "O alerta foi removido da lista de pendentes.",
     });
  };

   const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

   const handleSelectPlan = (planName: PlanName) => {
    console.log("Updating plan to:", planName);
    setCurrentUserPlan(planName); 
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'active');


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
              Você está no plano gratuito - limite de 10 pacientes ativos.
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
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Novo Alerta">
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
                                {patients.map((patient) => (
                                    <SelectItem key={patient.id} value={patient.id}>
                                        {patient.name}
                                    </SelectItem>
                                ))}
                                {patients.length === 0 && <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>}
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
             {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between text-sm space-x-2 bg-muted/30 p-2 rounded-md">
                   <div className="flex items-start space-x-2 flex-1 min-w-0"> {/* Added min-w-0 here */}
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1 min-w-0"> {/* Added min-w-0 here */}
                          <span className="font-medium">{alert.patientName}: </span>
                          <span className="text-muted-foreground break-words">{alert.reason}</span> {/* Added break-words */}
                      </div>
                   </div>
                   <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:bg-blue-100" onClick={() => handleOpenEditAlert(alert)} title="Editar Alerta">
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:bg-green-100" onClick={() => handleResolveAlert(alert.id)} title="Marcar como resolvido">
                            <CheckCircle className="h-4 w-4"/>
                        </Button>
                   </div>
                </div>
              ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta ativo.</p>
            )}
          </CardContent>
        </Card>

        {/* Aniversariantes do Dia Card */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
               <Gift className="h-4 w-4 text-muted-foreground" />
               Aniversariantes do Dia 🎂
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 max-h-[200px] overflow-y-auto">
            {birthdayPatients.length > 0 ? (
              birthdayPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium truncate flex-1 min-w-0" title={patient.name}>{patient.name}</span>
                  <Link href={`/pacientes/${generateSlug(patient.name)}`} passHref className="shrink-0">
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

        {!isFreePlan && monthlyBilling !== null && (
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
              <span className="text-muted-foreground text-sm">R$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {monthlyBilling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                +5.2% em relação ao mês passado
              </p>
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
                        <Users className="mr-2 h-4 w-4"/> Novo Paciente
                    </Link>
                </Button>
                 <Button variant="outline" asChild className="w-full">
                    <Link href="/agenda?action=novo">
                        <CalendarCheck className="mr-2 h-4 w-4"/> Novo Agendamento
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

        <Dialog open={isEditAlertDialogOpen} onOpenChange={setIsEditAlertDialogOpen}>
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
                        {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                            </SelectItem>
                        ))}
                        {patients.length === 0 && <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>}
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
                    <Button type="button" variant="outline" onClick={() => { setEditingAlert(null); setAlertForm({patientId:'', reason:''}); }}>Cancelar</Button>
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

