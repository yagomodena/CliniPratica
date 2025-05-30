
'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Newspaper, KeyRound, Save, AlertTriangle, UserPlus, UsersRound, Edit, Trash2, Eye, EyeOff, ListChecks, Loader2 } from "lucide-react";
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
  AlertDialogTrigger,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { auth, db } from '@/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged, // Added onAuthStateChanged here
} from 'firebase/auth';
import { collection, setDoc, getDoc, doc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore"; // Added updateDoc and deleteDoc

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


export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState({
    nomeCompleto: '',
    email: '',
    telefone: '',
    areaAtuacao: '',
    plano: '',
    fotoPerfilUrl: '',
  });

  const [currentUserPlan, setCurrentUserPlan] = useState<string>('Gratuito');
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


  // State for User Management
  const [users, setUsers] = useState<User[]>([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let data = {};
        if (userDocSnap.exists()) {
          data = userDocSnap.data();
        } else {
          // Se não houver dados no Firestore, usar dados do Auth e padrões
          console.warn(`Dados do usuário ${user.uid} não encontrados no Firestore. Usando dados do Auth.`);
        }

        const nomeCompleto = user.displayName || (data as any).nomeCompleto || '';
        const email = user.email || (data as any).email || '';
        const telefone = (data as any).telefone || user.phoneNumber || '';
        const areaAtuacao = (data as any).areaAtuacao || '';
        const plano = (data as any).plano || 'Gratuito';
        const fotoPerfilUrl = user.photoURL || (data as any).fotoPerfilUrl || '';

        setProfile({ nomeCompleto, email, telefone, areaAtuacao, plano, fotoPerfilUrl });
        setCurrentUserPlan(plano);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserProfile();
      } else {
        // Reset profile if user logs out
        setProfile({ nomeCompleto: '', email: '', telefone: '', areaAtuacao: '', plano: 'Gratuito', fotoPerfilUrl: '' });
        setCurrentUserPlan('Gratuito');
      }
    });
    
    return () => unsubscribe();
  }, []);


  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive"});
        return;
      }

      await updateProfile(user, {
        displayName: profile.nomeCompleto,
        photoURL: profile.fotoPerfilUrl,
      });

      const userDocRef = doc(db, "usuarios", user.uid);
      const dataToUpdate: any = {
        nomeCompleto: profile.nomeCompleto,
        telefone: profile.telefone,
        areaAtuacao: profile.areaAtuacao,
        fotoPerfilUrl: profile.fotoPerfilUrl,
        // email e plano não são atualizados aqui diretamente pelo perfil
      };
      
      // Remove campos indefinidos para não sobrescrever com undefined no Firestore
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);


      await setDoc(userDocRef, dataToUpdate, { merge: true }
      );

      toast({
        title: "Sucesso!",
        description: "Seu perfil foi atualizado com sucesso.",
        variant: "success",
      });
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar suas alterações.",
        variant: "destructive",
      });
    }
  };

  const handleChangePhoto = () => {
    toast({
      title: "Funcionalidade Indisponível",
      description: "A alteração de foto ainda não está implementada.",
      variant: "default",
    });
    console.log("Attempted to change photo");
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Campos Obrigatórios", description: "Por favor, preencha todos os campos de senha.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Erro de Validação", description: "A nova senha e a confirmação não coincidem.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha Fraca", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({ title: "Erro", description: "Usuário não autenticado ou e-mail não encontrado.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      toast({ title: "Sucesso!", description: "Sua senha foi alterada com sucesso.", variant: "success" });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      let message = "Ocorreu um erro ao tentar alterar sua senha.";
      if (error.code === 'auth/wrong-password') {
        message = "A senha atual informada está incorreta.";
      } else if (error.code === 'auth/weak-password') {
        message = "A nova senha é muito fraca. Escolha uma senha mais forte.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Muitas tentativas de reautenticação. Tente novamente mais tarde.";
      }
      toast({ title: "Erro ao Alterar Senha", description: message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const handleSelectPlan = (planName: PlanName) => {
    console.log("Updating plan to:", planName);
    setCurrentUserPlan(planName);
    // TODO: Add logic to update plan in Firestore
    const user = auth.currentUser;
    if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        setDoc(userDocRef, { plano: planName }, { merge: true })
            .then(() => {
                console.log("Plano atualizado no Firestore para:", planName);
            })
            .catch((error) => {
                console.error("Erro ao atualizar plano no Firestore:", error);
            });
    }
  };

  const handleCancelSubscription = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive"});
      setIsCancelConfirmOpen(false);
      return;
    }
    console.log("Cancelling subscription for plan:", currentUserPlan);
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      await updateDoc(userDocRef, { plano: "Gratuito" });
      setCurrentUserPlan('Gratuito');
      setProfile(prev => ({ ...prev, plano: 'Gratuito' }));
      setIsCancelConfirmOpen(false);
      toast({
        title: "Assinatura Cancelada",
        description: "Sua assinatura foi cancelada e você foi movido para o plano Gratuito.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      toast({ title: "Erro", description: "Não foi possível cancelar a assinatura.", variant: "destructive"});
    }
  };

  const handleUserFormSubmit = async (data: UserFormData) => {
    try {
      const mainAuthUser = auth.currentUser;
      if (!mainAuthUser) {
        toast({ title: "Erro de Autenticação", description: "Usuário principal não autenticado.", variant: "destructive" });
        return;
      }

      if (editingUser) {
        // Edição de usuário: Atualizar no Firestore (não no Auth primário)
        const userDocRef = doc(db, 'usuarios', editingUser.id); // Assume 'id' is the UID
        const userDataToUpdate = {
          email: data.email, // Email não pode ser alterado no Auth sem reautenticação, mas podemos atualizar no Firestore
          cargo: data.cargo,
          permissoes: data.permissoes,
          nomeCompleto: data.nomeCompleto || '',
          // Não atualizamos a senha aqui. Se for necessário, deve ser um processo separado.
          // Adicione outros campos conforme necessário: nomeEmpresa, plano, telefone, etc.
        };
        await updateDoc(userDocRef, userDataToUpdate);
        setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...userDataToUpdate } : u));
        toast({ title: "Usuário Atualizado", description: `Dados de ${data.email} atualizados.`, variant: "success" });
      } else {
        // Cadastro de novo usuário:
        // Criar no Firebase Auth - Idealmente, isso exigiria uma instância de Auth secundária ou uma função de back-end
        // Para esta versão simplificada, vamos focar em salvar no Firestore sob a estrutura da clínica/usuário principal
        // A senha não será usada para login direto deste sub-usuário sem uma lógica de Auth mais complexa.

        // Gerar um ID único para o novo usuário (pode ser o UID de uma conta Auth secundária ou um ID gerado)
        // Por enquanto, vamos usar um ID gerado, mas o ideal seria um UID do Firebase Auth
        const newUserId = doc(collection(db, 'usuarios')).id; // Gera um ID único de documento

        const newUserDoc = {
          email: data.email,
          cargo: data.cargo,
          permissoes: data.permissoes,
          nomeCompleto: data.nomeCompleto || '',
          // Para 'Clínica', associar ao 'ownerId' ou 'companyId' do usuário principal
          // Este campo 'ownerId' ou 'clinicId' seria crucial para buscar usuários da mesma clínica
          ownerId: mainAuthUser.uid, // Exemplo de como associar ao admin/dono da clínica
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'usuarios', newUserId), newUserDoc);

        const newUserForState: User = {
          id: newUserId,
          email: data.email,
          cargo: data.cargo,
          permissoes: data.permissoes,
          nomeCompleto: data.nomeCompleto || '',
          areaAtuacao: '',
          criadoEm: new Date().toISOString(),
          fotoPerfilUrl: '',
          nomeEmpresa: '',
          plano: '', // Ou o plano da clínica
          telefone: '',
        };
        setUsers([...users, newUserForState]);
        toast({ title: "Usuário Adicionado", description: `${data.email} adicionado com sucesso.`, variant: "success" });
      }
      setIsUserFormOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Erro no formulário de usuário:", error);
      toast({ title: "Erro", description: `Falha ao processar usuário: ${error.message}`, variant: "destructive" });
    }
  };


  const handleOpenDeleteUserDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteUserConfirmOpen(true);
  };

  const handleConfirmDeleteUser = () => {
    if (userToDelete) {
      // Lógica para remover usuário do Firestore. A remoção do Firebase Auth é mais complexa e requer backend.
      const userDocRef = doc(db, 'usuarios', userToDelete.id);
      deleteDoc(userDocRef).then(() => {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        toast({ title: "Usuário Excluído", description: `${userToDelete.email} foi removido.`, variant: "destructive" });
      }).catch(error => {
        console.error("Erro ao excluir usuário do Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível excluir o usuário do Firestore.", variant: "destructive" });
      });
      setUserToDelete(null);
    }
    setIsDeleteUserConfirmOpen(false);
  };

  const handleTabChange = (value: string) => {
    if (value === "usuarios" && currentUserPlan !== "Clínica") {
      toast({
        title: "Plano necessário",
        description: "Essa funcionalidade está disponível apenas para planos Clínica.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab(value);
  };

  const handleOpenUserForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
    } else {
      setEditingUser(null);
    }
    setIsUserFormOpen(true);
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Configurações</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={cn(
          "grid w-full h-auto sm:h-10 sm:grid-cols-5 grid-cols-1"
        )}>
          <TabsTrigger value="perfil"><User className="mr-2 h-4 w-4 sm:inline hidden" />Perfil</TabsTrigger>
          <TabsTrigger value="plano"><CreditCard className="mr-2 h-4 w-4 sm:inline hidden" />Plano e Assinatura</TabsTrigger>
          <TabsTrigger value="mural-atualizacoes"><Newspaper className="mr-2 h-4 w-4 sm:inline hidden" />Mural de Atualizações</TabsTrigger>
          <TabsTrigger value="seguranca"><KeyRound className="mr-2 h-4 w-4 sm:inline hidden" />Segurança</TabsTrigger>
          <TabsTrigger value="usuarios"><UsersRound className="mr-2 h-4 w-4 sm:inline hidden" />Usuários</TabsTrigger>
        </TabsList>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Perfil do Usuário</CardTitle>
              <CardDescription>Atualize suas informações pessoais e foto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.fotoPerfilUrl || undefined} alt="User Avatar" data-ai-hint="user avatar" />
                  <AvatarFallback>{profile.nomeCompleto?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CP'}</AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={handleChangePhoto}>Alterar Foto</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeCompleto">Nome Completo</Label>
                  <Input id="nomeCompleto" name="nomeCompleto" value={profile.nomeCompleto} onChange={handleProfileChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={profile.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" type="tel" placeholder="(XX) XXXXX-XXXX" value={profile.telefone} onChange={handleProfileChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaAtuacao">Especialidade</Label>
                  <Input id="areaAtuacao" name="areaAtuacao" placeholder="Ex: Nutricionista" value={profile.areaAtuacao} onChange={handleProfileChange} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Plano e Assinatura Tab */}
        <TabsContent value="plano">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Plano e Assinatura</CardTitle>
              <CardDescription>Gerencie seu plano atual e detalhes de pagamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="bg-muted/50">
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-lg">Plano Atual: {profile.plano || 'Não definido'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.plano === 'Gratuito' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Até 10 pacientes ativos</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Agenda básica</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte comunitário</div>
                    </>
                  )}
                  {profile.plano === 'Essencial' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Até 50 pacientes</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Agenda completa com alertas</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Upload de exames (1GB)</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte por e-mail</div>
                    </>
                  )}
                  {profile.plano === 'Profissional' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Pacientes ilimitados</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Todas as funcionalidades Essencial</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Envio automático de mensagens</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte prioritário</div>
                    </>
                  )}
                  {profile.plano === 'Clínica' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Múltiplos profissionais</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Todas as funcionalidades Profissional</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Relatórios avançados</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Gerente de contas dedicado</div>
                    </>
                  )}
                </CardContent>
              </Card>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
                <Button onClick={() => setIsPlansModalOpen(true)} className="w-full sm:w-auto">
                  Ver Planos e Fazer Upgrade
                </Button>
                {profile.plano !== 'Gratuito' && (
                  <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive/80">
                        <AlertTriangle className="mr-2 h-4 w-4" /> Cancelar Assinatura
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja cancelar sua assinatura do plano {profile.plano}? Você será movido para o plano Gratuito e perderá acesso às funcionalidades pagas ao final do ciclo de cobrança atual.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/90">
                          Confirmar Cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mural de Atualizações Tab */}
        <TabsContent value="mural-atualizacoes">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Mural de Atualizações</CardTitle>
              <CardDescription>Fique por dentro das últimas novidades e melhorias do CliniPrática.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {initialUpdates.map((update, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between">
                      <span>{update.title}</span>
                      <Badge variant="secondary" className="text-xs">{update.version}</Badge>
                    </CardTitle>
                    <CardDescription>{update.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3">{update.description}</p>
                    {update.details && update.details.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-1.5 text-sm">Detalhes desta versão:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {update.details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança Tab */}
        <TabsContent value="seguranca">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Gerencie sua senha.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input 
                      id="current-password" 
                      type={showCurrentPassword ? 'text' : 'password'} 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Ocultar senha atual" : "Mostrar senha atual"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">Nova Senha</Label>
                   <div className="relative">
                    <Input 
                      id="new-password" 
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      minLength={6}
                      required
                    />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                   {newPassword.length > 0 && newPassword.length < 6 && <p className="text-sm text-destructive mt-1">A nova senha deve ter pelo menos 6 caracteres.</p>}
                </div>
                <div>
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      id="confirm-new-password" 
                      type={showConfirmNewPassword ? 'text' : 'password'} 
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pr-10"
                      minLength={6}
                      required
                    />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      aria-label={showConfirmNewPassword ? "Ocultar confirmação da nova senha" : "Mostrar confirmação da nova senha"}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && <p className="text-sm text-destructive mt-1">As senhas não coincidem.</p>}
                </div>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Alterando...</> : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários Tab */}
        <TabsContent value="usuarios">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                  <CardDescription>Adicione, edite ou remova usuários da sua clínica.</CardDescription>
                </div>
                <Button onClick={() => handleOpenUserForm()} className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader className="hidden sm:table-header-group">
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="block sm:table-row mb-4 sm:mb-0 border sm:border-0 rounded-lg sm:rounded-none shadow-md sm:shadow-none p-4 sm:p-0">
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4 font-medium">
                            <span className="font-semibold sm:hidden mr-2 text-muted-foreground">Email: </span>
                            {user.email}
                          </TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4">
                            <span className="font-semibold sm:hidden mr-2 text-muted-foreground">Cargo: </span>
                            {user.cargo}
                          </TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4">
                            <span className="font-semibold sm:hidden mr-2 text-muted-foreground block mb-1">Permissões: </span>
                            <div className="flex flex-wrap gap-1">
                              {menuItemsConfig.filter(item => user.permissoes[item.id]).map(item => (
                                <Badge key={item.id} variant="secondary" className="text-xs">{item.label}</Badge>
                              ))}
                              {menuItemsConfig.filter(item => user.permissoes[item.id]).length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma permissão específica</span>}
                            </div>
                          </TableCell>
                          <TableCell className="block sm:table-cell py-2 sm:py-4 sm:px-4 text-left sm:text-right">
                            <span className="font-semibold sm:hidden mr-2 text-muted-foreground block mb-1">Ações:</span>
                            <div className="flex gap-2 sm:justify-end sm:space-x-1 sm:gap-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenUserForm(user)} title="Editar Usuário">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteUserDialog(user)} title="Excluir Usuário">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <UsersRound className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum usuário adicional cadastrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plans Modal */}
      <PlansModal
        isOpen={isPlansModalOpen}
        onOpenChange={setIsPlansModalOpen}
        currentPlanName={profile.plano}
        onSelectPlan={handleSelectPlan}
      />

      {/* Add/Edit User Dialog */}
      <Dialog open={isUserFormOpen} onOpenChange={(isOpen) => {
        setIsUserFormOpen(isOpen);
        if (!isOpen) setEditingUser(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do usuário e defina suas permissões de acesso.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            onSubmit={handleUserFormSubmit}
            initialData={editingUser || undefined}
            onCancel={() => {
              setIsUserFormOpen(false);
              setEditingUser(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteUserConfirmOpen} onOpenChange={setIsDeleteUserConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setUserToDelete(null); setIsDeleteUserConfirmOpen(false); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

