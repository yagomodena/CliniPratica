'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Send, Settings, User, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

// Reusing patient data structure and placeholder data
const initialPatients = [
  { id: 'p001', name: 'Ana Silva', email: 'ana.silva@email.com', phone: '(11) 98765-4321', dob: '1985-03-15', address: 'Rua Exemplo, 123, São Paulo - SP', status: 'Ativo' },
  { id: 'p002', name: 'Carlos Souza', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ', status: 'Ativo' },
  { id: 'p003', name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 99999-8888', dob: '1978-05-01', address: 'Praça Modelo, 789, Belo Horizonte - MG', status: 'Ativo' },
  { id: 'p004', name: 'Daniel Costa', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR', status: 'Inativo' },
  { id: 'p005', name: 'Fernanda Oliveira', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS', status: 'Ativo' },
];
// --- End Placeholder Data ---

type NewMessageForm = {
    patientId: string;
    message: string;
    // channel: 'email' | 'whatsapp'; // Placeholder for future implementation
    // scheduleDate?: string; // Placeholder for future implementation
}

export default function MensagensPage() {
  const [activeTab, setActiveTab] = useState("enviadas");
  const [isNovaMensagemDialogOpen, setIsNovaMensagemDialogOpen] = useState(false);
  const [patients] = useState(initialPatients.filter(p => p.status === 'Ativo')); // Only active patients
  const { toast } = useToast();

  const [newMessage, setNewMessage] = useState<NewMessageForm>({
    patientId: '',
    message: '',
  });

  const handleInputChange = (field: keyof NewMessageForm, value: string) => {
    setNewMessage(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof NewMessageForm, value: string) => {
    setNewMessage(prev => ({ ...prev, [field]: value }));
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!newMessage.patientId || !newMessage.message.trim()) {
       toast({
         title: "Erro de Validação",
         description: "Por favor, selecione um paciente e escreva uma mensagem.",
         variant: "destructive",
       });
       return;
     }

     const selectedPatient = patients.find(p => p.id === newMessage.patientId);
     if (!selectedPatient) {
         toast({ title: "Erro", description: "Paciente selecionado inválido.", variant: "destructive" });
         return;
     }

     // Simulate sending message (e.g., log to console, add to 'Enviadas' list in future)
     console.log("Enviando mensagem para:", selectedPatient.name);
     console.log("Mensagem:", newMessage.message);

     // Reset form and close dialog
     setNewMessage({ patientId: '', message: '' });
     setIsNovaMensagemDialogOpen(false);
     toast({
         title: "Sucesso!",
         description: `Mensagem enviada para ${selectedPatient.name}.`,
     });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setActiveTab('automacoes')}>
             <Settings className="mr-2 h-4 w-4" />
             Configurar Automações
           </Button>

           <Dialog open={isNovaMensagemDialogOpen} onOpenChange={setIsNovaMensagemDialogOpen}>
             <DialogTrigger asChild>
               <Button>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Nova Mensagem
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[480px]">
               <DialogHeader>
                 <DialogTitle>Nova Mensagem Manual</DialogTitle>
                 <DialogDescription>
                   Selecione o paciente e escreva a mensagem a ser enviada.
                 </DialogDescription>
               </DialogHeader>
               <form onSubmit={handleSendMessage}>
                 <div className="grid gap-4 py-4">
                    {/* Patient Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="patientId" className="text-right">
                        Paciente*
                      </Label>
                        <Select
                            value={newMessage.patientId}
                            onValueChange={(value) => handleSelectChange('patientId', value)}
                            required
                        >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name} ({patient.email})
                            </SelectItem>
                          ))}
                          {patients.length === 0 && <SelectItem value="no-patients" disabled>Nenhum paciente ativo</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Message Content */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="message" className="text-right pt-2">
                        Mensagem*
                      </Label>
                      <Textarea
                        id="message"
                        value={newMessage.message}
                         onChange={(e) => handleInputChange('message', e.target.value)}
                        className="col-span-3"
                        rows={5}
                        placeholder="Digite sua mensagem aqui..."
                        required
                      />
                    </div>

                    {/* Channel/Scheduling Placeholders (Future) */}
                    <p className="col-span-4 text-xs text-muted-foreground text-center mt-2">
                      (Funcionalidade de seleção de canal e agendamento em breve)
                    </p>

                 </div>
                 <DialogFooter>
                   <DialogClose asChild>
                      <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                   <Button type="submit">Enviar Agora</Button>
                 </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>

        </div>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                     {/* Placeholder for Automation configuration UI */}
                     <Button variant="link" className="mt-2" onClick={() => alert("Funcionalidade de configuração de automações em desenvolvimento.")}>
                        Criar Nova Automação (Em breve)
                    </Button>
                </CardContent>
             </Card>
           </TabsContent>
       </Tabs>

    </div>
  );
}
