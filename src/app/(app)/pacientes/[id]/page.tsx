
'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, FileText, PlusCircle, Trash2, Upload, Save, X, CalendarPlus, UserCheck, UserX } from "lucide-react"; // Added UserCheck, UserX
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge'; // Import Badge

// --- In-memory Store Simulation ---
// NOTE: This is a basic simulation. Changes here won't persist across page reloads
// or be shared between different patient detail pages without more complex state management.
// A real application would use a proper database and API.
let patientStore: { [key: string]: Patient } = {
   'ana-silva': {
    internalId: 'int-p001', // Added internalId
    id: 'p001',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '(11) 98765-4321',
    dob: '1985-03-15',
    address: 'Rua Exemplo, 123, São Paulo - SP',
    status: 'Ativo',
    avatar: 'https://placehold.co/100x100.png',
    history: [
      { date: '2024-07-15', type: 'Consulta Inicial', notes: 'Paciente relata histórico de ansiedade. Iniciado plano alimentar focado em alimentos calmantes.' },
      { date: '2024-06-10', type: 'Retorno', notes: 'Acompanhamento do plano alimentar. Paciente refere melhora nos sintomas de ansiedade. Ajustes realizados.' },
    ],
    documents: [
      { name: 'Exame_Sangue_Jun24.pdf', uploadDate: '2024-06-11', url: '#' },
      { name: 'Receita_Medica.jpg', uploadDate: '2024-07-15', url: '#' },
    ]
  },
  'carlos-souza': {
     internalId: 'int-p002', id: 'p002', name: 'Carlos Souza', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ', status: 'Ativo', avatar: 'https://placehold.co/100x100.png', history: [], documents: []
  },
   'beatriz-lima': {
     internalId: 'int-p003', id: 'p003', name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 99999-8888', dob: '1978-05-01', address: 'Praça Modelo, 789, Belo Horizonte - MG', status: 'Ativo', avatar: 'https://placehold.co/100x100.png', history: [], documents: []
  },
   'daniel-costa': {
      internalId: 'int-p004', id: 'p004', name: 'Daniel Costa', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR', status: 'Inativo', avatar: 'https://placehold.co/100x100.png', history: [], documents: []
   },
   'fernanda-oliveira': {
        internalId: 'int-p005', id: 'p005', name: 'Fernanda Oliveira', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS', status: 'Ativo', avatar: 'https://placehold.co/100x100.png', history: [], documents: []
   }
};
// Function to update the global store (simulated)
const updatePatientInStore = (slug: string, updatedData: Patient) => {
    if (patientStore[slug]) {
        patientStore[slug] = updatedData;
        console.log("Patient store updated for:", slug);
    }
};
const deletePatientFromStore = (slug: string) => {
    if (patientStore[slug]) {
        delete patientStore[slug];
        console.log("Patient deleted from store:", slug);
    }
};
// --- End In-memory Store Simulation ---


// Data structure definitions
type HistoryItem = { date: string; type: string; notes: string };
type DocumentItem = { name: string; uploadDate: string; url: string };
type Patient = {
  internalId: string; // Added internal ID for more reliable state updates
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  status: 'Ativo' | 'Inativo';
  avatar: string;
  history: HistoryItem[];
  documents: DocumentItem[];
};


