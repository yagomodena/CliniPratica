
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, FileText, PlusCircle, Trash2, Upload, Save, X, CalendarPlus, UserCheck, UserX, Plus, Search, Pencil, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { db } from '@/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { TiptapEditor } from '@/components/tiptap-editor';

// Data structure definitions
type HistoryItem = { id?: string; date: string; type: string; notes: string };
type DocumentItem = { name: string; uploadDate: string; url: string };
type Patient = {
  internalId: string;
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
  slug: string;
};

interface AppointmentTypeFirestore { // Renamed to avoid conflict with AppointmentTypeObject local type
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

const getAppointmentTypesPath = (user: any) => {
  const isClinica = user?.plano === 'Clínica';
  const identifier = isClinica ? user.nomeEmpresa : user.uid;
  return collection(db, 'appointmentTypes', identifier, 'tipos');
};

// Structure for appointment types (consistent with AgendaPage)
type AppointmentTypeObject = {
  name: string;
  status: 'active' | 'inactive';
};

const initialAppointmentTypesData: AppointmentTypeObject[] = [
  { name: 'Consulta', status: 'active' },
  { name: 'Retorno', status: 'active' },
  { name: 'Avaliação', status: 'active' },
  { name: 'Observação', status: 'active' },
  { name: 'Outro', status: 'active' },
];


export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientSlug = params.id as string;

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient | undefined>(undefined);

  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [newHistoryType, setNewHistoryType] = useState(''); // Initialize as empty

  const [newDocument, setNewDocument] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeObject[]>([]); // Initialize as empty
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState('');
  const [isManageTypesDialogOpen, setIsManageTypesDialogOpen] = useState(false);
  const [editingTypeInfo, setEditingTypeInfo] = useState<{ originalName: string, currentName: string } | null>(null);
  const [typeToToggleStatusConfirm, setTypeToToggleStatusConfirm] = useState<AppointmentTypeObject | null>(null);

  const [isHistoryNoteModalOpen, setIsHistoryNoteModalOpen] = useState(false);
  const [selectedHistoryNote, setSelectedHistoryNote] = useState<HistoryItem | null>(null);

  const fetchCurrentUserData = useCallback(async () => {
    const authInstance = getAuth(); // Use getAuth() for consistency
    const currentUser = authInstance.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
    const userData = userDoc.data();

    if (!userData) throw new Error("Dados do usuário não encontrados");

    return { ...userData, uid: currentUser.uid };
  }, []);

