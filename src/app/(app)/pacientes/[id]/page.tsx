
'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, FileText, PlusCircle, Trash2, Upload, Save, X, CalendarPlus, UserCheck, UserX, Plus, Search, Pencil, Eye, FileDown, Loader2, Info, MoreVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { format, parseISO, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { db, storage, auth } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const TiptapEditor = dynamic(() => import('@/components/tiptap-editor').then(mod => mod.TiptapEditor), {
  ssr: false,
  loading: () => <div className="w-full h-[150px] border border-input rounded-md bg-muted/50 flex items-center justify-center"><p className="text-muted-foreground">Carregando editor...</p></div>,
});

type HistoryItem = { id: string; date: string; type: string; notes: string };
type DocumentItem = { id: string; name: string; uploadDate: string; url: string; storagePath: string; };

type Patient = {
  internalId: string;
  id: string; // slug or Firestore ID. For this context, mostly Firestore ID (internalId).
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
  objetivoPaciente?: string;
  lastVisit?: string; // Added from pacientes/page.tsx for consistency
  nextVisit?: string; // Added from pacientes/page.tsx for consistency
};

type AppointmentTypeObject = {
  id?: string;
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

type PatientObjectiveObject = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
};

const initialPatientObjectivesData: PatientObjectiveObject[] = []; // Starts empty


const getAppointmentTypesPath = (userData: any) => {
  if (!userData) {
    return collection(db, 'appointmentTypes', 'default_fallback_types', 'tipos');
  }
  const isClinica = userData.plano === 'Clínica';
  const identifier = isClinica ? userData.nomeEmpresa : userData.uid;
  if (!identifier) {
    return collection(db, 'appointmentTypes', 'default_fallback_types', 'tipos');
  }
  return collection(db, 'appointmentTypes', identifier, 'tipos');
};

const getPatientObjectivesPath = (userData: any) => {
  if (!userData) {
    return collection(db, 'patientObjectives', 'default_fallback_objectives', 'objetivos');
  }
  const isClinica = userData.plano === 'Clínica';
  const identifier = isClinica ? userData.nomeEmpresa : userData.uid;
  if (!identifier) {
    return collection(db, 'patientObjectives', 'default_fallback_objectives', 'objetivos');
  }
  return collection(db, 'patientObjectives', identifier, 'objetivos');
};


