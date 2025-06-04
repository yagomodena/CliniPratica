
'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Newspaper, KeyRound, Save, AlertTriangle, UserPlus, UsersRound, Edit, Trash2, Eye, EyeOff, ListChecks, Loader2, ExternalLink, Info } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { PlansModal } from '@/components/sections/plans-modal';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { UserForm, type UserFormData, type User, menuItemsConfig } from '@/components/forms/user-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { auth, db, firebaseConfig } from '@/firebase';
import { User as FirebaseUser, updateProfile as updateAuthProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, onAuthStateChanged } from 'firebase/auth';
import { collection, setDoc, getDoc, doc, serverTimestamp, updateDoc, deleteDoc, query, where, getDocs, orderBy, Timestamp, onSnapshot, Unsubscribe } from "firebase/firestore";

import { initializeApp as initializeSecondaryApp, deleteApp as deleteSecondaryApp } from "firebase/app";
import {
  getAuth as getAuthForSecondaryInstance,
  createUserWithEmailAndPassword as createUserInSecondaryInstance,
  updateProfile
} from "firebase/auth";
import { plans as allPlansData, type Plan as PlanType } from '@/lib/plans-data';
import { format } from 'date-fns';


type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica';

type UpdateEntry = {
  version: string;
  date: string;
  title: string;
  description: string;
  details?: string[];
};

const initialUpdates: UpdateEntry[] = [
  {
    version: '1.0.0',
    date: new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }),
    title: 'Lançamento Oficial do Sistema CliniPrática!',
    description: 'Bem-vindo à primeira versão do CliniPrática! Estamos entusiasmados em apresentar uma plataforma completa para otimizar a gestão do seu consultório e atendimentos.',
    details: [
      'Cadastro e gerenciamento de pacientes com prontuário detalhado e objetivos personalizáveis.',
      'Agenda inteligente com agendamentos, visualização diária e tipos de atendimento personalizáveis.',
      'Módulo financeiro para controle de lançamentos e visualização de faturamento.',
      'Relatórios de atendimentos, novos pacientes, e status de pacientes (ativos/inativos).',
      'Gestão de perfil e configuração de planos.',
      'Funcionalidade "Esqueci minha senha".',
      'Criação de conta simplificada com seleção de plano.',
    ],
  },
];

type ProfileState = {
    nomeCompleto: string;
    email: string;
    telefone: string;
    areaAtuacao: string;
    plano: string;
    fotoPerfilUrl: string;
    nomeEmpresa: string;
    mercadoPagoSubscriptionId: string;
    mercadoPagoSubscriptionStatus: string;
    mercadoPagoPreapprovalPlanId: string;
    mercadoPagoNextPaymentDate: Timestamp | null;
    statusCobranca: string; // Added statusCobranca
};