  const fetchAppointmentTypes = useCallback(async () => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (!currentUser) return;

      const user = await fetchCurrentUserData(); // Call inside this useCallback
      const tiposRef = getAppointmentTypesPath(user);
      const snapshot = await getDocs(tiposRef);

      const tipos: AppointmentTypeObject[] = snapshot.docs.map(docSnap => ({ // Ensure it maps to AppointmentTypeObject
        name: docSnap.data().name,
        status: docSnap.data().status as 'active' | 'inactive', // Cast status
      }));

      setAppointmentTypes(tipos.length > 0 ? tipos : initialAppointmentTypesData); // Fallback to initial if none found
    } catch (error) {
      console.error("Erro ao buscar tipos:", error);
      setAppointmentTypes(initialAppointmentTypesData); // Fallback on error
    }
  }, [fetchCurrentUserData]); // Dependency on fetchCurrentUserData


  const getFirstActiveTypeName = useCallback(() => {
    return appointmentTypes.find(t => t.status === 'active')?.name || '';
  }, [appointmentTypes]);

  // Effect to fetch patient data
  useEffect(() => {
    const fetchPatient = async () => {
      setIsLoading(true);
      try {
        const authInstance = getAuth();
        const user = authInstance.currentUser;

        if (!user) {
          toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const patientsRef = collection(db, 'pacientes');
        const q = query(patientsRef, where('slug', '==', patientSlug), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data() as Omit<Patient, 'internalId'>;
          const fetchedPatient = {
            ...data,
            internalId: docSnap.id,
            slug: patientSlug,
            history: (data.history || []).map((item, index) => ({ ...item, id: item.id || `hist-${index}` })),
          };
          setPatient(fetchedPatient);
          setEditedPatient({ ...fetchedPatient });
        } else {
          toast({ title: "Paciente não encontrado", description: "Verifique se o link está correto.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Erro ao buscar paciente:", error);
        toast({ title: "Erro", description: "Falha ao carregar os dados do paciente.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (patientSlug) {
      fetchPatient();
    } else {
      toast({ title: "Erro", description: "Identificador do paciente não encontrado.", variant: "destructive" });
      setIsLoading(false);
      router.push('/pacientes');
    }
  }, [patientSlug, toast, router]);

  // Effect to fetch appointment types
  useEffect(() => {
    fetchAppointmentTypes();
  }, [fetchAppointmentTypes]);

  // Effect to initialize or update newHistoryType based on patient and appointmentTypes
  useEffect(() => {
    if (appointmentTypes.length > 0) {
      const firstActive = getFirstActiveTypeName();
      let typeToSet = newHistoryType;
      let needsUpdate = false;

      // If patient is loaded, history is empty, and newHistoryType is not set or invalid
      if (patient && patient.history.length === 0) {
        const currentTypeIsValidForEmptyHistory = newHistoryType && appointmentTypes.some(t => t.name === newHistoryType && t.status === 'active');
        if (!currentTypeIsValidForEmptyHistory && firstActive) {
          typeToSet = firstActive;
          needsUpdate = true;
        }
      }
      
      // If newHistoryType is set but no longer valid (not active or doesn't exist)
      const currentTypeIsValidGeneral = newHistoryType && appointmentTypes.some(t => t.name === newHistoryType && t.status === 'active');
      if (newHistoryType && !currentTypeIsValidGeneral) {
        typeToSet = firstActive || '';
        needsUpdate = true;
      } else if (!newHistoryType && firstActive) { // If newHistoryType is empty and active types are available
        typeToSet = firstActive;
        needsUpdate = true;
      }

      if (needsUpdate && newHistoryType !== typeToSet) {
        setNewHistoryType(typeToSet);
      }
    }
  }, [patient, appointmentTypes, getFirstActiveTypeName, newHistoryType]);


  const handleSaveEditedPatient = async () => {
    if (!editedPatient || !editedPatient.internalId) {
      toast({ title: "Erro", description: "Não foi possível identificar o paciente para salvar.", variant: "destructive" });
      return;
    }
    try {
      const patientRef = doc(db, 'pacientes', editedPatient.internalId);
      const dataToSave: Partial<Patient> = {
        name: editedPatient.name || '',
        email: editedPatient.email || '',
        phone: editedPatient.phone || '',
        dob: editedPatient.dob || '',
        address: editedPatient.address || '',
        status: editedPatient.status || 'Ativo',
      };

      await updateDoc(patientRef, dataToSave);

      setPatient({ ...editedPatient }); // Update main patient state
      toast({ title: "Sucesso!", description: `Dados de ${editedPatient.name} atualizados.`, variant: "success" });
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar alterações do paciente:", error);
      toast({ title: "Erro", description: "Não foi possível salvar as alterações do paciente.", variant: "destructive" });
    }
  };


  const handleEditToggle = () => {
    if (isEditing) {
      handleSaveEditedPatient();
    } else if (patient) {
      setEditedPatient({ ...patient });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (patient) {
      setEditedPatient({ ...patient });
    }
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editedPatient) return;
    const { name, value } = e.target;
    setEditedPatient(prev => prev ? { ...prev, [name]: value } : undefined);
  };

  const handleToggleStatus = async () => {
    if (!patient || !patient.internalId) return;

    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      const newStatus = patient.status === 'Ativo' ? 'Inativo' : 'Ativo';

      await updateDoc(patientRef, { status: newStatus });

      setPatient(prev => prev ? { ...prev, status: newStatus } : prev);
      if (editedPatient) {
        setEditedPatient(prev => prev ? { ...prev, status: newStatus } : prev);
      }


      toast({
        title: `Paciente ${newStatus === 'Ativo' ? 'ativado' : 'inativado'}`,
        description: `O status de ${patient.name} foi atualizado com sucesso.`,
        variant: newStatus === 'Ativo' ? 'success' : 'warning',
      });
    } catch (error) {
      console.error("Erro ao atualizar status do paciente:", error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do paciente.',
        variant: 'destructive',
      });
    }
  };


  const handleAddHistory = async () => {
    const isNoteEmpty = !newHistoryNote || newHistoryNote.trim() === '<p></p>' || newHistoryNote.trim() === '';

    if (isNoteEmpty || !patient || !patient.internalId || !newHistoryType.trim()) {
      toast({ title: "Campos Obrigatórios", description: "Tipo de atendimento e observações são necessários.", variant: "destructive" });
      return;
    }
    const activeType = appointmentTypes.find(t => t.name === newHistoryType && t.status === 'active');
    if (!activeType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo ou não existe.", variant: "destructive" });
      return;
    }

    const newEntry: HistoryItem = {
      id: `hist-${Date.now()}`, // Simple unique ID for client-side keying
      date: new Date().toISOString().split('T')[0],
      type: newHistoryType,
      notes: newHistoryNote,
    };

    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      const updatedHistory = [newEntry, ...(patient.history || [])];
      await updateDoc(patientRef, { history: updatedHistory });

      const updatedPatientData = { ...patient, history: updatedHistory };
      setPatient(updatedPatientData);
      if(isEditing) setEditedPatient(updatedPatientData); // Keep editedPatient in sync if editing mode is on
      setNewHistoryNote('');
      setNewHistoryType(getFirstActiveTypeName());
      toast({ title: "Histórico Adicionado", description: `Novo registro de ${newHistoryType} adicionado.`, variant: "success" });
    } catch (error) {
      console.error("Erro ao adicionar histórico:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar o registro ao histórico.", variant: "destructive" });
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument(e.target.files[0]);
    }
  };

  const handleDocumentUpload = () => {
    if (!newDocument || !patient) return;
    // Implement actual Firebase Storage upload here in a real app
    const newDocEntry: DocumentItem = {
      name: newDocument.name,
      uploadDate: new Date().toISOString().split('T')[0],
      url: URL.createObjectURL(newDocument), // Placeholder URL
    };
    const updatedPatientData = { ...patient, documents: [newDocEntry, ...(patient.documents || [])] };
    setPatient(updatedPatientData);
     if(isEditing) setEditedPatient(updatedPatientData);
    setNewDocument(null);
    const fileInput = document.getElementById('document-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    toast({ title: "Documento Anexado (Simulado)", description: `Documento "${newDocEntry.name}" adicionado localmente. Upload real não implementado.`, variant: "success" });
  };

  const handleDeleteDocument = (docName: string) => {
    if (!patient) return;
    // Implement actual Firebase Storage deletion here in a real app
    const updatedDocs = (patient.documents || []).filter(doc => doc.name !== docName);
    const updatedPatientData = { ...patient, documents: updatedDocs };
    setPatient(updatedPatientData);
    if(isEditing) setEditedPatient(updatedPatientData);
    toast({ title: "Documento Excluído (Simulado)", description: `Documento "${docName}" removido localmente.`, variant: "default" });
  };

  const handleDeletePatient = async () => {
    if (!patient || !patient.internalId) return;

    try {
      await deleteDoc(doc(db, 'pacientes', patient.internalId));

      toast({
        title: 'Paciente excluído',
        description: `O paciente ${patient.name} foi removido com sucesso.`,
        variant: 'success', // Or destructive
      });

      router.push('/pacientes');
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCustomType = async () => {
    const trimmedName = newCustomTypeName.trim();
    if (!trimmedName) {
      toast({ title: "Nome Inválido", description: "O nome do tipo não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (appointmentTypes.some(type => type.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }
    
    try {
      const user = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(user);
      // Firestore document ID can be auto-generated or based on name
      const docId = trimmedName.toLowerCase().replace(/\s+/g, '_'); // Example ID generation
      await setDoc(doc(tiposRef, docId), { // Use setDoc with a specific ID or addDoc for auto-ID
        name: trimmedName,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      setNewCustomTypeName('');
      setIsAddTypeDialogOpen(false);
      toast({ title: "Sucesso", description: "Tipo de atendimento adicionado." });
      fetchAppointmentTypes(); // Refresh list
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error);
      toast({ title: "Erro", description: "Falha ao adicionar tipo.", variant: "destructive" });
    }
  };

  const handleSaveEditedTypeName = async () => {
    if (!editingTypeInfo) return;
    const { originalName, currentName } = editingTypeInfo;
    const newNameTrimmed = currentName.trim();

    if (!newNameTrimmed) {
      toast({ title: "Nome Inválido", description: "O nome não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalName.toLowerCase() && appointmentTypes.some(type => type.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }
    
    try {
      const user = await fetchCurrentUserData();
      const tiposRef = getAppointmentTypesPath(user);
      const q = query(tiposRef, where("name", "==", originalName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("Tipo original não encontrado para editar.");
      const docToUpdateRef = querySnapshot.docs[0].ref;
      
      await updateDoc(docToUpdateRef, { name: newNameTrimmed });

      setEditingTypeInfo(null);
      toast({ title: "Sucesso", description: "Nome do tipo atualizado." });
      fetchAppointmentTypes(); // Refresh list
      // Update newHistoryType if it was the one being edited
      if (newHistoryType === originalName) setNewHistoryType(newNameTrimmed);

    } catch (error) {
        console.error("Erro ao editar nome do tipo:", error);
        toast({ title: "Erro", description: "Falha ao editar nome do tipo.", variant: "destructive" });
    }
  };

  const handleToggleTypeStatus = async (typeName: string) => {
    const typeToToggle = appointmentTypes.find(t => t.name === typeName);
    if (!typeToToggle) return;

    const newStatus = typeToToggle.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive' && activeAppointmentTypes.length <= 1) {
      toast({ title: "Atenção", description: "Não é possível desativar o último tipo de atendimento ativo.", variant: "warning" });
      setTypeToToggleStatusConfirm(null); // Close confirm dialog
      return;
    }

    try {
        const user = await fetchCurrentUserData();
        const tiposRef = getAppointmentTypesPath(user);
        const q = query(tiposRef, where("name", "==", typeName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) throw new Error("Tipo não encontrado para alterar status.");
        const docToUpdateRef = querySnapshot.docs[0].ref;

        await updateDoc(docToUpdateRef, { status: newStatus });

        setTypeToToggleStatusConfirm(null);
        toast({ title: "Status Alterado", description: `Tipo "${typeName}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.` });
        fetchAppointmentTypes(); // Refresh list
        // If the currently selected newHistoryType was just deactivated, reset it
        if (newHistoryType === typeName && newStatus === 'inactive') {
            setNewHistoryType(getFirstActiveTypeName() || '');
        }
    } catch (error) {
        console.error("Erro ao alterar status do tipo:", error);
        toast({ title: "Erro", description: "Falha ao alterar status do tipo.", variant: "destructive" });
        setTypeToToggleStatusConfirm(null);
    }
  };

  const activeAppointmentTypes = appointmentTypes.filter(t => t.status === 'active');

  const handleOpenHistoryModal = (note: HistoryItem) => {
    setSelectedHistoryNote(note);
    setIsHistoryNoteModalOpen(true);
  };


  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p>Carregando dados do paciente...</p>
      </div>
    );
  }

  if (!patient && !isLoading) { // Ensure not loading before showing not found
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold mb-4">Paciente não encontrado</h1>
        <Button onClick={() => router.push('/pacientes')}>Voltar para Pacientes</Button>
      </div>
    );
  }

  const displayPatient = isEditing ? editedPatient : patient; // Use patient data for display if not editing
  if (!displayPatient) { // Fallback if displayPatient is somehow null after loading checks
      return <div className="text-center py-10"><p>Erro ao carregar dados do paciente.</p></div>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleEditToggle}>
                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={displayPatient.status === 'Ativo' ? 'text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-black' : 'text-green-600 border-green-300 hover:bg-green-50 hover:text-black'}
                  >
                    {displayPatient.status === 'Ativo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                    {displayPatient.status === 'Ativo' ? 'Inativar Paciente' : 'Ativar Paciente'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja {displayPatient.status === 'Ativo' ? 'inativar' : 'ativar'} o paciente <strong>{displayPatient.name}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className={displayPatient.status === 'Inativo' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                      onClick={handleToggleStatus}
                    >
                      {displayPatient.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button variant="outline" size="sm" onClick={handleEditToggle}>
                <Edit className="mr-2 h-4 w-4" /> Editar Cadastro
              </Button>

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
                      Tem certeza que deseja excluir o paciente <strong>{displayPatient.name}</strong>? Esta ação não pode ser desfeita e removerá todo o histórico associado.
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
              <AvatarImage src={displayPatient?.avatar} alt={displayPatient?.name} data-ai-hint="person face" />
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

            <TabsContent value="historico" className="p-6 space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center"><CalendarPlus className="mr-2 h-5 w-5 text-primary" /> Novo Registro de Atendimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="atendimento-tipo">Tipo de Atendimento</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Select
                        value={newHistoryType}
                        onValueChange={(value) => setNewHistoryType(value)}
                      >
                        <SelectTrigger id="atendimento-tipo" className="flex-grow">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAppointmentTypes.map((type) => <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>)}
                          {activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum tipo ativo</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar novo tipo">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar tipos">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="atendimento-notas">Observações</Label>
                    <div className="mt-1">
                      <TiptapEditor
                        content={newHistoryNote}
                        onChange={setNewHistoryNote}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleAddHistory} disabled={(!newHistoryNote || newHistoryNote.trim() === '<p></p>' || newHistoryNote.trim() === '') || !newHistoryType.trim()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar ao Histórico
                  </Button>
                </CardFooter>
              </Card>

              <h3 className="text-lg font-semibold pt-6 border-t">Evolução do Paciente</h3>
              {displayPatient?.history && displayPatient.history.length > 0 ? (
                [...displayPatient.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                  <Card key={item.id || item.date} className="bg-muted/50">
                    <CardHeader className="pb-3 flex flex-row justify-between items-center">
                      <CardTitle className="text-base">
                        {item.type}
                      </CardTitle>
                      <span className="text-sm font-normal text-muted-foreground">{formatDate(item.date)}</span>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm text-foreground history-note-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: item.notes.length > 250 ? item.notes.substring(0, 250) + "..." : item.notes
                        }}
                      />
                      {item.notes.length > 250 && (
                        <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary" onClick={() => handleOpenHistoryModal(item)}>
                          Ver Detalhes
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
              )}
            </TabsContent>

            <TabsContent value="documentos" className="p-6 space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Adicionar Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border rounded-md border-dashed">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <Label htmlFor="document-upload" className={`font-medium cursor-pointer hover:underline ${newDocument ? 'text-green-600' : 'text-primary'}`}>
                        {newDocument ? `Arquivo selecionado: ${newDocument.name}` : 'Clique para fazer upload'}
                      </Label>
                      <p className="text-xs text-muted-foreground">ou arraste e solte o arquivo aqui (PDF, JPG, PNG)</p>
                      <Input id="document-upload" type="file" className="hidden" onChange={handleDocumentChange} accept=".pdf,.jpg,.jpeg,.png" />
                    </div>
                  </div>
                  <Button onClick={handleDocumentUpload} disabled={!newDocument}>
                    <Upload className="mr-2 h-4 w-4" /> Enviar Documento Selecionado
                  </Button>
                </CardContent>
              </Card>

              <h3 className="text-lg font-semibold pt-6 border-t">Documentos Anexados</h3>
              {displayPatient?.documents && displayPatient.documents.length > 0 ? (
                <ul className="space-y-3">
                  {[...displayPatient.documents].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).map((doc, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline block truncate" title={doc.name}>{doc.name}</a>
                          <p className="text-xs text-muted-foreground">Upload em: {formatDate(doc.uploadDate)}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" title="Excluir documento">
                            <Trash2 className="h-4 w-4" />
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* History Note Detail Modal */}
      <Dialog open={isHistoryNoteModalOpen} onOpenChange={setIsHistoryNoteModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento - {selectedHistoryNote?.type}</DialogTitle>
            <DialogDescription>
              Data: {selectedHistoryNote ? formatDate(selectedHistoryNote.date) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {selectedHistoryNote && (
              <div
                className="history-note-content prose prose-sm sm:prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedHistoryNote.notes }}
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Add New Appointment Type Dialog */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Tipo de Atendimento</DialogTitle>
            <DialogDescription>Insira o nome do novo tipo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newCustomTypeName">Nome do Tipo</Label>
            <Input
              id="newCustomTypeName"
              value={newCustomTypeName}
              onChange={(e) => setNewCustomTypeName(e.target.value)}
              placeholder="Ex: Sessão Extra"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCustomTypeName('')}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleAddCustomType}>Salvar Tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Appointment Types Dialog */}
      <Dialog open={isManageTypesDialogOpen} onOpenChange={setIsManageTypesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle>
            <DialogDescription>Edite ou altere o status dos tipos de atendimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {appointmentTypes.map((type) => (
              <div key={type.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingTypeInfo?.originalName === type.name ? (
                  <div className="flex-grow flex items-center gap-2 mr-2">
                    <Input
                      value={editingTypeInfo.currentName}
                      onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)}
                      className="h-8"
                    />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedTypeName} title="Salvar Nome"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo(null)} title="Cancelar Edição"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <span className={`flex-grow ${type.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{type.name}</span>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {editingTypeInfo?.originalName !== type.name && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo({ originalName: type.name, currentName: type.name })} title="Editar Nome">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Switch
                    checked={type.status === 'active'}
                    onCheckedChange={() => {
                      const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;
                      if (type.status === 'active' && activeTypesCount <= 1) {
                        toast({ title: "Atenção", description: "Não é possível desativar o último tipo de atendimento ativo.", variant: "warning" });
                        return;
                      }
                      setTypeToToggleStatusConfirm(type);
                    }}
                    aria-label={`Status do tipo ${type.name}`}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400 flex-shrink-0"
                  />
                </div>
              </div>
            ))}
            {appointmentTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo cadastrado.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Appointment Type Status Dialog */}
      <AlertDialog open={!!typeToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setTypeToToggleStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {typeToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} o tipo "{typeToToggleStatusConfirm?.name}"?
              {typeToToggleStatusConfirm?.status === 'active' && " Se desativado, não estará mais disponível para novos registros de histórico, mas os existentes não serão alterados."}
              {typeToToggleStatusConfirm?.status === 'inactive' && " Se ativado, estará disponível para novos registros de histórico."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypeToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => typeToToggleStatusConfirm && handleToggleTypeStatus(typeToToggleStatusConfirm.name)}
              className={typeToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
            >
              {typeToToggleStatusConfirm?.status === 'active' ? 'Desativar Tipo' : 'Ativar Tipo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