export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientSlug = params.id as string;

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient | undefined>(undefined);

  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [newHistoryType, setNewHistoryType] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeObject[]>([]);
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState('');
  const [isManageTypesDialogOpen, setIsManageTypesDialogOpen] = useState(false);
  const [editingTypeInfo, setEditingTypeInfo] = useState<{ type: AppointmentTypeObject, currentName: string } | null>(null);
  const [typeToToggleStatusConfirm, setTypeToToggleStatusConfirm] = useState<AppointmentTypeObject | null>(null);
  const [isDeleteTypeConfirmOpen, setIsDeleteTypeConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<AppointmentTypeObject | null>(null);

  const [patientObjectives, setPatientObjectives] = useState<PatientObjectiveObject[]>([]);
  const [isAddObjectiveDialogOpen, setIsAddObjectiveDialogOpen] = useState(false);
  const [newCustomObjectiveName, setNewCustomObjectiveName] = useState('');
  const [isManageObjectivesDialogOpen, setIsManageObjectivesDialogOpen] = useState(false);
  const [editingObjectiveInfo, setEditingObjectiveInfo] = useState<{ objective: PatientObjectiveObject, currentName: string } | null>(null);
  const [objectiveToToggleStatusConfirm, setObjectiveToToggleStatusConfirm] = useState<PatientObjectiveObject | null>(null);
  const [isDeleteObjectiveConfirmOpen, setIsDeleteObjectiveConfirmOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState<PatientObjectiveObject | null>(null);

  const [isHistoryNoteModalOpen, setIsHistoryNoteModalOpen] = useState(false);
  const [selectedHistoryNote, setSelectedHistoryNote] = useState<HistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState("historico");

  const [isDeleteHistoryConfirmOpen, setIsDeleteHistoryConfirmOpen] = useState(false);
  const [historyItemToDelete, setHistoryItemToDelete] = useState<HistoryItem | null>(null);
  
  const [currentUserData, setCurrentUserData] = useState<any>(null); 
  const [firebaseUserAuth, setFirebaseUserAuth] = useState<FirebaseUser | null>(null);


  const fetchCurrentUserData = useCallback(async (user: FirebaseUser | null): Promise<any | null> => {
    if (!user) {
      console.warn("fetchCurrentUserData: No user provided.");
      setCurrentUserData(null);
      return null;
    }
    try {
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = { ...userDocSnap.data(), uid: user.uid };
        setCurrentUserData(data); // Set state
        return data; // Return data for immediate use
      }
      console.warn("fetchCurrentUserData: User data not found in Firestore for UID:", user.uid);
      toast({ title: "Erro de Autenticação", description: "Dados do usuário não encontrados.", variant: "destructive" });
      setCurrentUserData(null);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({ title: "Erro de Autenticação", description: "Não foi possível carregar dados do usuário.", variant: "destructive" });
      setCurrentUserData(null);
    }
    return null;
  }, [toast]);


  const fetchAppointmentTypes = useCallback(async (userDataForPath: any) => {
    if (!userDataForPath) {
      console.warn("fetchAppointmentTypes: User data not available. Using fallback.");
      const fallbackTypes = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(fallbackTypes);
      return;
    }
    try {
      const tiposRef = getAppointmentTypesPath(userDataForPath);
      const snapshot = await getDocs(query(tiposRef, orderBy("name"))); // Fetch all, filter client-side or rely on Firestore rules for security
      const allFetchedTypes: AppointmentTypeObject[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
      }));
      const fallbackTypes = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(allFetchedTypes.length > 0 ? allFetchedTypes : fallbackTypes);
    } catch (error: any) {
      console.error("Erro ao buscar tipos de atendimento:", error);
      toast({ title: "Erro ao Carregar Tipos", description: "Não foi possível carregar os tipos de atendimento. Usando padrões.", variant: "warning", duration: 4000 });
      const fallbackTypes = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(fallbackTypes);
    }
  }, [toast]);

  const fetchPatientObjectives = useCallback(async (userDataForPath: any) => {
    if (!userDataForPath) {
      console.warn("fetchPatientObjectives: User data not available. Using fallback.");
      const fallback = initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setPatientObjectives(fallback);
      return;
    }
    try {
      const objectivesRef = getPatientObjectivesPath(userDataForPath);
      const snapshot = await getDocs(query(objectivesRef, orderBy("name")));
      const fetchedObjectives: PatientObjectiveObject[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
      }));
      const fallback = initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setPatientObjectives(fetchedObjectives.length > 0 ? fetchedObjectives : fallback);
    } catch (error: any) {
      console.error("Erro ao buscar objetivos do paciente:", error);
      toast({ title: "Erro ao Carregar Objetivos", description: "Não foi possível carregar os objetivos. Usando padrões.", variant: "warning" });
      const fallback = initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setPatientObjectives(fallback);
    }
  }, [toast]);


  useEffect(() => {
    setIsClient(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUserAuth(user);
    });
    return () => unsubscribeAuth();
  }, []);

  const loadPageData = useCallback(async () => {
    if (!patientSlug || !firebaseUserAuth) {
      setIsLoading(!!patientSlug);
      return;
    }
    setIsLoading(true);
    try {
      const uData = await fetchCurrentUserData(firebaseUserAuth);
      if (!uData) {
        setIsLoading(false);
        router.push('/login'); // Redirect if user data can't be fetched
        return;
      }

      await Promise.all([
        fetchAppointmentTypes(uData),
        fetchPatientObjectives(uData)
      ]);

      const patientsRef = collection(db, 'pacientes');
      const q = query(patientsRef, where('slug', '==', patientSlug), where('uid', '==', firebaseUserAuth.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as Omit<Patient, 'internalId' | 'slug'>;
        
        let uniqueIdCounter = 0;
        const processedHistory = (data.history || []).map((histItem, index) => ({
          ...histItem,
          id: histItem.id || `hist-load-${docSnap.id}-${index}-${uniqueIdCounter++}`
        }));

        const fetchedPatient: Patient = {
          ...data,
          internalId: docSnap.id,
          slug: patientSlug,
          history: processedHistory,
          documents: (data.documents || []).map((doc, idx) => ({ ...doc, id: `doc-load-${docSnap.id}-${idx}` })) as DocumentItem[],
          objetivoPaciente: data.objetivoPaciente || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          dob: data.dob || '',
          address: data.address || '',
          status: data.status || 'Ativo',
          avatar: data.avatar || `https://placehold.co/100x100.png`,
          lastVisit: data.lastVisit || '',
          nextVisit: data.nextVisit || '',
        };
        setPatient(fetchedPatient);
      } else {
        toast({ title: "Paciente não encontrado", description: "Verifique se o link está correto ou se o paciente existe.", variant: "destructive" });
        setPatient(undefined);
        router.push('/pacientes');
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados da página do paciente:", error);
      if (error.message === "Usuário não autenticado" || error.message === "Dados do usuário não encontrados") {
        toast({ title: "Erro de Sessão", description: "Por favor, faça login novamente.", variant: "destructive" });
        router.push('/login');
      } else {
        toast({ title: "Erro ao Carregar Dados", description: `Falha ao carregar os dados da página: ${error.message}`, variant: "destructive" });
      }
      setPatient(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [patientSlug, firebaseUserAuth, router, toast, fetchCurrentUserData, fetchAppointmentTypes, fetchPatientObjectives]);

  useEffect(() => {
    if (firebaseUserAuth && patientSlug) {
      loadPageData();
    } else if (!firebaseUserAuth && !isLoading && patientSlug) {
      // If user is not authenticated but we have a slug and are not loading, it's a redirect case
      router.push('/login');
    }
  }, [firebaseUserAuth, patientSlug, loadPageData, router, isLoading]);


  const getFirstActiveTypeName = useCallback(() => {
    return appointmentTypes.find(t => t.status === 'active')?.name || '';
  }, [appointmentTypes]);

  const getFirstActiveObjectiveName = useCallback(() => {
    return patientObjectives.find(o => o.status === 'active')?.name || '';
  }, [patientObjectives]);

  useEffect(() => {
    if (patient && (appointmentTypes.length > 0 || patientObjectives.length > 0)) {
      const firstActiveObjective = getFirstActiveObjectiveName();
      const currentPatientObjective = patient.objetivoPaciente;
      let finalObjective = currentPatientObjective;

      if (!currentPatientObjective || !patientObjectives.some(po => po.name === currentPatientObjective && po.status === 'active')) {
        finalObjective = firstActiveObjective || '';
      }
    
      setEditedPatient(prev => {
        // Only spread previous editedPatient data if it's for the same patient and edit mode is active
        const basePatientData = {
          ...patient,
          objetivoPaciente: finalObjective,
        };
        if (isEditing && prev && prev.internalId === patient.internalId) {
          return {
            ...basePatientData, // Start with current patient data and the determined objective
            name: prev.name, // Keep existing edits
            email: prev.email,
            phone: prev.phone,
            dob: prev.dob,
            address: prev.address,
            status: prev.status,
            // Ensure 'objetivoPaciente' from prev is considered if it was changed during edit
            objetivoPaciente: prev.objetivoPaciente !== undefined ? prev.objetivoPaciente : finalObjective,
          };
        }
        return basePatientData; // If not editing or different patient, reset to current patient data
      });


      const firstActiveType = getFirstActiveTypeName();
      if (!newHistoryType || !appointmentTypes.find(at => at.name === newHistoryType && at.status === 'active')) {
          setNewHistoryType(firstActiveType || '');
      }
    } else if (patient) { 
      setEditedPatient({ ...patient, objetivoPaciente: patient.objetivoPaciente || '' });
      if (!newHistoryType && appointmentTypes.length > 0) setNewHistoryType(getFirstActiveTypeName() || '');
    }
  }, [patient, appointmentTypes, patientObjectives, getFirstActiveTypeName, getFirstActiveObjectiveName, isEditing, newHistoryType]); // Added isEditing, newHistoryType


  const handleSaveEditedPatient = async () => {
    if (!editedPatient || !editedPatient.internalId || !currentUserData) {
      toast({ title: "Erro", description: "Não foi possível identificar o paciente ou dados do usuário para salvar.", variant: "destructive" });
      return;
    }
     if (editedPatient.dob && isFuture(parseISO(editedPatient.dob))) {
      toast({ title: "Data de Nascimento Inválida", description: "A data de nascimento não pode ser futura.", variant: "destructive" });
      return;
    }
    if (editedPatient.objetivoPaciente && !patientObjectives.find(o => o.name === editedPatient.objetivoPaciente && o.status === 'active')) {
        toast({ title: "Objetivo Inválido", description: "O objetivo do paciente selecionado não está ativo ou não existe.", variant: "destructive" });
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
        objetivoPaciente: editedPatient.objetivoPaciente || '',
      };
      await updateDoc(patientRef, dataToSave);
      setPatient(prev => prev ? { ...prev, ...dataToSave } : undefined); 
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
      setEditedPatient({ 
        ...patient, 
        objetivoPaciente: patient.objetivoPaciente || getFirstActiveObjectiveName() || ''
      });
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
  
  const handleSelectChange = (name: keyof Patient, value: string) => {
    if (!editedPatient) return;
    setEditedPatient(prev => prev ? { ...prev, [name]: value } : undefined);
  }

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
      toast({ title: `Paciente ${newStatus === 'Ativo' ? 'ativado' : 'inativado'}`, description: `O status de ${patient.name} foi atualizado com sucesso.`, variant: newStatus === 'Ativo' ? 'success' : 'warning', });
    } catch (error) {
      console.error("Erro ao atualizar status do paciente:", error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status do paciente.', variant: 'destructive' });
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
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString().split('T')[0], 
      type: newHistoryType,
      notes: newHistoryNote,
    };
    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      
      const currentPatientDoc = await getDoc(patientRef);
      const currentPatientData = currentPatientDoc.data() as Patient | undefined;
      const currentHistory = currentPatientData?.history || [];
      
      const updatedHistory = [newEntry, ...currentHistory]; 

      await updateDoc(patientRef, { history: updatedHistory });

      const updatedPatientState = { ...patient, history: updatedHistory };
      setPatient(updatedPatientState);
      if(isEditing) setEditedPatient(updatedPatientState); 

      setNewHistoryNote('');
      setNewHistoryType(getFirstActiveTypeName() || '');
      toast({ title: "Histórico Adicionado", description: `Novo registro de ${newHistoryType} adicionado.`, variant: "success" });
    } catch (error) {
      console.error("Erro ao adicionar histórico:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar o registro ao histórico.", variant: "destructive" });
    }
  };

  const handleDeletePatient = async () => {
    if (!patient || !patient.internalId) return;
    try {
      await deleteDoc(doc(db, 'pacientes', patient.internalId));
      toast({ title: 'Paciente excluído', description: `O paciente ${patient.name} foi removido com sucesso.`, variant: 'success' });
      router.push('/pacientes');
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o paciente.', variant: 'destructive' });
    }
  };

  const handleAddCustomType = async () => {
    if (!currentUserData) {
      toast({ title: "Erro de Autenticação", description: "Dados do usuário não carregados para adicionar tipo.", variant: "destructive"});
      return;
    }
    const trimmedName = newCustomTypeName.trim();
    if (!trimmedName) {
      toast({ title: 'Erro', description: 'Nome do tipo não pode ser vazio.', variant: 'destructive' });
      return;
    }
    if (appointmentTypes.some(type => type.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }
    try {
      const tiposRef = getAppointmentTypesPath(currentUserData); 
      await addDoc(tiposRef, { name: trimmedName, status: 'active', createdAt: serverTimestamp() });
      toast({ title: 'Sucesso', description: 'Tipo de atendimento adicionado.' });
      setNewCustomTypeName('');
      setIsAddTypeDialogOpen(false);
      await fetchAppointmentTypes(currentUserData); 
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar o tipo de atendimento.', variant: 'destructive' });
    }
  };

  const handleSaveEditedTypeName = async () => {
    if (!editingTypeInfo || !editingTypeInfo.type.id || !currentUserData) {
       toast({ title: 'Erro', description: 'Informações para edição ou dados do usuário incompletos.', variant: 'destructive' });
      return;
    }
    const { type: originalType, currentName } = editingTypeInfo;
    const newNameTrimmed = currentName.trim();
    if (!newNameTrimmed) {
      toast({ title: "Erro", description: "O nome do tipo não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalType.name.toLowerCase() &&
        appointmentTypes.some(type => type.id !== originalType.id && type.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }
    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToUpdateRef = doc(tiposCollectionRef, originalType.id);
      await updateDoc(docToUpdateRef, { name: newNameTrimmed });
      setEditingTypeInfo(null);
      toast({ title: "Sucesso", description: `Nome do tipo "${originalType.name}" atualizado para "${newNameTrimmed}".`, variant: "success" });
      await fetchAppointmentTypes(currentUserData);
      if (newHistoryType === originalType.name) {
        setNewHistoryType(newNameTrimmed);
      }
    } catch (error) {
      console.error("Erro ao editar nome do tipo:", error);
      toast({ title: "Erro", description: "Falha ao atualizar o nome do tipo.", variant: "destructive" });
    }
  };

  const handleToggleTypeStatus = async (typeToToggle: AppointmentTypeObject) => {
     if (!typeToToggle || !typeToToggle.id || !currentUserData) {
       toast({ title: 'Erro', description: 'Informações do tipo ou usuário incompletas.', variant: 'destructive' });
      setTypeToToggleStatusConfirm(null);
      return;
    }
    
    const newStatus = typeToToggle.status === 'active' ? 'inactive' : 'active';
    const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;

    if (newStatus === 'inactive') {
      if (activeTypesCount <= 1 && appointmentTypes.length > 1 && appointmentTypes.some(t => t.status === 'inactive' && t.id !== typeToToggle.id)) {
          toast({ title: "Atenção", description: "Não é possível desativar o último tipo de atendimento ativo quando outros tipos inativos existem.", variant: "warning" });
          setTypeToToggleStatusConfirm(null);
          return;
      }
       if (activeTypesCount === 1 && appointmentTypes.length === 1) {
         toast({ title: "Atenção", description: "Não é possível desativar o único tipo de atendimento existente.", variant: "warning" });
         setTypeToToggleStatusConfirm(null);
         return;
      }
    }

    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToUpdateRef = doc(tiposCollectionRef, typeToToggle.id);
      await updateDoc(docToUpdateRef, { status: newStatus });
      toast({ title: "Status Alterado", description: `O tipo "${typeToToggle.name}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.`, variant: "success" });
      setTypeToToggleStatusConfirm(null);
      await fetchAppointmentTypes(currentUserData);
      if (newHistoryType === typeToToggle.name && newStatus === 'inactive') {
        setNewHistoryType(getFirstActiveTypeName() || '');
      }
    } catch (error) {
      console.error("Erro ao alterar status do tipo:", error);
      toast({ title: "Erro", description: "Falha ao alterar o status do tipo.", variant: "destructive" });
      setTypeToToggleStatusConfirm(null);
    }
  };

  const handleOpenDeleteTypeDialog = (type: AppointmentTypeObject) => {
    setTypeToDelete(type);
    setIsDeleteTypeConfirmOpen(true);
  };

  const handleConfirmDeleteType = async () => {
     if (!typeToDelete || !typeToDelete.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações para exclusão ou dados do usuário incompletos.', variant: 'destructive' });
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
      return;
    }
    
    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToDeleteRef = doc(tiposCollectionRef, typeToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Tipo Excluído", description: `O tipo "${typeToDelete.name}" foi removido.`, variant: "success" });
      await fetchAppointmentTypes(currentUserData);
      if (newHistoryType === typeToDelete.name) {
        setNewHistoryType(getFirstActiveTypeName() || '');
      }
    } catch (error) {
      console.error("Erro ao excluir tipo:", error);
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o tipo "${typeToDelete.name}". Verifique se ele está em uso.`, variant: "destructive" });
    } finally {
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleAddCustomObjective = async () => {
    if (!currentUserData) {
        toast({ title: "Erro de Autenticação", description: "Dados do usuário não carregados.", variant: "destructive"});
        return;
    }
    const trimmedName = newCustomObjectiveName.trim();
    if (!trimmedName) {
      toast({ title: "Nome Inválido", description: "O nome do objetivo não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (patientObjectives.some(obj => obj.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Objetivo Duplicado", description: `O objetivo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }
    try {
      const objectivesRef = getPatientObjectivesPath(currentUserData);
      await addDoc(objectivesRef, { name: trimmedName, status: 'active', createdAt: serverTimestamp() });
      setNewCustomObjectiveName('');
      setIsAddObjectiveDialogOpen(false);
      toast({ title: "Sucesso", description: "Objetivo adicionado." });
      await fetchPatientObjectives(currentUserData);
    } catch (error) {
      console.error("Erro ao adicionar objetivo:", error);
      toast({ title: "Erro", description: "Falha ao adicionar objetivo.", variant: "destructive" });
    }
  };

  const handleSaveEditedObjectiveName = async () => {
    if (!editingObjectiveInfo || !editingObjectiveInfo.objective.id || !currentUserData) {
         toast({ title: 'Erro', description: 'Informações para edição ou dados do usuário incompletos.', variant: 'destructive' });
        return;
    }
    const { objective: originalObjective, currentName } = editingObjectiveInfo;
    const newNameTrimmed = currentName.trim();
    if (!newNameTrimmed) {
      toast({ title: "Nome Inválido", description: "O nome não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalObjective.name.toLowerCase() && patientObjectives.some(obj => obj.id !== originalObjective.id && obj.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Objetivo Duplicado", description: `O objetivo "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }
    try {
      const objectivesCollectionRef = getPatientObjectivesPath(currentUserData);
      const docToUpdateRef = doc(objectivesCollectionRef, originalObjective.id);
      await updateDoc(docToUpdateRef, { name: newNameTrimmed });
      setEditingObjectiveInfo(null);
      toast({ title: "Sucesso", description: "Nome do objetivo atualizado." });
      await fetchPatientObjectives(currentUserData);
      if (editedPatient?.objetivoPaciente === originalObjective.name) {
        setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: newNameTrimmed } : undefined);
      }
    } catch (error) {
      console.error("Erro ao editar nome do objetivo:", error);
      toast({ title: "Erro", description: "Falha ao editar nome do objetivo.", variant: "destructive" });
    }
  };

  const handleToggleObjectiveStatus = async (objectiveToToggle: PatientObjectiveObject) => {
    if (!objectiveToToggle || !objectiveToToggle.id || !currentUserData) {
        toast({ title: 'Erro', description: 'Informações do objetivo ou dados do usuário incompletos.', variant: 'destructive' });
        setObjectiveToToggleStatusConfirm(null);
        return;
    }
    const newStatus = objectiveToToggle.status === 'active' ? 'inactive' : 'active';
    const activeObjectivesCount = patientObjectives.filter(o => o.status === 'active').length;

    if (newStatus === 'inactive') {
        if (activeObjectivesCount <= 1 && patientObjectives.length > 1 && patientObjectives.some(o => o.status === 'inactive' && o.id !== objectiveToToggle.id)) {
            toast({ title: "Atenção", description: "Não é possível desativar o último objetivo ativo quando outros inativos existem.", variant: "warning" });
            setObjectiveToToggleStatusConfirm(null);
            return;
        }
         if (activeObjectivesCount === 1 && patientObjectives.length === 1) {
           toast({ title: "Atenção", description: "Não é possível desativar o único objetivo existente.", variant: "warning" });
           setObjectiveToToggleStatusConfirm(null);
           return;
        }
    }

    try {
        const objectivesCollectionRef = getPatientObjectivesPath(currentUserData);
        const docToUpdateRef = doc(objectivesCollectionRef, objectiveToToggle.id);
        await updateDoc(docToUpdateRef, { status: newStatus });
        setObjectiveToToggleStatusConfirm(null);
        toast({ title: "Status Alterado", description: `Objetivo "${objectiveToToggle.name}" ${newStatus === 'active' ? 'ativado' : 'desativado'}.` });
        await fetchPatientObjectives(currentUserData);
        if (editedPatient?.objetivoPaciente === objectiveToToggle.name && newStatus === 'inactive') {
            setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' } : undefined);
        }
    } catch (error) {
        console.error("Erro ao alterar status do objetivo:", error);
        toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
        setObjectiveToToggleStatusConfirm(null);
    }
  };

  const handleOpenDeleteObjectiveDialog = (objective: PatientObjectiveObject) => {
    setObjectiveToDelete(objective);
    setIsDeleteObjectiveConfirmOpen(true);
  };

  const handleConfirmDeleteObjective = async () => {
    if (!objectiveToDelete || !objectiveToDelete.id || !currentUserData) {
        toast({ title: 'Erro', description: 'Informações para exclusão ou dados do usuário incompletos.', variant: 'destructive' });
        setIsDeleteObjectiveConfirmOpen(false);
        setObjectiveToDelete(null);
        return;
    }
    try {
      const objectivesCollectionRef = getPatientObjectivesPath(currentUserData);
      const docToDeleteRef = doc(objectivesCollectionRef, objectiveToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Objetivo Excluído", description: `O objetivo "${objectiveToDelete.name}" foi removido.`, variant: "success" });
      await fetchPatientObjectives(currentUserData);
      if (editedPatient?.objetivoPaciente === objectiveToDelete.name) {
        setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' } : undefined);
      }
    } catch (error) {
      console.error("Erro ao excluir objetivo:", error);
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    } finally {
      setIsDeleteObjectiveConfirmOpen(false);
      setObjectiveToDelete(null);
    }
  };

  const activeAppointmentTypes = appointmentTypes.filter(t => t.status === 'active');
  const activePatientObjectives = patientObjectives.filter(o => o.status === 'active');

  const handleOpenHistoryModal = (note: HistoryItem) => {
    setSelectedHistoryNote(note);
    setIsHistoryNoteModalOpen(true);
  };

  const handleExportPdf = async () => {
    const contentElement = document.getElementById('historyNoteContentToExport');
    if (!contentElement || !selectedHistoryNote || !patient) {
      toast({ title: "Erro", description: "Não foi possível encontrar o conteúdo para exportar.", variant: "destructive" });
      return;
    }
    try {
      const canvas = await html2canvas(contentElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; 
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let position = 10; 
      pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight); 
      pdf.save(`evolucao-${patient.name.replace(/\s+/g, '_')}-${selectedHistoryNote.date}.pdf`);
      toast({ title: "PDF Exportado", description: "O PDF da nota foi baixado.", variant: "success" });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({ title: "Erro ao Exportar", description: "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value); 
    if (value === "documentos") {
      toast({
        title: "Funcionalidade em Desenvolvimento",
        description: "A gestão de documentos estará disponível em breve!",
        variant: "default",
      });
    }
  };

  const handleOpenDeleteHistoryDialog = (historyItem: HistoryItem) => {
    setHistoryItemToDelete(historyItem);
    setIsDeleteHistoryConfirmOpen(true);
  };

  const handleConfirmDeleteHistory = async () => {
    if (!patient || !patient.internalId || !historyItemToDelete || !firebaseUserAuth) {
      toast({ title: "Erro", description: "Não foi possível identificar o registro para excluir ou usuário não autenticado.", variant: "destructive" });
      return;
    }
    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      
      const currentPatientDoc = await getDoc(patientRef);
      const currentPatientData = currentPatientDoc.data() as Patient | undefined;
      
      if (!currentPatientData) {
        toast({ title: "Erro", description: "Paciente não encontrado para atualizar histórico.", variant: "destructive" });
        return;
      }
      
      const currentHistory = currentPatientData.history || [];
      const updatedHistory = currentHistory.filter(item => item.id !== historyItemToDelete.id);
      await updateDoc(patientRef, { history: updatedHistory });

      setPatient(prev => prev ? { ...prev, history: updatedHistory } : undefined);
      if(isEditing && editedPatient) setEditedPatient(prev => prev ? { ...prev, history: updatedHistory } : undefined);

      toast({ title: "Registro Excluído", description: "O registro do histórico foi removido.", variant: "success" });
    } catch (error) {
      console.error("Erro ao excluir registro do histórico:", error);
      toast({ title: "Erro", description: "Não foi possível excluir o registro.", variant: "destructive" });
    } finally {
      setIsDeleteHistoryConfirmOpen(false);
      setHistoryItemToDelete(null);
    }
  };


  if (isLoading) return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Carregando dados do paciente...</p></div>;
  if (!patient && !isLoading) return <div className="text-center py-10"><h1 className="text-2xl font-semibold mb-4">Paciente não encontrado</h1><Button onClick={() => router.push('/pacientes')}>Voltar para Pacientes</Button></div>;
  
  const displayPatient = isEditing ? editedPatient : patient;
  if (!displayPatient) return <div className="text-center py-10"><p>Erro ao carregar dados do paciente.</p></div>;

  const calculateAge = (dob: string) => {
    if (!dob) return '-';
    try {
      const birthDate = parseISO(dob);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const m = new Date().getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
        return age - 1;
      }
      return age;
    } catch (error) {
      return '-';
    }
  };
  const formatDate = (dateString: string, formatStr = 'PPP') => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), formatStr, { locale: ptBR });
    } catch (error) {
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
                    className={`hover:text-black ${displayPatient.status === 'Ativo' ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
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
          <Tabs defaultValue="historico" value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                      <Select value={newHistoryType} onValueChange={(value) => setNewHistoryType(value)} >
                        <SelectTrigger id="atendimento-tipo" className="flex-grow">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAppointmentTypes.map((type) => <SelectItem key={type.id || type.name} value={type.name}>{type.name}</SelectItem>)}
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
                      {isClient && TiptapEditor ? (
                        <TiptapEditor content={newHistoryNote} onChange={setNewHistoryNote} />
                      ) : (
                        <div className="w-full h-[150px] border border-input rounded-md bg-muted/50 flex items-center justify-center"><p className="text-muted-foreground">Carregando editor...</p></div>
                      )}
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
                [...displayPatient.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, index) => (
                  <Card key={`${item.id || 'fallbackID'}-${index}`} className="bg-muted/50">
                    <CardHeader className="pb-3 flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-base"> {item.type} </CardTitle>
                        <span className="text-sm font-normal text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Mais opções</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenHistoryModal(item)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenDeleteHistoryDialog(item)}
                            className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm text-foreground history-note-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.notes.length > 250 ? item.notes.substring(0, 250) + "..." : item.notes }}
                      />
                      {item.notes.length > 250 && (
                        <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary" onClick={() => handleOpenHistoryModal(item)}> Ver Detalhes </Button>
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
                  <CardTitle className="text-lg font-semibold">Documentos do Paciente</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-16 text-muted-foreground">
                  <Info className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Funcionalidade de Documentos em desenvolvimento.</p>
                  <p className="text-sm">Estará disponível em breve para você anexar e gerenciar arquivos!</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dados" className="p-6 space-y-4 mt-0">
              <h3 className="text-lg font-semibold">Informações Pessoais</h3>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                   <div className="space-y-1"> <Label htmlFor="edit-name">Nome Completo</Label> <Input id="edit-name" name="name" value={editedPatient?.name || ''} onChange={handleInputChange} /> </div>
                  <div className="space-y-1"> <Label htmlFor="edit-dob">Data de Nascimento</Label> <Input id="edit-dob" name="dob" type="date" value={editedPatient?.dob || ''} onChange={handleInputChange} max={format(new Date(), 'yyyy-MM-dd')} /> </div>
                  <div className="space-y-1"> <Label htmlFor="edit-email">Email</Label> <Input id="edit-email" name="email" type="email" value={editedPatient?.email || ''} onChange={handleInputChange} /> </div>
                  <div className="space-y-1"> <Label htmlFor="edit-phone">Telefone</Label> <Input id="edit-phone" name="phone" type="tel" value={editedPatient?.phone || ''} onChange={handleInputChange} /> </div>
                  <div className="md:col-span-2 space-y-1"> <Label htmlFor="edit-address">Endereço</Label> <Input id="edit-address" name="address" value={editedPatient?.address || ''} onChange={handleInputChange} /> </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-objetivoPaciente">Objetivo do Paciente</Label>
                    <div className="flex items-center gap-1">
                        <Select name="objetivoPaciente" value={editedPatient?.objetivoPaciente || ''} onValueChange={(value) => handleSelectChange('objetivoPaciente', value)}>
                            <SelectTrigger id="edit-objetivoPaciente" className="flex-grow">
                                <SelectValue placeholder="Selecione o objetivo" />
                            </SelectTrigger>
                            <SelectContent>
                                {activePatientObjectives.map((obj) => (
                                    <SelectItem key={obj.id || obj.name} value={obj.name}>{obj.name}</SelectItem>
                                ))}
                                {activePatientObjectives.length === 0 && <SelectItem value="no-objectives" disabled>Nenhum objetivo ativo</SelectItem>}
                            </SelectContent>
                        </Select>
                         <Button type="button" variant="outline" size="icon" onClick={() => setIsAddObjectiveDialogOpen(true)} title="Adicionar novo objetivo" className="flex-shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsManageObjectivesDialogOpen(true)} title="Gerenciar objetivos" className="flex-shrink-0">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-status">Status</Label>
                    <select id="edit-status" name="status" value={editedPatient?.status || 'Ativo'} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
                  <div><strong>Objetivo do Paciente:</strong> {patient?.objetivoPaciente || '-'}</div>
                  <div><strong>Status:</strong> <Badge variant={patient?.status === 'Ativo' ? 'default' : 'secondary'} className={`ml-2 px-2 py-0.5 text-xs ${patient?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{patient?.status}</Badge></div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

        <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Tipo de Atendimento</DialogTitle>
            <DialogDescription>Insira o nome do novo tipo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newCustomTypeName">Nome do Tipo</Label>
            <Input id="newCustomTypeName" value={newCustomTypeName} onChange={(e) => setNewCustomTypeName(e.target.value)} placeholder="Ex: Sessão Extra" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCustomTypeName('')}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={() => handleAddCustomType()}>Salvar Tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageTypesDialogOpen} onOpenChange={setIsManageTypesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle>
            <DialogDescription>Edite, altere o status ou exclua os tipos de atendimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {appointmentTypes.map((type) => (
              <div key={type.id || type.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingTypeInfo && editingTypeInfo.type && editingTypeInfo.type.id === type.id ? (
                  <div className="flex-grow flex items-center gap-2 mr-2">
                    <Input value={editingTypeInfo.currentName} onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)} className="h-8" />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedTypeName} title="Salvar Nome"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo(null)} title="Cancelar Edição"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <span className={`flex-grow ${type.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{type.name}</span>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {(!editingTypeInfo || !editingTypeInfo.type || editingTypeInfo.type.id !== type.id) && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingTypeInfo({ type: type, currentName: type.name })} title="Editar Nome">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteTypeDialog(type)} title="Excluir Tipo">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Switch checked={type.status === 'active'} onCheckedChange={() => setTypeToToggleStatusConfirm(type) } aria-label={`Status do tipo ${type.name}`} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400 flex-shrink-0" />
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
       <AlertDialog open={!!typeToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setTypeToToggleStatusConfirm(null)}>
        <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle> <AlertDialogDescription> Tem certeza que deseja {typeToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} o tipo "{typeToToggleStatusConfirm?.name}"? {typeToToggleStatusConfirm?.status === 'active' && " Se desativado, não estará mais disponível para novos registros de histórico, mas os existentes não serão alterados."} {typeToToggleStatusConfirm?.status === 'inactive' && " Se ativado, estará disponível para novos registros de histórico."} </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setTypeToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={() => typeToToggleStatusConfirm && handleToggleTypeStatus(typeToToggleStatusConfirm)} className={typeToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}> {typeToToggleStatusConfirm?.status === 'active' ? 'Desativar Tipo' : 'Ativar Tipo'} </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isDeleteTypeConfirmOpen} onOpenChange={(isOpen) => { if(!isOpen) setTypeToDelete(null); setIsDeleteTypeConfirmOpen(isOpen);}}>
        <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Confirmar Exclusão de Tipo</AlertDialogTitle> <AlertDialogDescription> Tem certeza que deseja excluir o tipo de atendimento "<strong>{typeToDelete?.name}</strong>"? Esta ação não pode ser desfeita. Registros de histórico existentes com este tipo não serão alterados, mas o tipo não estará mais disponível para seleção. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setTypeToDelete(null)}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleConfirmDeleteType} className="bg-destructive hover:bg-destructive/90" > Excluir Tipo </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddObjectiveDialogOpen} onOpenChange={setIsAddObjectiveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Objetivo do Paciente</DialogTitle>
            <DialogDescription>Insira o nome do novo objetivo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newCustomObjectiveNameModal">Nome do Objetivo</Label>
            <Input id="newCustomObjectiveNameModal" value={newCustomObjectiveName} onChange={(e) => setNewCustomObjectiveName(e.target.value)} placeholder="Ex: Melhorar o sono" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCustomObjectiveName('')}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={() => handleAddCustomObjective()}>Salvar Objetivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageObjectivesDialogOpen} onOpenChange={setIsManageObjectivesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Objetivos do Paciente</DialogTitle>
            <DialogDescription>Edite, altere o status ou exclua os objetivos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {patientObjectives.map((obj) => (
              <div key={obj.id || obj.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingObjectiveInfo && editingObjectiveInfo.objective && editingObjectiveInfo.objective.id === obj.id ? (
                  <div className="flex-grow flex items-center gap-2 mr-2">
                    <Input value={editingObjectiveInfo.currentName} onChange={(e) => setEditingObjectiveInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)} className="h-8" />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedObjectiveName} title="Salvar Nome"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingObjectiveInfo(null)} title="Cancelar Edição"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <span className={`flex-grow ${obj.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{obj.name}</span>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {(!editingObjectiveInfo || !editingObjectiveInfo.objective || editingObjectiveInfo.objective.id !== obj.id) && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingObjectiveInfo({ objective: obj, currentName: obj.name })} title="Editar Nome">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteObjectiveDialog(obj)} title="Excluir Objetivo">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Switch checked={obj.status === 'active'} onCheckedChange={() => setObjectiveToToggleStatusConfirm(obj)} aria-label={`Status do objetivo ${obj.name}`} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400 flex-shrink-0" />
                </div>
              </div>
            ))}
            {patientObjectives.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum objetivo cadastrado.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!objectiveToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setObjectiveToToggleStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status do Objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {objectiveToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} o objetivo "{objectiveToToggleStatusConfirm?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setObjectiveToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => objectiveToToggleStatusConfirm && handleToggleObjectiveStatus(objectiveToToggleStatusConfirm)} className={objectiveToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}>
              {objectiveToToggleStatusConfirm?.status === 'active' ? 'Desativar Objetivo' : 'Ativar Objetivo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteObjectiveConfirmOpen} onOpenChange={(isOpen) => { if(!isOpen) setObjectiveToDelete(null); setIsDeleteObjectiveConfirmOpen(isOpen);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o objetivo "<strong>{objectiveToDelete?.name}</strong>"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setObjectiveToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteObjective} className="bg-destructive hover:bg-destructive/90">
              Excluir Objetivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
        <Dialog open={isHistoryNoteModalOpen} onOpenChange={setIsHistoryNoteModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento - {selectedHistoryNote?.type}</DialogTitle>
            <DialogDescription> Data: {selectedHistoryNote ? formatDate(selectedHistoryNote.date) : ''} </DialogDescription>
          </DialogHeader>
          <div id="historyNoteContentToExport" className="py-4 max-h-[60vh] overflow-y-auto">
            {selectedHistoryNote && ( <div className="history-note-content prose prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: selectedHistoryNote.notes }} /> )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleExportPdf}> <FileDown className="mr-2 h-4 w-4" /> Exportar para PDF </Button>
            <DialogClose asChild><Button type="button" variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteHistoryConfirmOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setHistoryItemToDelete(null);
        setIsDeleteHistoryConfirmOpen(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro do histórico de <strong>{historyItemToDelete?.type}</strong> em {historyItemToDelete ? formatDate(historyItemToDelete.date) : ''}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHistoryItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteHistory} className="bg-destructive hover:bg-destructive/90">
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

