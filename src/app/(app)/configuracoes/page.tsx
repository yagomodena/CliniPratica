
'use client'; // Add 'use client' for state and interactivity

import React, { useState } from 'react'; // Import useState
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Bell, KeyRound, Save } from "lucide-react"; // Added Save icon
import { useToast } from '@/hooks/use-toast'; // Import useToast


// Define the structure for profile data
type ProfileData = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
};

export default function ConfiguracoesPage() {
  const { toast } = useToast(); // Initialize toast

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
                    <CardTitle className="text-lg">Plano Atual: Gratuito</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-2">
                    <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Até 10 pacientes ativos</div>
                    <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Agenda básica</div>
                    <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-green-500"/> Suporte comunitário</div>
                 </CardContent>
              </Card>
              <Button asChild>
                  <a href="/#planos" target="_blank" rel="noopener noreferrer">Ver Planos e Fazer Upgrade</a>
              </Button>
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
    </div>
  );
}