export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientSlug = params.id as string; // Use slug from URL

  // State for patient data and edit mode
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient | undefined>(undefined);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [newHistoryType, setNewHistoryType] = useState('Consulta');
  const [newDocument, setNewDocument] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state

   // Fetch patient data on mount (simulation)
   useEffect(() => {
     const currentPatientData = patientStore[patientSlug];
     if (currentPatientData) {
        setPatient(currentPatientData);
        setEditedPatient({ ...currentPatientData }); // Initialize edited state as well
     } else {
        // Handle patient not found (maybe redirect or show error)
        console.error("Patient not found with slug:", patientSlug);
        // Could redirect here: router.push('/pacientes');
     }
     setIsLoading(false);
   }, [patientSlug]); // Depend on slug

  const handleEditToggle = () => {
     if (isEditing && editedPatient) {
       // Save changes
       setPatient({ ...editedPatient }); // Update local display state
       updatePatientInStore(patientSlug, editedPatient); // Update simulated global store
       console.log("Patient data saved:", editedPatient);
       toast({ title: "Sucesso!", description: `Dados de ${editedPatient.name} atualizados.`, variant: "success" });
       setIsEditing(false); // Exit edit mode AFTER saving
     } else if (patient) {
       // Enter edit mode, ensure editedPatient is synced with current patient data
       setEditedPatient({ ...patient });
       setIsEditing(true);
     }
  };

  const handleCancelEdit = () => {
     if (patient) {
        setEditedPatient({ ...patient }); // Reset changes to original patient data
     }
     setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
     if (!editedPatient) return;
     const { name, value } = e.target;
     setEditedPatient(prev => prev ? { ...prev, [name]: value } : undefined);
  };

   const handleToggleStatus = () => {
      if (!patient) return;
      const newStatus = patient.status === 'Ativo' ? 'Inativo' : 'Ativo';
      const updatedPatient = { ...patient, status: newStatus };

      setPatient(updatedPatient); // Update local display state
      setEditedPatient(updatedPatient); // Keep edited state in sync
      updatePatientInStore(patientSlug, updatedPatient); // Update simulated global store

      toast({
         title: "Status Alterado",
         description: `Status de ${patient.name} alterado para ${newStatus}.`,
         variant: newStatus === 'Inativo' ? 'warning' : 'success' // Use 'warning' for Inativo, 'success' for Ativo
      });
      console.log(`Status toggled for ${patient.name} to ${newStatus}`);
   };


  const handleAddHistory = () => {
    if (!newHistoryNote.trim() || !patient) return;
    const newEntry: HistoryItem = {
      date: new Date().toISOString().split('T')[0],
      type: newHistoryType,
      notes: newHistoryNote,
    };
    const updatedPatient = { ...patient, history: [newEntry, ...patient.history] };
    setPatient(updatedPatient);
    setEditedPatient(updatedPatient); // Keep edited state in sync
    updatePatientInStore(patientSlug, updatedPatient);
    setNewHistoryNote('');
    setNewHistoryType('Consulta');
    toast({ title: "Histórico Adicionado", description: `Novo registro de ${newHistoryType} adicionado.`, variant: "success" });
    console.log("New history added:", newEntry);
  };

   const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument(e.target.files[0]);
    }
  };

  const handleDocumentUpload = () => {
    if (!newDocument || !patient) return;
    const newDocEntry: DocumentItem = {
      name: newDocument.name,
      uploadDate: new Date().toISOString().split('T')[0],
      url: URL.createObjectURL(newDocument), // In real app, upload to server and get URL
    };
    const updatedPatient = { ...patient, documents: [newDocEntry, ...patient.documents] };
    setPatient(updatedPatient);
    setEditedPatient(updatedPatient);
    updatePatientInStore(patientSlug, updatedPatient);
    setNewDocument(null);
    const fileInput = document.getElementById('document-upload') as HTMLInputElement;
     if (fileInput) fileInput.value = '';
    toast({ title: "Documento Enviado", description: `Documento "${newDocEntry.name}" anexado.`, variant: "success" });
    console.log("Document uploaded:", newDocEntry);
  };

  const handleDeleteDocument = (docName: string) => {
      if (!patient) return;
      const updatedDocs = patient.documents.filter(doc => doc.name !== docName);
      const updatedPatient = { ...patient, documents: updatedDocs };
      setPatient(updatedPatient);
      setEditedPatient(updatedPatient);
      updatePatientInStore(patientSlug, updatedPatient);
      toast({ title: "Documento Excluído", description: `Documento "${docName}" removido.`, variant: "default" });
      console.log("Document deleted:", docName);
  };

  const handleDeletePatient = () => {
      if (!patient) return;
      const patientName = patient.name;
      deletePatientFromStore(patientSlug); // Remove from simulated store
      console.log("Patient deleted:", patientName);
      toast({ title: "Paciente Excluído", description: `Paciente ${patientName} foi removido com sucesso.`, variant: "destructive" });
      router.push('/pacientes');
  };

   // Loading state display
   if (isLoading) {
       return (
           <div className="text-center py-10">
               <p>Carregando dados do paciente...</p>
               {/* Optional: Add a spinner */}
           </div>
       );
   }

  // Patient not found after loading
  if (!patient) {
     return (
        <div className="text-center py-10">
           <h1 className="text-2xl font-semibold mb-4">Paciente não encontrado</h1>
           <Button onClick={() => router.push('/pacientes')}>Voltar para Pacientes</Button>
        </div>
     );
  }

  const calculateAge = (dob: string) => {
      if (!dob) return '-';
      try {
        const birthDate = parseISO(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : '-';
      } catch (e) {
          console.error("Error parsing date:", dob, e);
          return '-';
      }
  }

   const formatDate = (dateString: string, formatStr = 'PPP') => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return format(date, formatStr, { locale: ptBR });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  // Determine which patient data to display (current or edited)
  const displayPatient = isEditing ? editedPatient : patient;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between mb-4 gap-2 flex-wrap"> {/* Added flex-wrap */}
         <Button variant="outline" onClick={() => router.back()}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
         </Button>
          <div className="flex gap-2 flex-wrap"> {/* Added flex-wrap */}
              {isEditing ? (
                 <>
                     <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                         <X className="mr-2 h-4 w-4" /> Cancelar
                     </Button>
                     <Button size="sm" onClick={handleEditToggle}>
                         <Save className="mr-2 h-4 w-4"/> Salvar Alterações
                     </Button>
                 </>
              ) : (
                 <>
                     {/* Activate/Inactivate Button */}
                     <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                              variant="outline"
                              size="sm"
                              className={patient.status === 'Ativo' ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-green-600 border-green-300 hover:bg-green-50'}
                           >
                             {patient.status === 'Ativo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                             {patient.status === 'Ativo' ? 'Inativar Paciente' : 'Ativar Paciente'}
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
                                <AlertDialogDescription>
                                   Tem certeza que deseja {patient.status === 'Ativo' ? 'inativar' : 'ativar'} o paciente <strong>{patient.name}</strong>?
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className={patient.status === 'Inativo' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                                  onClick={handleToggleStatus}
                                 >
                                  {patient.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                </AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                     </AlertDialog>

                     {/* Edit Button */}
                     <Button variant="outline" size="sm" onClick={handleEditToggle}>
                         <Edit className="mr-2 h-4 w-4" /> Editar Cadastro
                     </Button>

                     {/* Delete Button */}
                     <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                               <Trash2 className="mr-2 h-4 w-4" /> Excluir Paciente
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                               <AlertDialogDescription>
                                   Tem certeza que deseja excluir o paciente <strong>{patient.name}</strong>? Esta ação não pode ser desfeita e removerá todo o histórico associado.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                   className="bg-destructive hover:bg-destructive/90"
                                   onClick={handleDeletePatient}
                                 >
                                   Excluir
                                 </AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                     </AlertDialog>
                 </>
                )}
            </div>
       </div>


      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
               <Avatar className="h-20 w-20 border">
                 <AvatarImage src={displayPatient?.avatar} alt={displayPatient?.name} data-ai-hint="person face"/>
                 <AvatarFallback>{displayPatient?.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
               </Avatar>
               <div>
                  <CardTitle className="text-2xl">{displayPatient?.name}</CardTitle>
                   <div className="flex items-center gap-2 mt-1">
                      <CardDescription>
                         {calculateAge(displayPatient?.dob || '')} anos
                      </CardDescription>
                       <Badge variant={displayPatient?.status === 'Ativo' ? 'default' : 'secondary'} className={`px-2 py-0.5 text-xs ${displayPatient?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                           {displayPatient?.status}
                       </Badge>
                   </div>
                  <p className="text-sm text-muted-foreground mt-1">{displayPatient?.email}</p>
                  <p className="text-sm text-muted-foreground">{displayPatient?.phone}</p>
               </div>
           </div>
        </CardHeader>

        <CardContent className="p-0">
           <Tabs defaultValue="historico" className="w-full">
             <TabsList className="flex flex-wrap w-full items-center justify-start rounded-none border-b bg-transparent px-2 py-0 sm:px-4">
               <TabsTrigger value="historico" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Histórico</TabsTrigger>
               <TabsTrigger value="documentos" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Documentos</TabsTrigger>
               <TabsTrigger value="dados" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Dados Cadastrais</TabsTrigger>
             </TabsList>

             {/* Histórico Tab */}
             <TabsContent value="historico" className="p-6 space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center"><CalendarPlus className="mr-2 h-5 w-5 text-primary"/> Novo Registro de Atendimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                       <div>
                           <Label htmlFor="atendimento-tipo">Tipo de Atendimento</Label>
                           <select
                               id="atendimento-tipo"
                               value={newHistoryType}
                               onChange={(e) => setNewHistoryType(e.target.value)}
                               className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                           >
                               <option>Consulta</option>
                               <option>Retorno</option>
                               <option>Avaliação</option>
                               <option>Observação</option>
                           </select>
                       </div>
                       <div>
                           <Label htmlFor="atendimento-notas">Observações</Label>
                           <Textarea
                               id="atendimento-notas"
                               placeholder="Registre aqui os detalhes da consulta, evolução, plano, etc."
                               rows={4}
                               value={newHistoryNote}
                               onChange={(e) => setNewHistoryNote(e.target.value)}
                           />
                       </div>
                  </CardContent>
                  <CardFooter>
                      <Button onClick={handleAddHistory} disabled={!newHistoryNote.trim()}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar ao Histórico</Button>
                  </CardFooter>
                </Card>

                <h3 className="text-lg font-semibold pt-6 border-t">Evolução do Paciente</h3>
                {displayPatient?.history && displayPatient.history.length > 0 ? (
                   [...displayPatient.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, index) => (
                    <Card key={index} className="bg-muted/50">
                        <CardHeader className="pb-3 flex flex-row justify-between items-center">
                           <CardTitle className="text-base">
                             {item.type}
                           </CardTitle>
                             <span className="text-sm font-normal text-muted-foreground">{formatDate(item.date)}</span>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{item.notes}</p>
                        </CardContent>
                    </Card>
                   ))
                ) : (
                     <p className="text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
                )}
             </TabsContent>

             {/* Documentos Tab */}
             <TabsContent value="documentos" className="p-6 space-y-6 mt-0">
                 <Card>
                     <CardHeader>
                         <CardTitle className="text-lg font-semibold">Adicionar Documento</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                         <div className="flex items-center gap-4 p-4 border rounded-md border-dashed">
                           <Upload className="h-8 w-8 text-muted-foreground"/>
                            <div>
                               <Label htmlFor="document-upload" className={`font-medium cursor-pointer hover:underline ${newDocument ? 'text-green-600' : 'text-primary'}`}>
                                 {newDocument ? `Arquivo selecionado: ${newDocument.name}` : 'Clique para fazer upload'}
                               </Label>
                               <p className="text-xs text-muted-foreground">ou arraste e solte o arquivo aqui (PDF, JPG, PNG)</p>
                               <Input id="document-upload" type="file" className="hidden" onChange={handleDocumentChange} accept=".pdf,.jpg,.jpeg,.png"/>
                            </div>
                         </div>
                           <Button onClick={handleDocumentUpload} disabled={!newDocument}>
                             <Upload className="mr-2 h-4 w-4"/> Enviar Documento Selecionado
                           </Button>
                     </CardContent>
                 </Card>

                 <h3 className="text-lg font-semibold pt-6 border-t">Documentos Anexados</h3>
                 {displayPatient?.documents && displayPatient.documents.length > 0 ? (
                     <ul className="space-y-3">
                       {[...displayPatient.documents].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).map((doc, index) => (
                          <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                               <div className="flex items-center gap-3">
                                   <FileText className="h-5 w-5 text-primary flex-shrink-0"/>
                                   <div className="flex-1 min-w-0">
                                       <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline block truncate" title={doc.name}>{doc.name}</a>
                                       <p className="text-xs text-muted-foreground">Upload em: {formatDate(doc.uploadDate)}</p>
                                   </div>
                               </div>
                                <AlertDialog>
                                   <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" title="Excluir documento">
                                          <Trash2 className="h-4 w-4"/>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Tem certeza que deseja excluir o documento "{doc.name}"?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                           <AlertDialogAction variant="destructive" onClick={() => handleDeleteDocument(doc.name)}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                               </AlertDialog>
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
                  {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                           <div className="space-y-1">
                              <Label htmlFor="edit-name">Nome Completo</Label>
                              <Input id="edit-name" name="name" value={editedPatient?.name || ''} onChange={handleInputChange} />
                           </div>
                           <div className="space-y-1">
                              <Label htmlFor="edit-dob">Data de Nascimento</Label>
                              <Input id="edit-dob" name="dob" type="date" value={editedPatient?.dob || ''} onChange={handleInputChange} />
                           </div>
                            <div className="space-y-1">
                              <Label htmlFor="edit-email">Email</Label>
                              <Input id="edit-email" name="email" type="email" value={editedPatient?.email || ''} onChange={handleInputChange} />
                           </div>
                           <div className="space-y-1">
                              <Label htmlFor="edit-phone">Telefone</Label>
                              <Input id="edit-phone" name="phone" type="tel" value={editedPatient?.phone || ''} onChange={handleInputChange} />
                           </div>
                           <div className="md:col-span-2 space-y-1">
                              <Label htmlFor="edit-address">Endereço</Label>
                              <Input id="edit-address" name="address" value={editedPatient?.address || ''} onChange={handleInputChange} />
                           </div>
                             {/* Status field is editable */}
                             <div className="space-y-1">
                              <Label htmlFor="edit-status">Status</Label>
                               <select
                                   id="edit-status"
                                   name="status"
                                   value={editedPatient?.status || 'Ativo'}
                                   onChange={handleInputChange}
                                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="Ativo">Ativo</option>
                                  <option value="Inativo">Inativo</option>
                               </select>
                           </div>
                      </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                         <div><strong>Nome Completo:</strong> {patient?.name}</div>
                         <div><strong>Data de Nascimento:</strong> {formatDate(patient?.dob || '')}</div>
                         <div><strong>Email:</strong> {patient?.email}</div>
                         <div><strong>Telefone:</strong> {patient?.phone || '-'}</div>
                         <div className="md:col-span-2"><strong>Endereço:</strong> {patient?.address || '-'}</div>
                         <div><strong>Status:</strong>
                           <Badge variant={patient?.status === 'Ativo' ? 'default' : 'secondary'} className={`ml-2 px-2 py-0.5 text-xs ${patient?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             {patient?.status}
                           </Badge>
                         </div>
                     </div>
                  )}
                  {/* Removed Save/Cancel button container from here, moved to top */}
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

