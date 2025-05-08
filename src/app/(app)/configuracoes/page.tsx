
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CreditCard, User, Bell, KeyRound } from "lucide-react";

export default function ConfiguracoesPage() {
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
                    <AvatarImage src="https://picsum.photos/100/100" alt="User Avatar" data-ai-hint="user avatar"/>
                    <AvatarFallback>CP</AvatarFallback>
                 </Avatar>
                 <Button variant="outline">Alterar Foto</Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" defaultValue="Usuário Exemplo" />
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="usuario@clinipratica.com.br" disabled />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input id="phone" type="tel" placeholder="(XX) XXXXX-XXXX" />
                 </div>
                   <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade (Opcional)</Label>
                    <Input id="specialty" placeholder="Ex: Nutricionista" />
                 </div>
               </div>
               <Button>Salvar Alterações</Button>
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
               <Button>Alterar Senha</Button>
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
