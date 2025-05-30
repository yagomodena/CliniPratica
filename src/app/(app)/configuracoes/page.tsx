
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Newspaper, KeyRound, Save, AlertTriangle, UserPlus, UsersRound, Edit, Trash2, Eye, ListChecks } from "lucide-react";
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
import { useEffect } from 'react';
import { auth, db } from '@/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth
} from 'firebase/auth';
import { collection, setDoc, getDoc, doc } from "firebase/firestore";

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
  });

  const [currentUserPlan, setCurrentUserPlan] = useState<string>('Gratuito');

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        const data = userDoc.data();

        const nomeCompleto = user.displayName || '';
        const email = user.email || '';
        const telefone = data?.telefone || user.phoneNumber || '';
        const areaAtuacao = data?.areaAtuacao || '';
        const plano = data?.plano || 'Gratuito';

        setProfile({ nomeCompleto, email, telefone, areaAtuacao, plano });
        setCurrentUserPlan(plano);
      }
    };

    fetchUserProfile();
  }, []);

  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");


  // State for User Management
  const [users, setUsers] = useState<User[]>([]); // vazio inicialmente
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);


  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Atualiza o nome no Firebase Auth
      await updateProfile(user, {
        displayName: profile.nomeCompleto,
      });

      // Atualiza os dados no Firestore com os nomes corretos
      await setDoc(
        doc(db, "usuarios", user.uid),
        {
          nomeCompleto: profile.nomeCompleto,
          telefone: profile.telefone,
          areaAtuacao: profile.areaAtuacao,
        },
        { merge: true }
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

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Funcionalidade Indisponível",
      description: "A alteração de senha ainda não está implementada.",
      variant: "default",
    });
    console.log("Attempted to change password");
  }

  const handleSelectPlan = (planName: PlanName) => {
    console.log("Updating plan to:", planName);
    setCurrentUserPlan(planName);
  };

  const handleCancelSubscription = () => {
    console.log("Cancelling subscription for plan:", currentUserPlan);
    setCurrentUserPlan('Gratuito');
    setIsCancelConfirmOpen(false);
    toast({
      title: "Assinatura Cancelada",
      description: "Sua assinatura foi cancelada e você foi movido para o plano Gratuito.",
      variant: "default",
    });
  };

  // User Management Handlers
  const handleOpenUserForm = (user: User | null = null) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleUserFormSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        // Aqui pode implementar edição no Firestore, se desejar atualizar info do usuário
        // Edição de usuário Firebase Auth é mais limitada (ex: para email, precisa reautenticar, etc)

        // Atualiza usuário localmente
        setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...data, id: editingUser.id } : u));
        toast({ title: "Usuário Atualizado", description: `Dados de ${data.email} atualizados.`, variant: "success" });

        setIsUserFormOpen(false);
        setEditingUser(null);
        return;
      }

      // Cadastro novo usuário no Firebase Authentication com email e senha
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password as string);

      // userCredential.user contém o usuário criado no Firebase
      const firebaseUser = userCredential.user;

      // Opcional: atualize o displayName se tiver um campo de nome no formulário
      // await updateProfile(firebaseUser, { displayName: data.nomeCompleto });

      // Salva dados extras no Firestore, coleção 'usuarios' com o uid do firebase
      await setDoc(doc(db, 'usuarios', firebaseUser.uid), {
        email: data.email,
        role: data.cargo,
        permissions: data.permissoes,
        createdAt: new Date(),
      });

      // Atualiza lista local de usuários com o novo usuário (id será o uid do Firebase)
      const newUser: User = {
        id: firebaseUser.uid,
        email: data.email,
        cargo: data.cargo,
        permissoes: data.permissoes,
        nomeCompleto: data.nomeCompleto || '',
        areaAtuacao: data.areaAtuacao || '',
        criadoEm: new Date().toISOString(),
        fotoPerfilUrl: '',
        nomeEmpresa: data.nomeEmpresa || '',
        plano: data.plano || '',
        telefone: data.telefone || '',
      };

      setUsers([...users, newUser]);
      toast({ title: "Usuário Adicionado", description: `${data.email} adicionado com sucesso.`, variant: "success" });
      setIsUserFormOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      // Tratamento de erro do Firebase
      let errorMessage = "Erro ao criar usuário.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Esse email já está sendo usado.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Senha muito fraca.";
      }
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    }
  };

  const handleOpenDeleteUserDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteUserConfirmOpen(true);
  };

  const handleConfirmDeleteUser = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast({ title: "Usuário Excluído", description: `${userToDelete.email} foi removido da equipe.`, variant: "destructive" });
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
                  <AvatarImage src={profile.email === 'usuario@clinipratica.com.br' ? "https://placehold.co/100x100.png" : undefined} alt="User Avatar" data-ai-hint="user avatar" />
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
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
              </Button>
            </CardContent>
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
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Plano Atual: {currentUserPlan}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentUserPlan === 'Gratuito' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Até 10 pacientes ativos</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Agenda básica</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte comunitário</div>
                    </>
                  )}
                  {currentUserPlan === 'Essencial' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Até 50 pacientes</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Agenda completa com alertas</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Upload de exames (1GB)</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte por e-mail</div>
                    </>
                  )}
                  {currentUserPlan === 'Profissional' && (
                    <>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Pacientes ilimitados</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Todas as funcionalidades Essencial</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Envio automático de mensagens</div>
                      <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500" /> Suporte prioritário</div>
                    </>
                  )}
                  {currentUserPlan === 'Clínica' && (
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
                {currentUserPlan !== 'Gratuito' && (
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
                          Tem certeza que deseja cancelar sua assinatura do plano {currentUserPlan}? Você será movido para o plano Gratuito e perderá acesso às funcionalidades pagas ao final do ciclo de cobrança atual.
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
              <CardDescription>Gerencie sua senha e configurações de segurança.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button type="submit">Alterar Senha</Button>
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
        currentPlanName={currentUserPlan}
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

