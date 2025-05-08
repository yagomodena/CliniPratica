
'use client'; // Add 'use client' for state and interactivity

import React, { useState } from 'react'; // Import useState
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Bell, KeyRound, Save, AlertTriangle } from "lucide-react"; // Added Save, AlertTriangle icons
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { PlansModal } from '@/components/sections/plans-modal'; // Import the PlansModal component
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
} from "@/components/ui/alert-dialog"


// Define the structure for profile data
type ProfileData = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
};

type PlanName = 'Gratuito' | 'Essencial' | 'Profissional' | 'Clínica'; // Define possible plan names

export default function ConfiguracoesPage() {
  const { toast } = useToast(); // Initialize toast
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<PlanName>('Gratuito'); // Default to 'Gratuito'

  // State for profile data
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Usuário Exemplo',
    email: 'usuario@clinipratica.com.br', // Keep email disabled for now
    phone: '',
    specialty: '',
  });

  // Handle input changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle saving changes
  const handleSaveChanges = () => {
    // Simulate saving data (e.g., API call)
    console.log("Saving profile changes:", profile);

    // Show success toast
    toast({
      title: "Sucesso!",
      description: "Seu perfil foi atualizado com sucesso.",
      variant: "success", // Use success variant
    });
  };

  // Placeholder for changing photo
  const handleChangePhoto = () => {
    // In a real app, this would open a file picker and handle upload
    toast({
      title: "Funcionalidade Indisponível",
      description: "A alteração de foto ainda não está implementada.",
      variant: "default", // Use default or a custom variant if needed
    });
    console.log("Attempted to change photo");
  };

  // Placeholder for changing password
  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
       // In a real app, validate fields and call API
      toast({
        title: "Funcionalidade Indisponível",
        description: "A alteração de senha ainda não está implementada.",
        variant: "default",
      });
      console.log("Attempted to change password");
  }

  // Handle plan selection from modal
  const handleSelectPlan = (planName: PlanName) => {
    // Simulate updating the user's plan
    console.log("Updating plan to:", planName);
    setCurrentUserPlan(planName); // Update the local state
    // In a real app, trigger API call to update subscription
  };

  // Handle subscription cancellation
  const handleCancelSubscription = () => {
    console.log("Cancelling subscription for plan:", currentUserPlan);
    // Simulate API call for cancellation
    setCurrentUserPlan('Gratuito'); // Downgrade to free plan locally
    setIsCancelConfirmOpen(false); // Close confirmation dialog
    toast({
      title: "Assinatura Cancelada",
      description: "Sua assinatura foi cancelada e você foi movido para o plano Gratuito.",
      variant: "default",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Configurações</h1>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="perfil"><User className="mr-2 h-4 w-4 sm:inline hidden"/>Perfil</TabsTrigger>
          <TabsTrigger value="plano"><CreditCard className="mr-2 h-4 w-4 sm:inline hidden"/>Plano e Assinatura</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="mr-2 h-4 w-4 sm:inline hidden"/>Notificações</TabsTrigger>
          <TabsTrigger value="seguranca"><KeyRound className="mr-2 h-4 w-4 sm:inline hidden"/>Segurança</TabsTrigger>
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
                    {/* Use a placeholder or dynamic avatar */}
                    <AvatarImage src={profile.email === 'usuario@clinipratica.com.br' ? "https://picsum.photos/100/100" : undefined} alt="User Avatar" data-ai-hint="user avatar"/>
                    <AvatarFallback>{profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CP'}</AvatarFallback>
                 </Avatar>
                 <Button variant="outline" onClick={handleChangePhoto}>Alterar Foto</Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      name="name" // Add name attribute
                      value={profile.name} // Bind value to state
                      onChange={handleProfileChange} // Handle changes
                    />
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email" // Add name attribute
                      type="email"
                      value={profile.email} // Bind value to state
                      disabled // Keep disabled as email change might need verification
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input
                      id="phone"
                      name="phone" // Add name attribute
                      type="tel"
                      placeholder="(XX) XXXXX-XXXX"
                      value={profile.phone} // Bind value to state
                      onChange={handleProfileChange} // Handle changes
                    />
                 </div>
                   <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade (Opcional)</Label>
                    <Input
                      id="specialty"
                      name="specialty" // Add name attribute
                      placeholder="Ex: Nutricionista"
                      value={profile.specialty} // Bind value to state
                      onChange={handleProfileChange} // Handle changes
                    />
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
                     {/* Dynamic features based on current plan - simplified for now */}
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
                 {/* Button to open the Plans Modal */}
                 <Button onClick={() => setIsPlansModalOpen(true)}>
                   Ver Planos e Fazer Upgrade
                 </Button>

                  {/* Conditional Cancel Button */}
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

              {/* Placeholder for payment details if plan is paid */}
              {/* <div>
                 <h3 className="font-semibold mb-2">Detalhes de Pagamento</h3>
                 <p className="text-sm text-muted-foreground">Cartão final XXXX</p>
                 <Button variant="outline" size="sm" className="mt-2">Atualizar Pagamento</Button>
              </div> */}
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
            <CardContent className="space-y-4 text-center py-16 text-muted-foreground">
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
               {/* Simple form for password change simulation */}
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
      </Tabs>

       {/* Plans Modal */}
       <PlansModal
        isOpen={isPlansModalOpen}
        onOpenChange={setIsPlansModalOpen}
        currentPlanName={currentUserPlan}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}
