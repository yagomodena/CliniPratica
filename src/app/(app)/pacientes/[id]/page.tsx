
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, FileText, PlusCircle, Trash2, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// Placeholder data for a specific patient
const patientDetails = {
  p001: {
    id: 'p001',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '(11) 98765-4321',
    dob: '1985-03-15',
    address: 'Rua Exemplo, 123, São Paulo - SP',
    status: 'Ativo',
    avatar: 'https://picsum.photos/seed/p001/100/100',
    history: [
      { date: '2024-07-15', type: 'Consulta Inicial', notes: 'Paciente relata histórico de ansiedade. Iniciado plano alimentar focado em alimentos calmantes.' },
      { date: '2024-06-10', type: 'Retorno', notes: 'Acompanhamento do plano alimentar. Paciente refere melhora nos sintomas de ansiedade. Ajustes realizados.' },
    ],
    documents: [
      { name: 'Exame_Sangue_Jun24.pdf', uploadDate: '2024-06-11', url: '#' },
      { name: 'Receita_Medica.jpg', uploadDate: '2024-07-15', url: '#' },
    ]
  },
  // Add other patient details similarly...
  'carlos-souza': {
     id: 'p002', name: 'Carlos Souza', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ', status: 'Ativo', avatar: 'https://picsum.photos/seed/p002/100/100', history: [], documents: []
  },
   'beatriz-lima': {
     id: 'p003', name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 99999-8888', dob: '1978-05-01', address: 'Praça Modelo, 789, Belo Horizonte - MG', status: 'Ativo', avatar: 'https://picsum.photos/seed/p003/100/100', history: [], documents: []
  },
   'daniel-costa': {
      id: 'p004', name: 'Daniel Costa', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR', status: 'Inativo', avatar: 'https://picsum.photos/seed/p004/100/100', history: [], documents: []
   },
   'fernanda-oliveira': {
        id: 'p005', name: 'Fernanda Oliveira', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS', status: 'Ativo', avatar: 'https://picsum.photos/seed/p005/100/100', history: [], documents: []
   }
};

type Patient = typeof patientDetails['p001']; // Infer type from one entry

export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string; // Get ID from URL
  const patient: Patient | undefined = patientDetails[patientId as keyof typeof patientDetails]; // Find patient data

  if (!patient) {
    // Handle case where patient is not found
     return (
        <div className="text-center py-10">
           <h1 className="text-2xl font-semibold mb-4">Paciente não encontrado</h1>
           <Button onClick={() => router.push('/pacientes')}>Voltar para Pacientes</Button>
        </div>
     );
  }

  const calculateAge = (dob: string) => {
      if (!dob) return '-';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age;
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
         <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
       </Button>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
               <Avatar className="h-20 w-20 border">
                 <AvatarImage src={patient.avatar} alt={patient.name} data-ai-hint="person face"/>
                 <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
               </Avatar>
               <div>
                  <CardTitle className="text-2xl">{patient.name}</CardTitle>
                  <CardDescription>
                     {calculateAge(patient.dob)} anos - {patient.status}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">{patient.email}</p>
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
               </div>
           </div>
           <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Editar Cadastro
                </Button>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Paciente
                </Button>
            </div>
        </CardHeader>

        <CardContent className="p-0">
           <Tabs defaultValue="historico" className="w-full">
             <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 py-0">
               <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-3 h-auto">Histórico</TabsTrigger>
               <TabsTrigger value="documentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-3 h-auto">Documentos</TabsTrigger>
               <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-3 h-auto">Dados Cadastrais</TabsTrigger>
             </TabsList>

             {/* Histórico Tab */}
             <TabsContent value="historico" className="p-6 space-y-6 mt-0">
                <h3 className="text-lg font-semibold">Novo Atendimento</h3>
                 <div className="space-y-2">
                     <Label htmlFor="atendimento-notas">Observações do Atendimento</Label>
                     <Textarea id="atendimento-notas" placeholder="Registre aqui os detalhes da consulta, evolução, plano, etc." rows={4}/>
                 </div>
                 <Button><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Atendimento</Button>

                <h3 className="text-lg font-semibold pt-6 border-t">Histórico de Atendimentos</h3>
                {patient.history.length > 0 ? (
                   patient.history.map((item, index) => (
                    <Card key={index} className="bg-muted/50">
                        <CardHeader className="pb-3">
                           <CardTitle className="text-base flex justify-between items-center">
                             <span>{item.type}</span>
                             <span className="text-sm font-normal text-muted-foreground">{item.date}</span>
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground">{item.notes}</p>
                        </CardContent>
                    </Card>
                   ))
                ) : (
                     <p className="text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
                )}
             </TabsContent>

             {/* Documentos Tab */}
             <TabsContent value="documentos" className="p-6 space-y-6 mt-0">
                <h3 className="text-lg font-semibold">Adicionar Documento</h3>
                 <div className="flex items-center gap-4 p-4 border rounded-md border-dashed">
                   <Upload className="h-8 w-8 text-muted-foreground"/>
                    <div>
                       <Label htmlFor="document-upload" className="text-primary font-medium cursor-pointer hover:underline">
                         Clique para fazer upload
                       </Label>
                       <p className="text-xs text-muted-foreground">ou arraste e solte o arquivo aqui (PDF, JPG, PNG)</p>
                       <Input id="document-upload" type="file" className="hidden" />
                    </div>
                 </div>

                 <h3 className="text-lg font-semibold pt-6 border-t">Documentos Anexados</h3>
                 {patient.documents.length > 0 ? (
                     <ul className="space-y-3">
                       {patient.documents.map((doc, index) => (
                          <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                               <div className="flex items-center gap-2">
                                   <FileText className="h-5 w-5 text-primary"/>
                                   <div>
                                       <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{doc.name}</a>
                                       <p className="text-xs text-muted-foreground">Upload em: {doc.uploadDate}</p>
                                   </div>
                               </div>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4"/>
                               </Button>
                           </li>
                       ))}
                     </ul>
                 ) : (
                      <p className="text-muted-foreground text-center py-4">Nenhum documento anexado.</p>
                 )}

             </TabsContent>

             {/* Dados Cadastrais Tab */}
             <TabsContent value="dados" className="p-6 space-y-4 mt-0">
                 <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                     <div><strong>Nome Completo:</strong> {patient.name}</div>
                     <div><strong>Data de Nascimento:</strong> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : '-'}</div>
                     <div><strong>Email:</strong> {patient.email}</div>
                     <div><strong>Telefone:</strong> {patient.phone || '-'}</div>
                     <div className="md:col-span-2"><strong>Endereço:</strong> {patient.address || '-'}</div>
                     <div><strong>Status:</strong> {patient.status}</div>
                 </div>
                  {/* Add other fields as needed */}
                  <div className="pt-6 border-t">
                     <Button variant="outline">
                       <Edit className="mr-2 h-4 w-4" /> Editar Dados Cadastrais
                     </Button>
                  </div>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
