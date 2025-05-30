
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Trash2, Eye, UserCheck, UserX, Save, X, Plus, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, isFuture, parseISO, startOfDay } from 'date-fns';
import { db } from '@/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  getCountFromServer
} from 'firebase/firestore';
import { getAuth, type User as FirebaseUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';

type HistoryItem = { date: string; type: string; notes: string };
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
  lastVisit: string;
  nextVisit: string;
  objetivoPaciente?: string; // New field for patient objective
};

// For Patient Objectives
type PatientObjectiveObject = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
};

const initialPatientObjectivesData: PatientObjectiveObject[] = [];


const getPatientObjectivesPath = (userData: any) => {
  const isClinica = userData?.plano === 'Clínica';
  const identifier = isClinica ? userData.nomeEmpresa : userData.uid;
  if (!identifier) {
    console.error("Identificador do usuário ou empresa não encontrado para objetivos do paciente.");
    return collection(db, 'patientObjectives', 'default_fallback_objectives', 'objetivos');
  }
  return collection(db, 'patientObjectives', identifier, 'objetivos');
};


export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const { toast } = useToast();
  const today = startOfDay(new Date());
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  // State for Patient Objectives
  const [patientObjectives, setPatientObjectives] = useState<PatientObjectiveObject[]>([]);
  const [isAddObjectiveDialogOpen, setIsAddObjectiveDialogOpen] = useState(false);
  const [newCustomObjectiveName, setNewCustomObjectiveName] = useState('');
  const [isManageObjectivesDialogOpen, setIsManageObjectivesDialogOpen] = useState(false);
  const [editingObjectiveInfo, setEditingObjectiveInfo] = useState<{ objective: PatientObjectiveObject, currentName: string } | null>(null);
  const [objectiveToToggleStatusConfirm, setObjectiveToToggleStatusConfirm] = useState<PatientObjectiveObject | null>(null);
  const [isDeleteObjectiveConfirmOpen, setIsDeleteObjectiveConfirmOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState<PatientObjectiveObject | null>(null);


  const [newPatient, setNewPatient] = useState<Partial<Omit<Patient, 'internalId'>>>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    status: 'Ativo',
    objetivoPaciente: '', 
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Partial<Omit<Patient, 'internalId'>>, value: string) => {
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };


  const fetchCurrentUserData = useCallback(async (user: FirebaseUser) => {
    if (!user) return null;
    const userDocRef = doc(db, 'usuarios', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { ...userDocSnap.data(), uid: user.uid };
    }
    return null;
  }, []);

  const fetchPatientObjectives = useCallback(async () => {
    if (!currentUserData) {
      const fallback = initialPatientObjectivesData.map(o => ({...o, id: `fallback-obj-${o.name.toLowerCase()}`})).sort((a,b) => a.name.localeCompare(b.name));
      setPatientObjectives(fallback);
      return;
    }
    try {
      const objectivesRef = getPatientObjectivesPath(currentUserData);
      const snapshot = await getDocs(query(objectivesRef, orderBy("name")));
      const fetchedObjectives: PatientObjectiveObject[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
      }));
      const fallback = initialPatientObjectivesData.map(o => ({...o, id: `fallback-obj-${o.name.toLowerCase()}`})).sort((a,b) => a.name.localeCompare(b.name));
      setPatientObjectives(fetchedObjectives.length > 0 ? fetchedObjectives : fallback);
    } catch (error: any) {
      console.error("Erro ao buscar objetivos do paciente:", error);
      toast({ title: "Erro ao Carregar Objetivos", description: `Não foi possível carregar os objetivos. Usando opções padrão. Detalhe: ${error.message}`, variant: "warning" });
      const fallback = initialPatientObjectivesData.map(o => ({...o, id: `fallback-obj-${o.name.toLowerCase()}`})).sort((a,b) => a.name.localeCompare(b.name));
      setPatientObjectives(fallback);
    }
  }, [currentUserData, toast]);

  const getFirstActiveObjectiveName = useCallback(() => {
    return patientObjectives.find(o => o.status === 'active')?.name || '';
  }, [patientObjectives]);

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = authInstance.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const uData = await fetchCurrentUserData(user);
        setCurrentUserData(uData);
      } else {
        setPatients([]);
        setCurrentUserData(null);
        setPatientObjectives(initialPatientObjectivesData.map(o => ({...o, id: `fallback-obj-${o.name.toLowerCase()}`})).sort((a,b) => a.name.localeCompare(b.name)));
      }
    });
    return () => unsubscribe();
  }, [fetchCurrentUserData]);

  useEffect(() => {
    if (currentUser) {
      fetchPatients();
    }
  }, [currentUser]);

  useEffect(() => {
    if(currentUserData){
        fetchPatientObjectives();
    }
  }, [currentUserData, fetchPatientObjectives]);

  useEffect(() => {
    if (isNewPatientDialogOpen && patientObjectives.length > 0 && !newPatient.objetivoPaciente) {
      setNewPatient(prev => ({ ...prev, objetivoPaciente: getFirstActiveObjectiveName() }));
    }
  }, [isNewPatientDialogOpen, patientObjectives, newPatient.objetivoPaciente, getFirstActiveObjectiveName]);


  const fetchPatients = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'pacientes'), where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const loadedPatients: Patient[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedPatients.push({
          internalId: docSnap.id,
          id: docSnap.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          dob: data.dob || '',
          address: data.address || '',
          status: data.status || 'Ativo',
          avatar: data.avatar || 'https://placehold.co/100x100.png',
          history: data.history || [],
          documents: data.documents || [],
          slug: data.slug || generateSlug(data.name),
          lastVisit: data.lastVisit || '-',
          nextVisit: data.nextVisit || '-',
          objetivoPaciente: data.objetivoPaciente || '',
        });
      });
      setPatients(loadedPatients);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os pacientes.", variant: "destructive" });
    }
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !currentUserData) {
      toast({ title: "Erro", description: "Usuário ou dados do usuário não autenticados.", variant: "destructive" });
      return;
    }

    const activePatientsQuery = query(collection(db, 'pacientes'), where('uid', '==', currentUser.uid), where('status', '==', 'Ativo'));
    const activePatientsSnapshot = await getCountFromServer(activePatientsQuery);
    const activePatientsCount = activePatientsSnapshot.data().count;

    if (currentUserData.plano === 'Gratuito' && activePatientsCount >= 10) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite de 10 pacientes ativos para o plano Gratuito. Faça upgrade para adicionar mais.",
        variant: "destructive",
      });
      return;
    }

    if (currentUserData.plano === 'Essencial' && activePatientsCount >= 50) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite de 50 pacientes ativos para o plano Essencial. Faça upgrade para adicionar mais.",
        variant: "destructive",
      });
      return;
    }

    const nomeEmpresa = currentUserData.nomeEmpresa || '';

    if (!newPatient.name || !newPatient.email) {
      toast({ title: "Erro de Validação", description: "Nome e Email são obrigatórios.", variant: "destructive" });
      return;
    }
    if (newPatient.objetivoPaciente && !patientObjectives.find(o => o.name === newPatient.objetivoPaciente && o.status === 'active')) {
        toast({ title: "Objetivo Inválido", description: "O objetivo selecionado não está ativo ou não existe.", variant: "destructive" });
        return;
    }
     if (newPatient.dob && isFuture(parseISO(newPatient.dob))) {
      toast({ title: "Data de Nascimento Inválida", description: "A data de nascimento não pode ser futura.", variant: "destructive" });
      return;
    }


    const slug = generateSlug(newPatient.name);

    try {
      await addDoc(collection(db, 'pacientes'), {
        ...newPatient,
        uid: currentUser.uid,
        nomeEmpresa,
        status: newPatient.status || 'Ativo',
        objetivoPaciente: newPatient.objetivoPaciente || '',
        createdAt: serverTimestamp(),
        lastVisit: new Date().toISOString().split('T')[0],
        nextVisit: '-',
        slug,
        avatar: 'https://placehold.co/100x100.png',
        history: [],
        documents: [],
      });

      toast({ title: "Sucesso!", description: `Paciente ${newPatient.name} adicionado.`, variant: "success" });
      setNewPatient({ name: '', email: '', phone: '', dob: '', address: '', status: 'Ativo', objetivoPaciente: getFirstActiveObjectiveName() });
      setIsNewPatientDialogOpen(false);
      await fetchPatients();
    } catch (error) {
      console.error("Erro ao adicionar paciente:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o paciente.", variant: "destructive" });
    }
  };

  // Objective Management Functions (similar to Appointment Types)
  const handleAddCustomObjective = async () => {
    if (!currentUserData) return;
    const trimmedName = newCustomObjectiveName.trim();
    if (!trimmedName) {
      toast({ title: 'Erro', description: 'Nome do objetivo não pode ser vazio.', variant: 'destructive' });
      return;
    }
    if (patientObjectives.some(obj => obj.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Objetivo Duplicado", description: `O objetivo "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }
    try {
      const objectivesRef = getPatientObjectivesPath(currentUserData);
      await addDoc(objectivesRef, { name: trimmedName, status: 'active', createdAt: serverTimestamp() });
      toast({ title: 'Sucesso', description: 'Objetivo adicionado.' });
      setNewCustomObjectiveName('');
      setIsAddObjectiveDialogOpen(false);
      fetchPatientObjectives();
    } catch (error) {
      console.error("Erro ao adicionar objetivo:", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar o objetivo.', variant: 'destructive' });
    }
  };

  const handleSaveEditedObjectiveName = async () => {
    if (!editingObjectiveInfo || !editingObjectiveInfo.objective.id || !currentUserData) return;
    const { objective: originalObjective, currentName } = editingObjectiveInfo;
    const newNameTrimmed = currentName.trim();
    if (!newNameTrimmed) {
      toast({ title: "Erro", description: "O nome do objetivo não pode ser vazio.", variant: "destructive" });
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
      toast({ title: "Sucesso", description: `Nome do objetivo atualizado para "${newNameTrimmed}".`, variant: "success" });
      await fetchPatientObjectives();
      if (newPatient.objetivoPaciente === originalObjective.name) {
        setNewPatient(prev => ({ ...prev, objetivoPaciente: newNameTrimmed }));
      }
    } catch (error) {
      console.error("Erro ao editar nome do objetivo:", error);
      toast({ title: "Erro", description: "Falha ao atualizar o nome do objetivo.", variant: "destructive" });
    }
  };

  const handleToggleObjectiveStatus = async (objectiveToToggle: PatientObjectiveObject) => {
    if (!objectiveToToggle || !objectiveToToggle.id || !currentUserData) return;
    const newStatus = objectiveToToggle.status === 'active' ? 'inactive' : 'active';
    const activeObjectivesCount = patientObjectives.filter(o => o.status === 'active').length;
    if (newStatus === 'inactive') {
        if (activeObjectivesCount <= 1 && patientObjectives.length > 1 && patientObjectives.some(o => o.status === 'inactive' && o.id !== objectiveToToggle.id)) {
            toast({ title: "Atenção", description: "Não é possível desativar o último objetivo ativo quando outros objetivos inativos existem.", variant: "warning" });
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
      toast({ title: "Status Alterado", description: `O objetivo "${objectiveToToggle.name}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.`, variant: "success" });
      setObjectiveToToggleStatusConfirm(null);
      await fetchPatientObjectives();
      if (newPatient.objetivoPaciente === objectiveToToggle.name && newStatus === 'inactive') {
        setNewPatient(prev => ({ ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' }));
      }
    } catch (error) {
      console.error("Erro ao alterar status do objetivo:", error);
      toast({ title: "Erro", description: "Falha ao alterar o status do objetivo.", variant: "destructive" });
      setObjectiveToToggleStatusConfirm(null);
    }
  };

  const handleOpenDeleteObjectiveDialog = (objective: PatientObjectiveObject) => {
    setObjectiveToDelete(objective);
    setIsDeleteObjectiveConfirmOpen(true);
  };

  const handleConfirmDeleteObjective = async () => {
    if (!objectiveToDelete || !objectiveToDelete.id || !currentUserData) return;
    try {
      const objectivesCollectionRef = getPatientObjectivesPath(currentUserData);
      const docToDeleteRef = doc(objectivesCollectionRef, objectiveToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Objetivo Excluído", description: `O objetivo "${objectiveToDelete.name}" foi removido.`, variant: "success" });
      await fetchPatientObjectives();
      if (newPatient.objetivoPaciente === objectiveToDelete.name) {
        setNewPatient(prev => ({ ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' }));
      }
    } catch (error) {
      console.error("Erro ao excluir objetivo:", error);
      toast({ title: "Erro", description: "Falha ao excluir o objetivo.", variant: "destructive" });
    } finally {
      setIsDeleteObjectiveConfirmOpen(false);
      setObjectiveToDelete(null);
    }
  };

  const activePatientObjectives = patientObjectives.filter(o => o.status === 'active');
  // End Objective Management Functions


  const handleUpdatePatientStatus = async (patientInternalId: string, newStatus: 'Ativo' | 'Inativo') => {
    const patientToUpdate = patients.find(p => p.internalId === patientInternalId);
    if (!patientToUpdate || !currentUser || !currentUserData) return;

    if (newStatus === 'Ativo') {
      const activePatientsQuery = query(collection(db, 'pacientes'), where('uid', '==', currentUser.uid), where('status', '==', 'Ativo'));
      const activePatientsSnapshot = await getCountFromServer(activePatientsQuery);
      let activePatientsCount = activePatientsSnapshot.data().count;

      if (currentUserData.plano === 'Gratuito' && activePatientsCount >= 10) {
         toast({
          title: "Limite Atingido",
          description: "Você atingiu o limite de 10 pacientes ativos para o plano Gratuito. Faça upgrade para ativar mais.",
          variant: "destructive",
        });
        return;
      }
      if (currentUserData.plano === 'Essencial' && activePatientsCount >= 50) {
         toast({
          title: "Limite Atingido",
          description: "Você atingiu o limite de 50 pacientes ativos para o plano Essencial. Faça upgrade para ativar mais.",
          variant: "destructive",
        });
        return;
      }
    }


    try {
      const patientRef = doc(db, 'pacientes', patientInternalId);
      await updateDoc(patientRef, { status: newStatus });

      setPatients(prev =>
        prev.map(p =>
          p.internalId === patientInternalId ? { ...p, status: newStatus } : p
        )
      );

      const isInactive = newStatus.toLowerCase() === "inativo";
      toast({
        title: "Status Atualizado",
        description: `Status de ${patientToUpdate.name} alterado para ${newStatus}.`,
        variant: isInactive ? "warning" : "success"
      });
    } catch (error) {
      console.error("Erro ao atualizar status do paciente:", error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do paciente.',
        variant: 'destructive',
      });
      setPatients(prev =>
        prev.map(p =>
          p.internalId === patientInternalId ? { ...p, status: patientToUpdate.status } : p
        )
      );
    }
  };

  const handleDeletePatient = async (patientInternalId: string, patientName: string) => {
    try {
      const patientRef = doc(db, 'pacientes', patientInternalId);
      await deleteDoc(patientRef);

      setPatients(prev => prev.filter(p => p.internalId !== patientInternalId));
      toast({
        title: "Paciente Excluído",
        description: `Paciente ${patientName} foi removido com sucesso.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      });
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <Dialog open={isNewPatientDialogOpen} onOpenChange={(isOpen) => {
            setIsNewPatientDialogOpen(isOpen);
            if (isOpen && patientObjectives.length > 0 && !newPatient.objetivoPaciente) {
                setNewPatient(prev => ({ ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' }));
            }
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg"> {/* Increased width */}
            <DialogHeader>
              <DialogTitle>Adicionar Novo Paciente</DialogTitle>
              <DialogDescription>
                Preencha as informações básicas do novo paciente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPatient}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome*
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newPatient.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email*
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newPatient.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={newPatient.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dob" className="text-right">
                    Nascimento
                  </Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    value={newPatient.dob}
                    onChange={handleInputChange}
                    className="col-span-3"
                    max={format(today, 'yyyy-MM-dd')}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={newPatient.address}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                {/* Patient Objective Field */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="objetivoPaciente" className="text-right">Objetivo</Label>
                    <div className="col-span-3 flex items-center gap-1">
                        <Select value={newPatient.objetivoPaciente || ''} onValueChange={(value) => handleSelectChange('objetivoPaciente', value)}>
                            <SelectTrigger id="objetivoPaciente" className="flex-grow">
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
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar Paciente</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>Gerencie as informações e o status dos seus pacientes.</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar paciente..."
                className="pl-8 w-full md:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Última Consulta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.internalId}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{patient.lastVisit}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'Ativo' ? 'default' : 'secondary'} className={patient.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-100 h-8 w-8" title="Ver Detalhes">
                      <Link href={`/pacientes/${generateSlug(patient.name)}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${patient.status === 'Ativo' ? 'text-orange-600 hover:bg-orange-100' : 'text-green-600 hover:bg-green-100'
                            } h-8 w-8`}
                          title={patient.status === 'Ativo' ? 'Inativar Paciente' : 'Ativar Paciente'}
                        >
                          {patient.status === 'Ativo' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja {patient.status === 'Ativo' ? 'inativar' : 'ativar'} o paciente <strong>{patient.name}</strong>?
                            {patient.status === 'Ativo' && ' Pacientes inativos não podem ser selecionados para novos agendamentos.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className={patient.status === 'Inativo' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                            onClick={() => handleUpdatePatientStatus(patient.internalId, patient.status === 'Ativo' ? 'Inativo' : 'Ativo')}
                          >
                            {patient.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" title="Excluir Paciente">
                          <Trash2 className="h-4 w-4" />
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
                            onClick={() => handleDeletePatient(patient.internalId, patient.name)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPatients.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {patients.length > 0 ? 'Nenhum paciente encontrado com esse nome.' : 'Nenhum paciente cadastrado.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs for Patient Objectives Management */}
      <Dialog open={isAddObjectiveDialogOpen} onOpenChange={setIsAddObjectiveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Objetivo</DialogTitle>
            <DialogDescription>Insira o nome do novo objetivo do paciente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newCustomObjectiveName">Nome do Objetivo</Label>
            <Input id="newCustomObjectiveName" value={newCustomObjectiveName} onChange={(e) => setNewCustomObjectiveName(e.target.value)} placeholder="Ex: Reduzir Estresse" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCustomObjectiveName('')}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleAddCustomObjective}>Salvar Objetivo</Button>
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
                {editingObjectiveInfo?.objective.id === obj.id ? (
                  <div className="flex-grow flex items-center gap-2 mr-2">
                    <Input value={editingObjectiveInfo.currentName} onChange={(e) => setEditingObjectiveInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)} className="h-8" />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSaveEditedObjectiveName} title="Salvar Nome"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingObjectiveInfo(null)} title="Cancelar Edição"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <span className={`flex-grow ${obj.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{obj.name}</span>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {editingObjectiveInfo?.objective.id !== obj.id && (
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

    </div>
  );
}
