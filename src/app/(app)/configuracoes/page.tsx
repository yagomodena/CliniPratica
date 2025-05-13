
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Bell, KeyRound, Save, AlertTriangle, UserPlus, UsersRound, Edit, Trash2, Eye } from "lucide-react";
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

// Define the structure for profile data
type ProfileData = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
};

type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica';

// Initial User Data for User Management (placeholder)
const initialUsers: User[] = [
  {
    id: 'usr_001',
    email: 'medico.chefe@clinipratica.com.br',
    role: 'Administrador',
    permissions: {
      dashboard: true,
      pacientes: true,
      agenda: true,
      mensagens: true,
      financeiro: true,
      relatorios: true,
      configuracoes: true,
      usuarios: true,
    },
  },
  {
    id: 'usr_002',
    email: 'secretaria@clinipratica.com.br',
    role: 'Secretária',
    permissions: {
      dashboard: true,
      pacientes: true,
      agenda: true,
      mensagens: true,
      financeiro: false,
      relatorios: false,
      configuracoes: false,
      usuarios: false,
    },
  },
];


export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<PlanName>('Clínica'); // Default to 'Clínica' to show user management

  // State for profile data
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Usuário Exemplo',
    email: 'usuario@clinipratica.com.br',
    phone: '',
    specialty: '',
  });

  // State for User Management
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // TODO: Add a check here to only show the 'Usuários' tab if on the 'Clínica' plan.
  const isClinicaPlan = currentUserPlan === 'Clínica';


  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = () => {
    console.log("Saving profile changes:", profile);
    toast({
      title: "Sucesso!",
      description: "Seu perfil foi atualizado com sucesso.",
      variant: "success",
    });
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

  const handleUserFormSubmit = (data: UserFormData) => {
    if (editingUser) {
      // Edit existing user
      setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...data, id: editingUser.id } : u)); // Ensure ID is not overwritten with undefined
      toast({ title: "Usuário Atualizado", description: `Dados de ${data.email} atualizados.`, variant: "success" });
    } else {
      // Add new user
      const newUser: User = {
        id: `usr_${Date.now()}`, // Simple unique ID
        email: data.email,
        role: data.role,
        permissions: data.permissions,
        // Password is not stored in frontend state directly
      };
      setUsers([...users, newUser]);
      toast({ title: "Usuário Adicionado", description: `${data.email} adicionado à equipe.`, variant: "success" });
    }
    setIsUserFormOpen(false);
    setEditingUser(null);
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


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Configurações</h1>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className={cn(
            "grid w-full h-auto sm:h-10 grid-cols-1",
            isClinicaPlan ? "sm:grid-cols-5" : "sm:grid-cols-4"
          )}>
          <TabsTrigger value="perfil"><User className="mr-2 h-4 w-4 sm:inline hidden"/>Perfil</TabsTrigger>
          <TabsTrigger value="plano"><CreditCard className="mr-2 h-4 w-4 sm:inline hidden"/>Plano e Assinatura</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="mr-2 h-4 w-4 sm:inline hidden"/>Notificações</TabsTrigger>
          <TabsTrigger value="seguranca"><KeyRound className="mr-2 h-4 w-4 sm:inline hidden"/>Segurança</TabsTrigger>
          {isClinicaPlan && <TabsTrigger value="usuarios"><UsersRound className="mr-2 h-4 w-4 sm:inline hidden"/>Usuários</TabsTrigger>}
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
                    <AvatarImage src={profile.email === 'usuario@clinipratica.com.br' ? "https://picsum.photos/100/100" : undefined} alt="User Avatar" data-ai-hint="user avatar"/>
                    <AvatarFallback>{profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CP'}</AvatarFallback>
                 </Avatar>
                 <Button variant="outline" onClick={handleChangePhoto}>Alterar Foto</Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" value={profile.name} onChange={handleProfileChange} />
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={profile.email} disabled />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="(XX) XXXXX-XXXX" value={profile.phone} onChange={handleProfileChange} />
                 </div>
                   <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade (Opcional)</Label>
                    <Input id="specialty" name="specialty" placeholder="Ex: Nutricionista" value={profile.specialty} onChange={handleProfileChange} />
                 </div>
               </div>
               <Button onClick={handleSaveChanges}>
                  <Save className="mr-2 h-4 w-4"/> Salvar Alterações
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
                         <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Até 10 pacientes ativos</div>
                         <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Agenda básica</div>
                         <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Suporte comunitário</div>
                        </>
                    )}
                     {currentUserPlan === 'Essencial' && (
                        <>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Até 50 pacientes</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Agenda completa com alertas</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Upload de exames (1GB)</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Suporte por e-mail</div>
                        </>
                     )}
                      {currentUserPlan === 'Profissional' && (
                        <>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Pacientes ilimitados</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Todas as funcionalidades Essencial</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Envio automático de mensagens</div>
                          <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Suporte prioritário</div>
                        </>
                     )}
                      {currentUserPlan === 'Clínica' && (
                         <>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Múltiplos profissionais</div>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Todas as funcionalidades Profissional</div>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Relatórios avançados</div>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Gerente de contas dedicado</div>
                         </>
                      )}
                 </CardContent>
              </Card>
              <div className="flex flex-wrap gap-4 items-center">
                 <Button onClick={() => setIsPlansModalOpen(true)}>
                   Ver Planos e Fazer Upgrade
                 </Button>
                  {currentUserPlan !== 'Gratuito' && (
                      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                          <AlertDialogTrigger asChild>
                             <Button variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive/80">
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

        {/* Notificações Tab */}
        <TabsContent value="notificacoes">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Escolha como você deseja ser notificado.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-16 text-muted-foreground">
                <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Configurações de notificação (em breve).</p>
                <p className="text-sm">Você poderá escolher receber notificações por email ou dentro do app.</p>
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
               <div className="border-t pt-6">
                   <h4 className="font-semibold mb-2">Autenticação de Dois Fatores (2FA)</h4>
                   <p className="text-sm text-muted-foreground mb-3">Adicione uma camada extra de segurança à sua conta.</p>
                   <Button variant="outline" disabled>Configurar 2FA (em breve)</Button>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários Tab (only if isClinicaPlan is true) */}
        {isClinicaPlan && (
          <TabsContent value="usuarios">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Adicione, edite ou remova usuários da sua clínica.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenUserForm()}>
                    <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {menuItemsConfig.filter(item => user.permissions[item.id]).map(item => (
                                <Badge key={item.id} variant="secondary" className="text-xs">{item.label}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenUserForm(user)} title="Editar Usuário">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteUserDialog(user)} title="Excluir Usuário">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <UsersRound className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhum usuário adicional cadastrado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
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