export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<ProfileState>({
    nomeCompleto: '',
    email: '',
    telefone: '',
    areaAtuacao: '',
    plano: '',
    fotoPerfilUrl: '',
    nomeEmpresa: '',
    mercadoPagoSubscriptionId: '',
    mercadoPagoSubscriptionStatus: '',
    mercadoPagoPreapprovalPlanId: '',
    mercadoPagoNextPaymentDate: null as Timestamp | null,
    statusCobranca: '', // Initialized statusCobranca
  });

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);


  useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (userAuth) => {
      setCurrentUser(userAuth);
      if (unsubscribeFirestore) {
        unsubscribeFirestore(); // Clean up previous listener
      }
      if (userAuth) {
        const userDocRef = doc(db, 'usuarios', userAuth.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (userDocSnap) => { // Listen for real-time updates
          let data: any = {};
          if (userDocSnap.exists()) {
            data = userDocSnap.data();
            setCurrentUserData({ ...data, uid: userAuth.uid });
          } else {
            setCurrentUserData({ uid: userAuth.uid, email: userAuth.email, nomeCompleto: userAuth.displayName, plano: 'Gratuito', permissoes: {}, statusCobranca: 'ativo' });
          }

          setProfile({
            nomeCompleto: userAuth.displayName || data.nomeCompleto || '',
            email: userAuth.email || data.email || '',
            telefone: data.telefone || userAuth.phoneNumber || '',
            areaAtuacao: data.areaAtuacao || '',
            plano: data.plano || 'Gratuito',
            statusCobranca: data.statusCobranca || 'ativo', // Set statusCobranca
            fotoPerfilUrl: userAuth.photoURL || data.fotoPerfilUrl || '',
            nomeEmpresa: data.nomeEmpresa || '',
            mercadoPagoSubscriptionId: data.mercadoPagoSubscriptionId || '',
            mercadoPagoSubscriptionStatus: data.mercadoPagoSubscriptionStatus || '',
            mercadoPagoPreapprovalPlanId: data.mercadoPagoPreapprovalPlanId || '',
            mercadoPagoNextPaymentDate: data.mercadoPagoNextPaymentDate || null,
          });
        });
      } else {
        setCurrentUser(null);
        setCurrentUserData(null);
        setProfile({
            nomeCompleto: '', email: '', telefone: '', areaAtuacao: '', plano: 'Gratuito', fotoPerfilUrl: '', nomeEmpresa: '',
            mercadoPagoSubscriptionId: '', mercadoPagoSubscriptionStatus: '', mercadoPagoPreapprovalPlanId: '', mercadoPagoNextPaymentDate: null, statusCobranca: ''
        });
        setUsers([]);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);


  const fetchClinicUsers = useCallback(async () => {
    if (currentUserData?.plano !== 'Clínica' || !profile.nomeEmpresa || !auth.currentUser) {
      setUsers([]);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where('nomeEmpresa', '==', profile.nomeEmpresa), where('email', '!=', auth.currentUser.email), orderBy('nomeCompleto'));
      const querySnapshot = await getDocs(q);
      const clinicUsers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        clinicUsers.push({
          id: docSnap.id,
          nomeCompleto: data.nomeCompleto || '',
          email: data.email || '',
          cargo: data.cargo || '',
          permissoes: data.permissoes || {},
          areaAtuacao: data.areaAtuacao || '',
          criadoEm: data.criadoEm?.toDate()?.toISOString() || new Date().toISOString(),
          fotoPerfilUrl: data.fotoPerfilUrl || '',
          nomeEmpresa: data.nomeEmpresa || '',
          plano: data.plano || '',
          telefone: data.telefone || '',
        });
      });
      setUsers(clinicUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários da clínica:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os usuários da clínica.", variant: "destructive" });
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUserData?.plano, profile.nomeEmpresa, toast]);


  useEffect(() => {
    if (currentUserData?.plano === 'Clínica' && profile.nomeEmpresa) {
      fetchClinicUsers();
    }
  }, [currentUserData?.plano, profile.nomeEmpresa, fetchClinicUsers]);


  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    if (!currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive"});
      return;
    }
    try {
      await updateAuthProfile(currentUser, {
        displayName: profile.nomeCompleto,
        photoURL: profile.fotoPerfilUrl,
      });

      const userDocRef = doc(db, "usuarios", currentUser.uid);
      const dataToUpdate: any = {
        nomeCompleto: profile.nomeCompleto,
        telefone: profile.telefone,
        areaAtuacao: profile.areaAtuacao,
        fotoPerfilUrl: profile.fotoPerfilUrl,
        nomeEmpresa: profile.nomeEmpresa,
        // statusCobranca is managed by webhooks, not user profile edits
      };

      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);
      await updateDoc(userDocRef, dataToUpdate );

      // No need to update setCurrentUserData here if using onSnapshot, it will update automatically.
      // setCurrentUserData((prev: any) => ({...prev, ...dataToUpdate}));

      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado.", variant: "success"});
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast({ title: "Erro", description: "Ocorreu um erro ao salvar.", variant: "destructive"});
    }
  };

  const handleChangePhoto = () => {
    toast({ title: "Funcionalidade Indisponível", description: "A alteração de foto ainda não está implementada.", variant: "default"});
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Campos Obrigatórios", description: "Preencha todos os campos de senha.", variant: "destructive" });
      setIsChangingPassword(false); return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Erro de Validação", description: "A nova senha e a confirmação não coincidem.", variant: "destructive" });
      setIsChangingPassword(false); return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha Fraca", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      setIsChangingPassword(false); return;
    }
    if (!currentUser || !currentUser.email) {
      toast({ title: "Erro", description: "Usuário não autenticado ou e-mail não encontrado.", variant: "destructive" });
      setIsChangingPassword(false); return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast({ title: "Sucesso!", description: "Senha alterada com sucesso.", variant: "success" });
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (error: any) {
      let message = "Ocorreu um erro ao tentar alterar sua senha.";
      if (error.code === 'auth/wrong-password') message = "A senha atual informada está incorreta.";
      else if (error.code === 'auth/weak-password') message = "A nova senha é muito fraca.";
      else if (error.code === 'auth/too-many-requests') message = "Muitas tentativas. Tente novamente mais tarde.";
      toast({ title: "Erro ao Alterar Senha", description: message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const handleSelectPlan = (newPlanName: string, mercadoPagoPlanId: string | null) => {
    if (!currentUser || !currentUser.email) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    if (newPlanName === 'Gratuito') {
      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        updateDoc(userDocRef, {
          plano: "Gratuito",
          mercadoPagoSubscriptionId: null,
          mercadoPagoPreapprovalPlanId: null,
          mercadoPagoSubscriptionStatus: 'cancelled_locally',
          mercadoPagoNextPaymentDate: null,
          statusCobranca: 'ativo', // Reset billing status to active for free plan
        });
        // State updates will be handled by onSnapshot
        toast({ title: "Plano Alterado!", description: `Seu plano foi alterado para Gratuito. Se você tinha uma assinatura ativa, gerencie-a no Mercado Pago.`, variant: "success" });
      } catch (error) {
        console.error("Erro ao atualizar plano para Gratuito no Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível atualizar o plano para Gratuito.", variant: "destructive" });
      }
    } else if (mercadoPagoPlanId) {
      const planDetails = allPlansData.find(p => p.mercadoPagoPreapprovalPlanId === mercadoPagoPlanId);
      if (planDetails?.mercadoPagoPreapprovalPlanId) {
         let mpLink = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${mercadoPagoPlanId}`;
         mpLink += `&external_reference=${encodeURIComponent(currentUser.uid)}`;
         if (currentUser.email) {
          mpLink += `&payer_email=${encodeURIComponent(currentUser.email)}`;
         }
         window.location.href = mpLink;
      } else {
        toast({ title: "Erro", description: "Link de assinatura do Mercado Pago não encontrado.", variant: "destructive" });
      }
    }
    setIsPlansModalOpen(false);
  };


  const handleCancelSubscription = async () => {
    if (!currentUser || !currentUser.email) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive"});
      setIsCancelConfirmOpen(false); return;
    }
    try {
      const userDocRef = doc(db, "usuarios", currentUser.uid);
      await updateDoc(userDocRef, {
        plano: "Gratuito",
        mercadoPagoSubscriptionStatus: 'cancelled_by_user', // Or a more specific MP status if their API returns one for cancellation intent
        statusCobranca: 'ativo', // Reset billing status, user will be on free plan. MP webhook will update if it becomes fully 'cancelled'
      });
      // State updates handled by onSnapshot
      setIsCancelConfirmOpen(false);
      toast({
        title: "Assinatura Marcada para Cancelamento",
        description: "Seu plano foi alterado para Gratuito em nosso sistema. Por favor, gerencie sua assinatura diretamente no Mercado Pago para efetivar o cancelamento com a operadora de pagamento ou aguarde o final do período de cobrança.",
        variant: "default",
        duration: 9000,
      });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar seu plano localmente. Verifique sua assinatura no Mercado Pago.", variant: "destructive"});
    }
  };

  const handleUserFormSubmit = async (data: UserFormData) => {
    if (!currentUser) {
      toast({ title: "Erro de Autenticação", description: "Admin não autenticado.", variant: "destructive" }); return;
    }
    if (!profile.nomeEmpresa && currentUserData?.plano === 'Clínica') {
        toast({ title: "Erro", description: "Nome da empresa do administrador não encontrado. Atualize o perfil do administrador.", variant: "destructive" }); return;
    }
    let tempApp;
    try {
      if (editingUser) {
        const userDocRef = doc(db, 'usuarios', editingUser.id);
        const userDataToUpdate: Partial<User> = {
          email: data.email, cargo: data.cargo, permissoes: data.permissoes, nomeCompleto: data.nomeCompleto || '',
          telefone: data.telefone || '', areaAtuacao: data.areaAtuacao || '',
        };
        await updateDoc(userDocRef, userDataToUpdate);
        toast({ title: "Usuário Atualizado", description: `Dados de ${data.email} atualizados.`, variant: "success" });
      } else {
        if (!data.password || data.password.length < 6) {
          toast({ title: "Erro de Validação", description: "A senha é obrigatória e deve ter pelo menos 6 caracteres.", variant: "destructive" }); return;
        }
        if (data.password !== data.confirmPassword) {
          toast({ title: "Erro de Validação", description: "As senhas não coincidem.", variant: "destructive" }); return;
        }
        tempApp = initializeSecondaryApp(firebaseConfig, `userCreation-${Date.now()}`);
        const tempAuthInstance = getAuthForSecondaryInstance(tempApp);
        const newUserCredential = await createUserInSecondaryInstance(tempAuthInstance, data.email, data.password);
        const newAuthUser = newUserCredential.user;
        if (data.nomeCompleto) await updateProfile(newAuthUser, { displayName: data.nomeCompleto });
        const newUserDoc = {
          email: data.email, cargo: data.cargo || 'Colaborador', permissoes: data.permissoes, nomeCompleto: data.nomeCompleto || '',
          ownerId: currentUser.uid, nomeEmpresa: profile.nomeEmpresa || '', plano: 'Clínica', statusCobranca: 'ativo', createdAt: serverTimestamp(),
          fotoPerfilUrl: '', telefone: data.telefone || '', areaAtuacao: data.areaAtuacao || '',
        };
        await setDoc(doc(db, 'usuarios', newAuthUser.uid), newUserDoc);
        toast({ title: "Usuário Adicionado", description: `${data.email} adicionado.`, variant: "success" });
      }
      setIsUserFormOpen(false); setEditingUser(null);
      if (currentUserData?.plano === 'Clínica') fetchClinicUsers();
    } catch (error: any) {
      let message = `Falha ao processar usuário: ${error.message}`;
      if (error.code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      else if (error.code === 'auth/invalid-email') message = 'O formato do e-mail é inválido.';
      else if (error.code === 'auth/weak-password') message = 'A senha é muito fraca.';
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      if (tempApp) await deleteSecondaryApp(tempApp);
    }
  };

  const handleOpenDeleteUserDialog = (user: User) => { setUserToDelete(user); setIsDeleteUserConfirmOpen(true); };
  const handleConfirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        const userDocRef = doc(db, 'usuarios', userToDelete.id);
        await deleteDoc(userDocRef);
        setUsers(users.filter(u => u.id !== userToDelete.id));
        toast({ title: "Usuário Excluído", description: `${userToDelete.email} foi removido do Firestore. (Conta Auth não afetada).`, variant: "destructive" });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível excluir o usuário.", variant: "destructive" });
      }
      setUserToDelete(null);
    }
    setIsDeleteUserConfirmOpen(false);
  };

  const canAccessTab = (tabKey: 'plano' | 'usuarios') => {
    if (!currentUserData) return false;
    if (currentUserData.cargo === 'Administrador') {
        return tabKey === 'usuarios' ? currentUserData.plano === 'Clínica' : true;
    }
    if (currentUserData.plano === 'Clínica' && currentUserData.permissoes) {
        if (tabKey === 'plano') return !!currentUserData.permissoes.configuracoes_acesso_plano_assinatura;
        if (tabKey === 'usuarios') return !!currentUserData.permissoes.configuracoes_acesso_gerenciar_usuarios;
    }
    return false;
  };

  const handleTabChange = (value: string) => {
    let allowed = true;
    if (value === "usuarios" && !canAccessTab('usuarios')) {
      allowed = false;
      toast({ title: "Acesso Negado", description: "Você não tem permissão para gerenciar usuários.", variant: "destructive" });
    }
    if (value === "plano" && !canAccessTab('plano')) {
      allowed = false;
      toast({ title: "Acesso Negado", description: "Você não tem permissão para ver o plano e assinatura.", variant: "destructive" });
    }

    if (allowed) {
      setActiveTab(value);
    } else if (activeTab !== "perfil") {
      setActiveTab("perfil");
    }
  };

  useEffect(() => {
    if (activeTab === "usuarios" && !canAccessTab('usuarios')) {
        if(currentUserData?.cargo !== 'Administrador') toast({ title: "Acesso Negado", description: "Redirecionando para Perfil.", variant: "warning" });
        setActiveTab("perfil");
    }
    if (activeTab === "plano" && !canAccessTab('plano')) {
        if(currentUserData?.cargo !== 'Administrador') toast({ title: "Acesso Negado", description: "Redirecionando para Perfil.", variant: "warning" });
        setActiveTab("perfil");
    }
  }, [activeTab, currentUserData]);

  const handleOpenUserForm = (user?: User) => { setEditingUser(user || null); setIsUserFormOpen(true); };

  const getMercadoPagoSubscriptionStatusText = (status: string | undefined) => {
    if (!status) return 'Não disponível';
    switch (status.toLowerCase()) {
      case 'authorized': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'cancelled': return 'Cancelada (MP)';
      case 'pending_cancel': return 'Cancelamento Pendente (MP)';
      case 'ended': return 'Finalizada (MP)';
      case 'charged_back': return 'Chargeback (MP)';
      case 'pending': return 'Pendente (MP)';
      case 'payment_required': return 'Pagamento Necessário (MP)';
      case 'cancelled_locally': return 'Cancelada (Localmente)';
      case 'cancelled_by_user': return 'Cancelada pelo Usuário (Localmente)';
      default: return status;
    }
  };

  const getMercadoPagoStatusBadgeVariant = (status: string | undefined) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'authorized': return 'success';
      case 'pending':
      case 'payment_required':
      case 'paused': return 'warning';
      case 'cancelled':
      case 'ended':
      case 'charged_back':
      case 'cancelled_locally':
      case 'cancelled_by_user': 
      case 'pending_cancel': // Also a warning/destructive state
        return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusCobrancaText = (status: string | undefined) => {
    if (!status) return 'Indefinido';
    switch (status.toLowerCase()) {
      case 'ativo': return 'Ativa';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelada';
      default: return status;
    }
  };

  const getStatusCobrancaBadgeVariant = (status: string | undefined) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'ativo': return 'success';
      case 'pendente': return 'warning';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
    }
  };


  if (!currentUserData && !currentUser) { // More robust loading check
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={cn("grid w-full h-auto sm:h-10 sm:grid-cols-5 grid-cols-1")}>
          <TabsTrigger value="perfil"><User className="mr-2 h-4 w-4 sm:inline hidden" />Perfil</TabsTrigger>
          <TabsTrigger value="plano" disabled={!canAccessTab('plano')}><CreditCard className="mr-2 h-4 w-4 sm:inline hidden" />Plano e Assinatura</TabsTrigger>
          <TabsTrigger value="mural-atualizacoes"><Newspaper className="mr-2 h-4 w-4 sm:inline hidden" />Mural de Atualizações</TabsTrigger>
          <TabsTrigger value="seguranca"><KeyRound className="mr-2 h-4 w-4 sm:inline hidden" />Segurança</TabsTrigger>
          <TabsTrigger value="usuarios" disabled={!canAccessTab('usuarios')}><UsersRound className="mr-2 h-4 w-4 sm:inline hidden" />Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Perfil do Usuário</CardTitle><CardDescription>Atualize suas informações pessoais e foto.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16"><AvatarImage src={profile.fotoPerfilUrl || undefined} alt="User Avatar" data-ai-hint="user avatar" /><AvatarFallback>{profile.nomeCompleto?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CP'}</AvatarFallback></Avatar>
                <Button variant="outline" onClick={handleChangePhoto}>Alterar Foto</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="nomeCompleto">Nome Completo</Label><Input id="nomeCompleto" name="nomeCompleto" value={profile.nomeCompleto} onChange={handleProfileChange} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={profile.email} disabled /></div>
                 <div className="space-y-2"><Label htmlFor="nomeEmpresa">Nome da Empresa/Clínica</Label><Input id="nomeEmpresa" name="nomeEmpresa" placeholder="Nome da sua clínica" value={profile.nomeEmpresa} onChange={handleProfileChange} disabled={currentUserData?.cargo !== 'Administrador'} /></div>
                <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" type="tel" placeholder="(XX) XXXXX-XXXX" value={profile.telefone} onChange={handleProfileChange} /></div>
                <div className="space-y-2"><Label htmlFor="areaAtuacao">Especialidade</Label><Input id="areaAtuacao" name="areaAtuacao" placeholder="Ex: Nutricionista" value={profile.areaAtuacao} onChange={handleProfileChange} /></div>
              </div>
            </CardContent>
            <CardFooter><Button onClick={handleSaveChanges}><Save className="mr-2 h-4 w-4" /> Salvar Alterações</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plano">
          {canAccessTab('plano') ? (
            <Card className="shadow-md">
              <CardHeader><CardTitle>Plano e Assinatura</CardTitle><CardDescription>Gerencie seu plano atual e detalhes de pagamento.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-4 pt-6">
                    <CardTitle className="text-lg">Plano Atual: {profile.plano || 'Não definido'}</CardTitle>
                     <div className="flex flex-col space-y-1 mt-1">
                        {profile.mercadoPagoSubscriptionStatus && (
                            <p className="text-sm text-muted-foreground">
                            Status da Assinatura (MP): <Badge variant={getMercadoPagoStatusBadgeVariant(profile.mercadoPagoSubscriptionStatus)}>
                                {getMercadoPagoSubscriptionStatusText(profile.mercadoPagoSubscriptionStatus)}
                            </Badge>
                            {profile.mercadoPagoNextPaymentDate && (profile.mercadoPagoSubscriptionStatus === 'authorized' || profile.mercadoPagoSubscriptionStatus === 'pending_cancel') &&
                                <span className="ml-2 text-xs">(Próximo vencimento: {format(profile.mercadoPagoNextPaymentDate.toDate(), 'dd/MM/yyyy')})</span>
                            }
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Status da Cobrança (Sistema): <Badge variant={getStatusCobrancaBadgeVariant(profile.statusCobranca)}>
                                {getStatusCobrancaText(profile.statusCobranca)}
                            </Badge>
                        </p>
                     </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allPlansData.find(p => p.name === profile.plano)?.features.map((feature, idx) => (
                       <div key={idx} className={`flex items-center ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}>
                         <Check className={`h-4 w-4 mr-2 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} /> {feature.text}
                       </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
                  <Button onClick={() => setIsPlansModalOpen(true)} className="w-full sm:w-auto">Ver Planos e Fazer Upgrade</Button>
                  {profile.plano !== 'Gratuito' && profile.mercadoPagoSubscriptionId && (
                    <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                      <AlertDialogTrigger asChild><Button variant="outline" className="w-full sm:w-auto text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive/80"><AlertTriangle className="mr-2 h-4 w-4" /> Cancelar Assinatura (Local)</Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Cancelamento Local</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja alterar seu plano para "Gratuito" em nosso sistema? Isso não cancelará sua assinatura com o Mercado Pago automaticamente. Você precisará gerenciar sua assinatura no portal do Mercado Pago.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/90">Confirmar e Mudar para Gratuito</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  )}
                   {profile.mercadoPagoSubscriptionId && (
                    <Button variant="outline" onClick={() => {
                        const mpSubscriptionLink = `https://www.mercadopago.com.br/subscriptions/detail/${profile.mercadoPagoSubscriptionId}`;
                        window.open(mpSubscriptionLink, '_blank');
                    }} className="w-full sm:w-auto">
                        Gerenciar Assinatura (Mercado Pago) <ExternalLink className="ml-2 h-4 w-4"/>
                    </Button>
                   )}
                </div>
              </CardContent>
            </Card>
          ) : <div className="p-6 text-center text-muted-foreground">Acesso negado a esta seção.</div>}
        </TabsContent>

        <TabsContent value="mural-atualizacoes">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Mural de Atualizações</CardTitle><CardDescription>Fique por dentro das últimas novidades e melhorias do CliniPrática.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {initialUpdates.map((update, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardHeader><CardTitle className="text-xl flex items-center justify-between"><span>{update.title}</span><Badge variant="secondary" className="text-xs">{update.version}</Badge></CardTitle><CardDescription>{update.date}</CardDescription></CardHeader>
                  <CardContent><p className="mb-3">{update.description}</p>{update.details && update.details.length > 0 && (<div><h4 className="font-semibold mb-1.5 text-sm">Detalhes desta versão:</h4><ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">{update.details.map((detail, idx) => (<li key={idx}>{detail}</li>))}</ul></div>)}</CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Segurança</CardTitle><CardDescription>Gerencie sua senha.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div><Label htmlFor="current-password">Senha Atual</Label><div className="relative"><Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pr-10" required /><Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? "Ocultar senha atual" : "Mostrar senha atual"}>{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div>
                <div><Label htmlFor="new-password">Nova Senha</Label><div className="relative"><Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" minLength={6} required /><Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha"}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{newPassword.length > 0 && newPassword.length < 6 && <p className="text-sm text-destructive mt-1">A nova senha deve ter pelo menos 6 caracteres.</p>}</div>
                <div><Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label><div className="relative"><Input id="confirm-new-password" type={showConfirmNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="pr-10" minLength={6} required /><Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} aria-label={showConfirmNewPassword ? "Ocultar confirmação da nova senha" : "Mostrar confirmação da nova senha"}>{showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{newPassword && confirmNewPassword && newPassword !== confirmNewPassword && <p className="text-sm text-destructive mt-1">As senhas não coincidem.</p>}</div>
                <Button type="submit" disabled={isChangingPassword}>{isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Alterando...</> : 'Alterar Senha'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          {canAccessTab('usuarios') ? (
            <Card className="shadow-md">
              <CardHeader><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><div><CardTitle>Gerenciamento de Usuários</CardTitle><CardDescription>Adicione, edite ou remova usuários da sua clínica.</CardDescription></div><Button onClick={() => handleOpenUserForm()} className="w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário</Button></div></CardHeader>
              <CardContent>
                {isLoadingUsers ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Carregando usuários...</p></div>)
                 : users.length > 0 ? (
                  <div className="overflow-x-auto"><Table className="min-w-full"><TableHeader className="hidden sm:table-header-group"><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Permissões</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="block sm:table-row mb-4 sm:mb-0 border sm:border-0 rounded-lg sm:rounded-none shadow-md sm:shadow-none p-4 sm:p-0">
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4 font-medium"><span className="font-semibold sm:hidden mr-2 text-muted-foreground">Nome: </span>{user.nomeCompleto}</TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4"><span className="font-semibold sm:hidden mr-2 text-muted-foreground">Email: </span>{user.email}</TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4"><span className="font-semibold sm:hidden mr-2 text-muted-foreground">Cargo: </span>{user.cargo}</TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4"><span className="font-semibold sm:hidden mr-2 text-muted-foreground block mb-1">Permissões: </span><div className="flex flex-wrap gap-1">{menuItemsConfig.filter(item => user.permissoes[item.id]).map(item => (<Badge key={item.id} variant="secondary" className="text-xs">{item.label}</Badge>))}{menuItemsConfig.filter(item => user.permissoes[item.id]).length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma</span>}</div></TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4 text-left sm:text-right"><span className="font-semibold sm:hidden mr-2 text-muted-foreground block mb-1">Ações:</span><div className="flex gap-2 sm:justify-end sm:space-x-1 sm:gap-0"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenUserForm(user)} title="Editar Usuário"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteUserDialog(user)} title="Excluir Usuário"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                ) : (<div className="text-center py-10 text-muted-foreground"><UsersRound className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>Nenhum usuário adicional cadastrado.</p></div>)}
              </CardContent>
            </Card>
          ) : <div className="p-6 text-center text-muted-foreground">Acesso negado a esta seção.</div>}
        </TabsContent>
      </Tabs>

      <PlansModal
        isOpen={isPlansModalOpen}
        onOpenChange={setIsPlansModalOpen}
        currentPlanName={profile.plano}
        onSelectPlan={handleSelectPlan}
        currentUser={currentUser}
        currentUserName={profile.nomeCompleto}
      />
      <Dialog open={isUserFormOpen} onOpenChange={(isOpen) => { setIsUserFormOpen(isOpen); if (!isOpen) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle><DialogDescription>Preencha os dados do usuário e defina suas permissões de acesso.</DialogDescription></DialogHeader><UserForm onSubmit={handleUserFormSubmit} initialData={editingUser || undefined} onCancel={() => { setIsUserFormOpen(false); setEditingUser(null); }} /></DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteUserConfirmOpen} onOpenChange={setIsDeleteUserConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão de Usuário</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o usuário <strong>{userToDelete?.email}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { setUserToDelete(null); setIsDeleteUserConfirmOpen(false); }}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteUser} className="bg-destructive hover:bg-destructive/90">Excluir Usuário</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
