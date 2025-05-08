
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Send, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function MensagensPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
        <div className="flex gap-2">
           <Button variant="outline">
             <Settings className="mr-2 h-4 w-4" />
             Configurar Automações
           </Button>
           <Button>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Nova Mensagem
           </Button>
        </div>
      </div>

       <Tabs defaultValue="enviadas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enviadas">Enviadas</TabsTrigger>
          <TabsTrigger value="agendadas">Agendadas</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
        </TabsList>
         <TabsContent value="enviadas">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Mensagens Enviadas</CardTitle>
                <CardDescription>Histórico de mensagens enviadas manualmente ou por automações.</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-16 text-muted-foreground">
                <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma mensagem enviada recentemente.</p>
                <p className="text-sm">O histórico aparecerá aqui.</p>
              </CardContent>
            </Card>
         </TabsContent>
          <TabsContent value="agendadas">
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Mensagens Agendadas</CardTitle>
                    <CardDescription>Mensagens programadas para envio futuro.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-16 text-muted-foreground">
                     <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma mensagem agendada.</p>
                </CardContent>
             </Card>
          </TabsContent>
           <TabsContent value="automacoes">
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Automações Ativas</CardTitle>
                    <CardDescription>Configure lembretes e outras mensagens automáticas (WhatsApp e Email - funcionalidade em desenvolvimento).</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-16 text-muted-foreground">
                     <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma automação configurada.</p>
                     <Button variant="link" className="mt-2">Configurar Automações</Button>
                </CardContent>
             </Card>
           </TabsContent>
       </Tabs>


    </div>
  );
}
