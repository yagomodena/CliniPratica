
'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, FileText, PlusCircle, Trash2, Upload, Save, X, CalendarPlus, UserCheck, UserX, Plus, Search, Pencil, Eye, FileDown, Loader2, Info, MoreVertical, DollarSign, BookText, CheckCircle, UserCog } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from 'next/dynamic';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { db, auth } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
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
  Timestamp,
  onSnapshot, // Added for reactive currentUserData
  Unsubscribe // Added for cleanup
} from 'firebase/firestore';
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
  loading: () => <div className="w-full h-[150px] border border-input rounded-md bg-muted/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="ml-2 text-muted-foreground">Carregando editor...</p></div>,
});

type HistoryItem = {
  id: string;
  date: string; // Should be 'yyyy-MM-dd'
  type: string;
  notes: string;
  createdById?: string;
  createdByName?: string;
};
type DocumentItem = { id: string; name: string; uploadDate: string; url: string; storagePath: string; };

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
  objetivoPaciente?: string;
  lastVisit?: string;
  nextVisit?: string;
  nomeEmpresa?: string;
  anamnese?: string;
  hasMonthlyFee?: boolean;
  monthlyFeeAmount?: number;
  monthlyFeeDueDate?: number;
};

type AppointmentTypeObject = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  valor?: number;
  lancarFinanceiroAutomatico?: boolean;
};

const initialAppointmentTypesData: AppointmentTypeObject[] = [];

type PatientObjectiveObject = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
};

const initialPatientObjectivesData: PatientObjectiveObject[] = [];

interface AnamneseTemplate {
  key: string;
  name: string;
  content: string;
}

interface AnamneseTemplatesByArea {
  [area: string]: AnamneseTemplate[];
}

const ANAMNESE_TEMPLATES: AnamneseTemplatesByArea = {
  "Psicologia": [
    {
      key: 'psicologia_clinica',
      name: 'Modelo 1 — Anamnese Clínica Psicológica',
      content: `
        <p><strong>Data da Anamnese:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Histórico Familiar:</strong> </p>
        <p><strong>Histórico Pessoal (infância, adolescência, vida adulta):</strong> </p>
        <p><strong>Há quanto tempo percebe os sintomas?</strong> </p>
        <p><strong>Já fez terapia antes? (Sim/Não):</strong> </p>
        <p><strong>Faz uso de medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Objetivo da terapia:</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'psicologia_avaliacao_inicial',
      name: 'Modelo 2 — Avaliação Inicial',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Motivo da busca por terapia:</strong> </p>
        <p><strong>Relacionamento familiar:</strong> </p>
        <p><strong>Relacionamento interpessoal (amigos, colegas):</strong> </p>
        <p><strong>Há episódios de ansiedade, depressão ou pânico? (Sim/Não):</strong> </p>
        <p><strong>Qual a frequência dos sintomas?</strong> </p>
        <p><strong>Pratica atividade física? (Sim/Não):</strong> </p>
        <p><strong>Como é sua rotina diária?</strong> </p>
        <p><strong>Expectativas em relação ao processo terapêutico:</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Nutrição": [
    {
      key: 'nutricao_anamnese',
      name: 'Modelo 1 — Anamnese Nutricional',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa principal:</strong> </p>
        <p><strong>Peso atual (kg):</strong> </p>
        <p><strong>Altura (m):</strong> </p>
        <p><strong>Possui alguma doença diagnosticada? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Usa medicações? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Pratica atividade física? (Sim/Não):</strong> </p>
        <p><strong>Rotina alimentar (Café, Almoço, Jantar, Lanches):</strong> </p>
        <p><strong>Ingestão de água (litros por dia):</strong> </p>
        <p><strong>Restrições alimentares (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'nutricao_habitos',
      name: 'Modelo 2 — Avaliação de Hábitos e Comportamento Alimentar',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Objetivo (Perda de peso, Ganho de massa, Manutenção, Outro):</strong> </p>
        <p><strong>Frequência de consumo de: Doces, Frituras, Refrigerantes, Bebidas alcoólicas:</strong> </p>
        <p><strong>Horário das principais refeições:</strong> </p>
        <p><strong>Faz uso de suplementos? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Tem alguma dificuldade alimentar? (Sim/Não):</strong> </p>
        <p><strong>Qual a sua maior dificuldade para seguir um plano alimentar?</strong> </p>
        <p><strong>Qualidade do sono:</strong> </p>
        <p><strong>Nível de estresse (Baixo, Médio, Alto):</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Fisioterapia": [
    {
      key: 'fisioterapia_musculoesqueletica',
      name: 'Modelo 1 — Anamnese Musculoesquelética',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal (dor, limitação, etc.):</strong> </p>
        <p><strong>Localização da dor:</strong> </p>
        <p><strong>Intensidade da dor (Escala 0-10):</strong> </p>
        <p><strong>Quando iniciou?</strong> </p>
        <p><strong>O que agrava e o que melhora?</strong> </p>
        <p><strong>Já fez fisioterapia antes? (Sim/Não):</strong> </p>
        <p><strong>Histórico de cirurgias ou lesões? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Pratica atividade física? (Sim/Não):</strong> </p>
        <p><strong>Uso de medicações? (Sim/Não):</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'fisioterapia_funcional_geral',
      name: 'Modelo 2 — Avaliação Funcional Geral',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Limitações nas atividades diárias (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Postura no trabalho (Sentado, em pé, outro):</strong> </p>
        <p><strong>Tempo sentado por dia (horas):</strong> </p>
        <p><strong>Histórico familiar relevante (doenças, alterações ortopédicas):</strong> </p>
        <p><strong>Já fez algum tratamento para a queixa atual? (Sim/Não):</strong> </p>
        <p><strong>Como é sua rotina de alongamentos?</strong> </p>
        <p><strong>Avaliação do sono:</strong> </p>
        <p><strong>Objetivos com o tratamento fisioterapêutico:</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Odontologia": [
    {
      key: 'odontologia_padrao',
      name: 'Modelo 1 — Anamnese Odontológica Padrão',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Possui dor? (Sim/Não):</strong> </p>
        <p><strong>Local da dor:</strong> </p>
        <p><strong>Sensibilidade? (Quente, Frio, Doce):</strong> </p>
        <p><strong>Tem sangramento gengival? (Sim/Não):</strong> </p>
        <p><strong>Doenças sistêmicas (Diabetes, Hipertensão, etc.) (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Faz uso de medicações? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Alergias (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'odontologia_preventiva',
      name: 'Modelo 2 — Avaliação Preventiva',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Frequência de escovação diária (vezes):</strong> </p>
        <p><strong>Uso de fio dental? (Sim/Não):</strong> </p>
        <p><strong>Faz consultas regulares ao dentista? (Sim/Não):</strong> </p>
        <p><strong>Tem próteses, implantes ou aparelhos? (Sim/Não):</strong> </p>
        <p><strong>Relato de mau hálito? (Sim/Não):</strong> </p>
        <p><strong>Dificuldades mastigatórias? (Sim/Não):</strong> </p>
        <p><strong>Nível de estresse (Baixo, Médio, Alto):</strong> </p>
        <p><strong>Qualidade do sono:</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Fonoaudiologia": [
    {
      key: 'fonoaudiologia_infantil',
      name: 'Modelo 1 — Anamnese Fonoaudiológica Infantil',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Idade da criança:</strong> </p>
        <p><strong>Histórico gestacional (alguma intercorrência?):</strong> </p>
        <p><strong>Histórico de desenvolvimento (andou, falou na idade esperada?):</strong> </p>
        <p><strong>Frequenta escola? (Sim/Não):</strong> </p>
        <p><strong>Diagnósticos anteriores:</strong> </p>
        <p><strong>Faz uso de medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'fonoaudiologia_adulto',
      name: 'Modelo 2 — Anamnese Fonoaudiológica Adulto',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Histórico de cirurgias, traumas ou AVC:</strong> </p>
        <p><strong>Alterações na fala, voz ou audição? (Sim/Não):</strong> </p>
        <p><strong>Quando percebeu os sintomas?</strong> </p>
        <p><strong>Faz uso de medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Fuma? (Sim/Não):</strong> </p>
        <p><strong>Consome bebidas alcoólicas? (Sim/Não):</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Estética e Terapias": [
    {
      key: 'estetica_facial',
      name: 'Modelo 1 — Anamnese Estética Facial',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Tipo de pele (Seca, Oleosa, Mista, Sensível):</strong> </p>
        <p><strong>Histórico de acne, manchas ou melasma? (Sim/Não):</strong> </p>
        <p><strong>Usa protetor solar diariamente? (Sim/Não):</strong> </p>
        <p><strong>Usa ácidos ou dermocosméticos? (Sim/Não):</strong> </p>
        <p><strong>Alergias? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Faz uso de medicações? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'estetica_corporal',
      name: 'Modelo 2 — Anamnese Estética Corporal',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal (Celulite, Flacidez, Estrias, Gordura localizada, Outro):</strong> </p>
        <p><strong>Pratica atividade física? (Sim/Não):</strong> </p>
        <p><strong>Consome água regularmente? (Sim/Não):</strong> </p>
        <p><strong>Há quanto tempo apresenta essa queixa?</strong> </p>
        <p><strong>Usa medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Possui alguma doença ou condição médica? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
  "Terapia Ocupacional": [
    {
      key: 'to_infantil',
      name: 'Modelo 1 — Avaliação Ocupacional Infantil',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Idade da criança:</strong> </p>
        <p><strong>Diagnóstico (se houver):</strong> </p>
        <p><strong>Desenvolvimento motor (adequado/atrasado):</strong> </p>
        <p><strong>Desenvolvimento cognitivo (adequado/atrasado):</strong> </p>
        <p><strong>Desenvolvimento social (adequado/atrasado):</strong> </p>
        <p><strong>Frequenta escola? (Sim/Não):</strong> </p>
        <p><strong>Usa medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    },
    {
      key: 'to_adulto_idoso',
      name: 'Modelo 2 — Avaliação Ocupacional Adulto/Idoso',
      content: `
        <p><strong>Data:</strong> </p>
        <p><strong>Queixa Principal:</strong> </p>
        <p><strong>Diagnóstico (se houver):</strong> </p>
        <p><strong>Limitações nas atividades diárias (Sim/Não):</strong> </p>
        <p><strong>Quais atividades estão comprometidas?</strong> </p>
        <p><strong>Histórico de lesões, AVC ou traumas:</strong> </p>
        <p><strong>Faz uso de medicação? (Sim/Não):</strong> </p>
        <p><strong>Quais?</strong> </p>
        <p><strong>Suporte familiar (Bom, Médio, Ruim):</strong> </p>
        <p><strong>Observações:</strong> </p>
      `
    }
  ],
   "Outro": [
    {
      key: 'outro_geral',
      name: 'Modelo Geral de Anamnese',
      content: `
        <p><strong>Data da Anamnese:</strong> </p>
        <p><strong>Queixa Principal / Motivo da Consulta:</strong> </p>
        <p><strong>Histórico da Queixa Atual:</strong> </p>
        <p><strong>Histórico Médico Pregresso (doenças, cirurgias, internações):</strong> </p>
        <p><strong>Medicações em Uso (nome, dose, frequência):</strong> </p>
        <p><strong>Alergias:</strong> </p>
        <p><strong>Hábitos (alimentação, sono, atividade física, fumo, álcool):</strong> </p>
        <p><strong>Histórico Familiar (doenças relevantes em familiares):</strong> </p>
        <p><strong>Aspectos Psicossociais (trabalho, rotina, estresse, suporte social):</strong> </p>
        <p><strong>Objetivos do Paciente com o Tratamento/Acompanhamento:</strong> </p>
        <p><strong>Observações Adicionais:</strong> </p>
      `
    }
  ]
};


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
  const searchParams = useSearchParams();
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
  const [newCustomType, setNewCustomType] = useState<Partial<AppointmentTypeObject>>({
    name: '',
    valor: 0,
    lancarFinanceiroAutomatico: false,
    status: 'active',
  });
  const [isManageTypesDialogOpen, setIsManageTypesDialogOpen] = useState(false);
  const [editingTypeInfo, setEditingTypeInfo] = useState<{ type: AppointmentTypeObject, currentData: Partial<AppointmentTypeObject> } | null>(null);
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

  const initialTab = searchParams.get('tab') || "historico";
  const [activeTab, setActiveTab] = useState(initialTab);


  const [isDeleteHistoryConfirmOpen, setIsDeleteHistoryConfirmOpen] = useState(false);
  const [historyItemToDelete, setHistoryItemToDelete] = useState<HistoryItem | null>(null);

  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [firebaseUserAuth, setFirebaseUserAuth] = useState<FirebaseUser | null | undefined>(undefined);

  const [anamneseTemplatesForUser, setAnamneseTemplatesForUser] = useState<AnamneseTemplate[]>([]);
  const [selectedAnamneseModelKey, setSelectedAnamneseModelKey] = useState<string>('none');
  const [isConfirmOverwriteAnamneseOpen, setIsConfirmOverwriteAnamneseOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<AnamneseTemplate | null>(null);


  useEffect(() => {
    setIsClient(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUserAuth(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Reactive currentUserData
  useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};
    if (firebaseUserAuth) {
      setIsLoading(true); // Set loading true when auth user changes, before data is fetched
      const userDocRef = doc(db, 'usuarios', firebaseUserAuth.uid);
      unsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
        if (userDocSnap.exists()) {
          const uData = { ...userDocSnap.data(), uid: firebaseUserAuth.uid };
          setCurrentUserData(uData);
          // Fetch dependent data only after currentUserData is confirmed
          await fetchAppointmentTypes(uData);
          await fetchPatientObjectives(uData);
          const userArea = uData.areaAtuacao || "Outro";
          const templates = ANAMNESE_TEMPLATES[userArea] || ANAMNESE_TEMPLATES["Outro"] || [];
          setAnamneseTemplatesForUser(templates);
          if (patientSlug) { // Only load patient data if slug is available
            await loadPatientDoc(firebaseUserAuth, uData);
          } else {
             setIsLoading(false); // Stop loading if no slug
          }
        } else {
          console.warn("User profile data not found for UID:", firebaseUserAuth.uid);
          setCurrentUserData(null);
          setAppointmentTypes(initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name)));
          setPatientObjectives(initialPatientObjectivesData.map(o => ({...o, id: `fallback-obj-${o.name.toLowerCase()}`})).sort((a,b) => a.name.localeCompare(b.name)));
          setAnamneseTemplatesForUser(ANAMNESE_TEMPLATES["Outro"] || []);
          setIsLoading(false);
          toast({ title: "Erro de Perfil", description: "Dados de perfil não encontrados. Você será redirecionado.", variant: "destructive" });
          router.push('/login');
        }
      }, (error) => {
        console.error("Error listening to user profile data:", error);
        toast({ title: "Erro de Perfil", description: "Não foi possível carregar dados do perfil em tempo real.", variant: "destructive" });
        setCurrentUserData(null);
        setIsLoading(false);
        router.push('/login');
      });
    } else {
      setCurrentUserData(null);
      setPatient(undefined);
      setIsLoading(false);
      if (firebaseUserAuth === null && patientSlug) { // If tried to access while logged out
          router.push('/login');
      }
    }
    return () => unsubscribe();
  }, [firebaseUserAuth, patientSlug, router, toast]); // Removed loadPatientDoc from here


  const loadPatientDoc = useCallback(async (currentUserAuth: FirebaseUser, uData: any) => {
    if (!patientSlug || !uData) {
      setIsLoading(false);
      return;
    }
    // setIsLoading(true); // isLoading is handled by the currentUserData effect now
    try {
      const patientsRef = collection(db, 'pacientes');
      let q;
      if (uData.plano === 'Clínica' && uData.nomeEmpresa) {
        q = query(patientsRef, where('slug', '==', patientSlug), where('nomeEmpresa', '==', uData.nomeEmpresa));
      } else {
        q = query(patientsRef, where('slug', '==', patientSlug), where('uid', '==', currentUserAuth.uid));
      }
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as Omit<Patient, 'internalId' | 'slug'>;
        let uniqueIdCounter = Date.now();
        const processedHistory = (data.history || []).map((histItem) => ({
          ...histItem,
          id: histItem.id || `hist-load-${docSnap.id}-${uniqueIdCounter++}`
        }));
        const fetchedPatient: Patient = {
          ...data,
          internalId: docSnap.id,
          slug: patientSlug,
          history: processedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          documents: (data.documents || []).map((doc, idx) => ({ ...doc, id: `doc-load-${docSnap.id}-${idx}` })) as DocumentItem[],
          objetivoPaciente: data.objetivoPaciente || '',
          anamnese: data.anamnese || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          dob: data.dob || '',
          address: data.address || '',
          status: data.status || 'Ativo',
          avatar: data.avatar || `https://placehold.co/100x100.png`,
          lastVisit: data.lastVisit || '',
          nextVisit: data.nextVisit || '',
          nomeEmpresa: data.nomeEmpresa || '',
          hasMonthlyFee: data.hasMonthlyFee || false,
          monthlyFeeAmount: data.monthlyFeeAmount === 0 ? 0 : (data.monthlyFeeAmount || undefined),
          monthlyFeeDueDate: data.monthlyFeeDueDate || 1,
        };
        setPatient(fetchedPatient);
      } else {
        toast({ title: "Paciente não encontrado", variant: "destructive" });
        setPatient(undefined);
        router.push('/pacientes');
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados do paciente:", error);
      toast({ title: "Erro ao Carregar Paciente", description: "Falha ao carregar dados do paciente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [patientSlug, router, toast]);


  const fetchAppointmentTypes = useCallback(async (userDataForPath: any) => {
    if (!userDataForPath) {
      const fallbackTypes = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(fallbackTypes);
      return;
    }
    try {
      const tiposRef = getAppointmentTypesPath(userDataForPath);
      const snapshot = await getDocs(query(tiposRef, orderBy("name")));
      const allFetchedTypes: AppointmentTypeObject[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        status: docSnap.data().status as 'active' | 'inactive',
        valor: docSnap.data().valor as number | undefined,
        lancarFinanceiroAutomatico: docSnap.data().lancarFinanceiroAutomatico as boolean | undefined,
      }));
      const fallbackTypesWithIds = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(allFetchedTypes.length > 0 ? allFetchedTypes : fallbackTypesWithIds);
    } catch (error: any) {
      console.error("Erro ao buscar tipos de atendimento:", error);
      toast({ title: "Erro Tipos", description: "Não foi possível carregar tipos.", variant: "warning" });
      const fallbackTypes = initialAppointmentTypesData.map(ft => ({ ...ft, id: `fallback-type-${ft.name.toLowerCase().replace(/\s+/g, '-')}` })).sort((a, b) => a.name.localeCompare(b.name));
      setAppointmentTypes(fallbackTypes);
    }
  }, [toast]);

  const fetchPatientObjectives = useCallback(async (userDataForPath: any) => {
    if (!userDataForPath) {
      setPatientObjectives(initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase()}` })).sort((a, b) => a.name.localeCompare(b.name)));
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
      setPatientObjectives(fetchedObjectives.length > 0 ? fetchedObjectives : initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase()}` })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Erro ao buscar objetivos:", error);
      toast({ title: "Erro Objetivos", description: "Não foi possível carregar objetivos.", variant: "warning" });
      setPatientObjectives(initialPatientObjectivesData.map(o => ({ ...o, id: `fallback-obj-${o.name.toLowerCase()}` })).sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [toast]);


  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);


  const getFirstActiveTypeName = useCallback(() => {
    return appointmentTypes.find(t => t.status === 'active')?.name || '';
  }, [appointmentTypes]);

  const getFirstActiveObjectiveName = useCallback(() => {
    return patientObjectives.find(o => o.status === 'active')?.name || '';
  }, [patientObjectives]);

  useEffect(() => {
    if (patient && appointmentTypes.length > 0 && patientObjectives.length > 0) {
      const firstActiveObjective = getFirstActiveObjectiveName();
      const firstActiveType = getFirstActiveTypeName();
      setEditedPatient(prev => ({
        ...(prev?.internalId === patient.internalId ? prev : patient),
        objetivoPaciente: (prev?.internalId === patient.internalId ? prev.objetivoPaciente : patient.objetivoPaciente) || firstActiveObjective || '',
        anamnese: (prev?.internalId === patient.internalId ? prev.anamnese : patient.anamnese) || '',
        hasMonthlyFee: patient.hasMonthlyFee || false,
        monthlyFeeAmount: patient.monthlyFeeAmount === 0 ? 0 : (patient.monthlyFeeAmount || undefined),
        monthlyFeeDueDate: patient.monthlyFeeDueDate || 1,
      }));
      if (activeTab === 'historico') {
        setNewHistoryType(prevHistoryType => prevHistoryType || firstActiveType || '');
      }
    }
  }, [patient, appointmentTypes, patientObjectives, getFirstActiveObjectiveName, getFirstActiveTypeName, activeTab]);


  const handleSaveEditedPatient = async () => {
    if (!editedPatient || !editedPatient.internalId || !currentUserData || !firebaseUserAuth) {
      toast({ title: "Erro", description: "Não foi possível identificar dados para salvar.", variant: "destructive" });
      return;
    }
    if (editedPatient.dob && isFuture(parseISO(editedPatient.dob))) {
      toast({ title: "Data de Nascimento Inválida", description: "A data de nascimento não pode ser uma data futura.", variant: "destructive" });
      return;
    }
    if (editedPatient.objetivoPaciente && !patientObjectives.find(o => o.name === editedPatient.objetivoPaciente && o.status === 'active')) {
      toast({ title: "Objetivo Inválido", description: "O objetivo do paciente selecionado não está ativo ou não existe.", variant: "destructive" });
      return;
    }
    if (editedPatient.hasMonthlyFee) {
        if (editedPatient.monthlyFeeAmount === undefined || editedPatient.monthlyFeeAmount <= 0) {
            toast({ title: "Valor da Mensalidade Inválido", description: "O valor da mensalidade deve ser maior que zero.", variant: "destructive" });
            return;
        }
        if (editedPatient.monthlyFeeDueDate === undefined || editedPatient.monthlyFeeDueDate < 1 || editedPatient.monthlyFeeDueDate > 31) {
             toast({ title: "Dia de Vencimento Inválido", description: "O dia de vencimento deve ser entre 1 e 31.", variant: "destructive" });
            return;
        }
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
        anamnese: editedPatient.anamnese || '',
        hasMonthlyFee: editedPatient.hasMonthlyFee || false,
        monthlyFeeAmount: editedPatient.hasMonthlyFee ? (editedPatient.monthlyFeeAmount || 0) : null, // Save null if no fee
        monthlyFeeDueDate: editedPatient.hasMonthlyFee ? (editedPatient.monthlyFeeDueDate || 1) : null, // Save null if no fee
      };
      await updateDoc(patientRef, dataToSave);
      // No need to call loadPageData directly if relying on onSnapshot for patient data too,
      // but for now, explicitly reloading patient data after save.
      // If patient data itself becomes reactive via onSnapshot, this manual reload can be removed.
      await loadPatientDoc(firebaseUserAuth, currentUserData);
      toast({ title: "Sucesso!", description: `Dados de ${editedPatient.name} atualizados.`, variant: "success" });
      setIsEditing(false);
    } catch (error) {
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar as alterações do paciente.", variant: "destructive" });
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      handleSaveEditedPatient();
    } else if (patient) {
      setEditedPatient({
        ...patient,
        objetivoPaciente: patient.objetivoPaciente || getFirstActiveObjectiveName() || '',
        anamnese: patient.anamnese || '',
        hasMonthlyFee: patient.hasMonthlyFee || false,
        monthlyFeeAmount: patient.monthlyFeeAmount === 0 ? 0 : (patient.monthlyFeeAmount || undefined),
        monthlyFeeDueDate: patient.monthlyFeeDueDate || 1,
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (patient) setEditedPatient({ ...patient });
    setIsEditing(false);
    setSelectedAnamneseModelKey('none');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editedPatient) return;
    const { name, value } = e.target;
    setEditedPatient(prev => prev ? { ...prev, [name]: value } : undefined);
  };

  const handleSwitchChangeForEdit = (name: keyof Patient, checked: boolean) => {
    if (!editedPatient) return;
    setEditedPatient(prev => {
      if (!prev) return undefined;
      const newState = { ...prev, [name]: checked };
      if (name === 'hasMonthlyFee' && !checked) {
        newState.monthlyFeeAmount = undefined; // Reset if fee is disabled
        newState.monthlyFeeDueDate = 1; // Reset to default
      }
      return newState;
    });
  };

  const handleNumericInputChangeForEdit = (name: keyof Patient, value: string) => {
    if (!editedPatient) return;
    const numValue = name === 'monthlyFeeAmount' ? parseFloat(value) : parseInt(value, 10);
    setEditedPatient(prev => prev ? { ...prev, [name]: isNaN(numValue) ? (name === 'monthlyFeeAmount' ? undefined : 1) : numValue } : undefined);
  };


  const handleAnamneseChange = (content: string) => {
    if (isEditing && editedPatient) {
      setEditedPatient(prev => prev ? { ...prev, anamnese: content } : undefined);
    }
  };

  const handleSelectChange = (name: keyof Patient, value: string) => {
    if (!editedPatient) return;
    setEditedPatient(prev => prev ? { ...prev, [name]: value } : undefined);
  }

  const handleToggleStatus = async () => {
    if (!patient || !patient.internalId || !firebaseUserAuth) return;
    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      const newStatus = patient.status === 'Ativo' ? 'Inativo' : 'Ativo';
      await updateDoc(patientRef, { status: newStatus });
      // Assuming patient data might become reactive, otherwise re-fetch:
      await loadPatientDoc(firebaseUserAuth, currentUserData);
      toast({ title: `Paciente ${newStatus}`, description: `Status de ${patient.name} atualizado.`, variant: newStatus === 'Ativo' ? 'success' : 'warning', });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar status.', variant: 'destructive' });
    }
  };

  const handleAddHistory = async () => {
    const isNoteEmpty = !newHistoryNote || newHistoryNote.trim() === '<p></p>' || newHistoryNote.trim() === '';
    if (isNoteEmpty || !patient || !patient.internalId || !newHistoryType.trim() || !firebaseUserAuth || !currentUserData) {
      toast({ title: "Campos Obrigatórios", description: "Tipo de atendimento e observações são obrigatórios para adicionar ao histórico.", variant: "destructive" });
      return;
    }
    const activeType = appointmentTypes.find(t => t.name === newHistoryType && t.status === 'active');
    if (!activeType) {
      toast({ title: "Tipo Inválido", description: "O tipo de atendimento selecionado não está ativo.", variant: "destructive" });
      return;
    }
    const newEntry: HistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      type: newHistoryType,
      notes: newHistoryNote,
      createdById: firebaseUserAuth.uid,
      createdByName: currentUserData.nomeCompleto || firebaseUserAuth.displayName || 'Usuário Desconhecido',
    };
    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      const currentPatientDoc = await getDoc(patientRef);
      const currentPatientData = currentPatientDoc.data() as Patient | undefined;
      const currentHistory = currentPatientData?.history || [];
      const updatedHistory = [newEntry, ...currentHistory];
      await updateDoc(patientRef, { history: updatedHistory });
      await loadPatientDoc(firebaseUserAuth, currentUserData);
      setNewHistoryNote('');
      setNewHistoryType(getFirstActiveTypeName() || '');
      toast({ title: "Histórico Adicionado", description: "Novo registro adicionado com sucesso.", variant: "success" });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar o registro ao histórico.", variant: "destructive" });
    }
  };

  const handleDeletePatient = async () => {
    if (!patient || !patient.internalId) return;
    try {
      await deleteDoc(doc(db, 'pacientes', patient.internalId));
      toast({ title: 'Paciente excluído', description: `${patient.name} foi removido com sucesso.`, variant: 'success' });
      router.push('/pacientes');
    } catch (error) {
      toast({ title: 'Erro ao Excluir', description: 'Não foi possível excluir o paciente.', variant: 'destructive' });
    }
  };

  const handleAddCustomType = async () => {
    if (!currentUserData) {
      toast({ title: "Erro de Autenticação", description: "Dados do usuário não carregados.", variant: "destructive" });
      return;
    }
    const trimmedName = newCustomType.name?.trim();
    if (!trimmedName) {
      toast({ title: 'Nome Inválido', description: 'O nome do tipo de atendimento não pode ser vazio.', variant: 'destructive' });
      return;
    }
    if (appointmentTypes.some(type => type.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo de atendimento "${trimmedName}" já existe.`, variant: "destructive" });
      return;
    }

    const typeDataToSave: Partial<AppointmentTypeObject> = {
        name: trimmedName,
        status: 'active',
    };

    if (currentUserData.plano !== 'Gratuito') {
        typeDataToSave.valor = newCustomType.valor || 0;
        typeDataToSave.lancarFinanceiroAutomatico = newCustomType.lancarFinanceiroAutomatico || false;
    } else {
        typeDataToSave.valor = 0;
        typeDataToSave.lancarFinanceiroAutomatico = false;
    }

    try {
      const tiposRef = getAppointmentTypesPath(currentUserData);
      await addDoc(tiposRef, { ...typeDataToSave, createdAt: serverTimestamp() });
      toast({ title: 'Tipo Adicionado', description: 'Novo tipo de atendimento adicionado com sucesso.', variant: 'success' });
      setNewCustomType({ name: '', valor: 0, lancarFinanceiroAutomatico: false, status: 'active' });
      setIsAddTypeDialogOpen(false);
      await fetchAppointmentTypes(currentUserData);
    } catch (error) {
      toast({ title: 'Erro ao Adicionar Tipo', description: 'Não foi possível adicionar o tipo de atendimento.', variant: 'destructive' });
    }
  };

  const handleSaveEditedTypeName = async () => {
    if (!editingTypeInfo || !editingTypeInfo.type.id || !currentUserData || !editingTypeInfo.currentData) {
      toast({ title: 'Erro', description: 'Dados para edição do tipo de atendimento incompletos.', variant: 'destructive' });
      return;
    }
    const { type: originalType, currentData } = editingTypeInfo;
    const newNameTrimmed = currentData.name?.trim();
    if (!newNameTrimmed) {
      toast({ title: "Nome Inválido", description: "O nome do tipo de atendimento não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (newNameTrimmed.toLowerCase() !== originalType.name.toLowerCase() &&
      appointmentTypes.some(type => type.id !== originalType.id && type.name.toLowerCase() === newNameTrimmed.toLowerCase())) {
      toast({ title: "Tipo Duplicado", description: `O tipo de atendimento "${newNameTrimmed}" já existe.`, variant: "destructive" });
      return;
    }

    const typeDataToUpdate: Partial<AppointmentTypeObject> = { name: newNameTrimmed };
    if (currentUserData.plano !== 'Gratuito') {
        typeDataToUpdate.valor = currentData.valor || 0;
        typeDataToUpdate.lancarFinanceiroAutomatico = currentData.lancarFinanceiroAutomatico || false;
    } else {
        typeDataToUpdate.valor = 0;
        typeDataToUpdate.lancarFinanceiroAutomatico = false;
    }


    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToUpdateRef = doc(tiposCollectionRef, originalType.id);
      await updateDoc(docToUpdateRef, typeDataToUpdate);
      setEditingTypeInfo(null);
      toast({ title: "Tipo Atualizado", description: `Tipo "${originalType.name}" atualizado com sucesso.`, variant: "success" });
      await fetchAppointmentTypes(currentUserData);
      if (newHistoryType === originalType.name) setNewHistoryType(newNameTrimmed);
    } catch (error) {
      toast({ title: "Erro ao Editar Tipo", description: "Falha ao atualizar o tipo de atendimento.", variant: "destructive" });
    }
  };

  const handleToggleTypeStatus = async (typeToToggle: AppointmentTypeObject) => {
    if (!typeToToggle || !typeToToggle.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações do tipo de atendimento ou usuário incompletas.', variant: 'destructive' });
      setTypeToToggleStatusConfirm(null);
      return;
    }
    const newStatus = typeToToggle.status === 'active' ? 'inactive' : 'active';
    const activeTypesCount = appointmentTypes.filter(t => t.status === 'active').length;
    if (newStatus === 'inactive') {
      if (activeTypesCount <= 1 && appointmentTypes.length > 1 && appointmentTypes.some(t => t.status === 'inactive' && t.id !== typeToToggle.id)) {
        toast({ title: "Atenção", description: "Não é possível desativar o último tipo ativo se existirem outros tipos inativos.", variant: "warning" });
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
      if (newHistoryType === typeToToggle.name && newStatus === 'inactive') setNewHistoryType(getFirstActiveTypeName() || '');
    } catch (error) {
      toast({ title: "Erro ao Alterar Status", description: "Falha ao alterar o status do tipo de atendimento.", variant: "destructive" });
    }
  };

  const handleOpenDeleteTypeDialog = (type: AppointmentTypeObject) => {
    setTypeToDelete(type);
    setIsDeleteTypeConfirmOpen(true);
  };

  const handleConfirmDeleteType = async () => {
    if (!typeToDelete || !typeToDelete.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações para exclusão do tipo de atendimento incompletas.', variant: 'destructive' });
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
      return;
    }
    try {
      const tiposCollectionRef = getAppointmentTypesPath(currentUserData);
      const docToDeleteRef = doc(tiposCollectionRef, typeToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Tipo Excluído", description: `O tipo "${typeToDelete.name}" foi removido com sucesso.`, variant: "success" });
      await fetchAppointmentTypes(currentUserData);
      if (newHistoryType === typeToDelete.name) setNewHistoryType(getFirstActiveTypeName() || '');
    } catch (error) {
      toast({ title: "Erro ao Excluir Tipo", description: `Não foi possível excluir o tipo. Verifique se ele está em uso.`, variant: "destructive" });
    } finally {
      setIsDeleteTypeConfirmOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleAddCustomObjective = async () => {
    if (!currentUserData) {
      toast({ title: "Erro de Autenticação", description: "Dados do usuário não carregados.", variant: "destructive" });
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
      toast({ title: "Objetivo Adicionado", description: "Novo objetivo adicionado com sucesso.", variant: "success" });
      await fetchPatientObjectives(currentUserData);
    } catch (error) {
      toast({ title: "Erro ao Adicionar Objetivo", description: "Falha ao adicionar o objetivo.", variant: "destructive" });
    }
  };

  const handleSaveEditedObjectiveName = async () => {
    if (!editingObjectiveInfo || !editingObjectiveInfo.objective.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Dados para edição do objetivo incompletos.', variant: 'destructive' });
      return;
    }
    const { objective: originalObjective, currentName } = editingObjectiveInfo;
    const newNameTrimmed = currentName.trim();
    if (!newNameTrimmed) {
      toast({ title: "Nome Inválido", description: "O nome do objetivo não pode ser vazio.", variant: "destructive" });
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
      toast({ title: "Objetivo Atualizado", description: `Objetivo atualizado para "${newNameTrimmed}".`, variant: "success" });
      await fetchPatientObjectives(currentUserData);
      if (editedPatient?.objetivoPaciente === originalObjective.name) {
        setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: newNameTrimmed } : undefined);
      }
    } catch (error) {
      toast({ title: "Erro ao Editar Objetivo", description: "Falha ao editar o objetivo.", variant: "destructive" });
    }
  };

  const handleToggleObjectiveStatus = async (objectiveToToggle: PatientObjectiveObject) => {
    if (!objectiveToToggle || !objectiveToToggle.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações do objetivo ou usuário incompletas.', variant: 'destructive' });
      setObjectiveToToggleStatusConfirm(null);
      return;
    }
    const newStatus = objectiveToToggle.status === 'active' ? 'inactive' : 'active';
    const activeObjectivesCount = patientObjectives.filter(o => o.status === 'active').length;
    if (newStatus === 'inactive') {
      if (activeObjectivesCount <= 1 && patientObjectives.length > 1 && patientObjectives.some(o => o.status === 'inactive' && o.id !== objectiveToToggle.id)) {
        toast({ title: "Atenção", description: "Não é possível desativar o último objetivo ativo se existirem outros objetivos inativos.", variant: "warning" });
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
      toast({ title: "Status Alterado", description: `Objetivo "${objectiveToToggle.name}" foi ${newStatus === 'active' ? 'ativado' : 'desativado'}.` });
      await fetchPatientObjectives(currentUserData);
      if (editedPatient?.objetivoPaciente === objectiveToToggle.name && newStatus === 'inactive') {
        setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' } : undefined);
      }
    } catch (error) {
      toast({ title: "Erro ao Alterar Status", description: "Falha ao alterar o status do objetivo.", variant: "destructive" });
    }
  };

  const handleOpenDeleteObjectiveDialog = (objective: PatientObjectiveObject) => {
    setObjectiveToDelete(objective);
    setIsDeleteObjectiveConfirmOpen(true);
  };

  const handleConfirmDeleteObjective = async () => {
    if (!objectiveToDelete || !objectiveToDelete.id || !currentUserData) {
      toast({ title: 'Erro', description: 'Informações para exclusão do objetivo incompletas.', variant: 'destructive' });
      setIsDeleteObjectiveConfirmOpen(false);
      setObjectiveToDelete(null);
      return;
    }
    try {
      const objectivesCollectionRef = getPatientObjectivesPath(currentUserData);
      const docToDeleteRef = doc(objectivesCollectionRef, objectiveToDelete.id);
      await deleteDoc(docToDeleteRef);
      toast({ title: "Objetivo Excluído", description: `Objetivo "${objectiveToDelete.name}" removido com sucesso.`, variant: "success" });
      await fetchPatientObjectives(currentUserData);
      if (editedPatient?.objetivoPaciente === objectiveToDelete.name) {
        setEditedPatient(prev => prev ? { ...prev, objetivoPaciente: getFirstActiveObjectiveName() || '' } : undefined);
      }
    } catch (error) {
      toast({ title: "Erro ao Excluir Objetivo", description: "Falha ao excluir o objetivo.", variant: "destructive" });
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
      toast({ title: "Erro ao Exportar", description: "Conteúdo da nota não encontrado para exportação.", variant: "destructive" });
      return;
    }
    try {
      const canvas = await html2canvas(contentElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margin on each side
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
      pdf.save(`evolucao-${patient.name.replace(/\s+/g, '_')}-${selectedHistoryNote.date.replace(/\//g, '-')}.pdf`);
      toast({ title: "PDF Exportado", description: "A nota do histórico foi exportada como PDF.", variant: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Erro ao Exportar PDF", description: "Não foi possível gerar o arquivo PDF.", variant: "destructive" });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "documentos") {
      toast({ title: "Em Desenvolvimento", description: "A funcionalidade de gestão de documentos estará disponível em breve!", variant: "default" });
    }
  };

  const handleOpenDeleteHistoryDialog = (historyItem: HistoryItem) => {
    setHistoryItemToDelete(historyItem);
    setIsDeleteHistoryConfirmOpen(true);
  };

  const handleConfirmDeleteHistory = async () => {
    if (!patient || !patient.internalId || !historyItemToDelete || !firebaseUserAuth) {
      toast({ title: "Erro", description: "Não foi possível identificar o registro para exclusão.", variant: "destructive" });
      return;
    }
    try {
      const patientRef = doc(db, 'pacientes', patient.internalId);
      const currentPatientDoc = await getDoc(patientRef);
      const currentPatientData = currentPatientDoc.data() as Patient | undefined;
      if (!currentPatientData) {
        toast({ title: "Erro", description: "Paciente não encontrado no banco de dados.", variant: "destructive" });
        return;
      }
      const updatedHistory = (currentPatientData.history || []).filter(item => item.id !== historyItemToDelete.id);
      await updateDoc(patientRef, { history: updatedHistory });
      setPatient(prev => prev ? { ...prev, history: updatedHistory } : undefined);
      if (isEditing && editedPatient) setEditedPatient(prev => prev ? { ...prev, history: updatedHistory } : undefined);
      toast({ title: "Registro Excluído", description: "O registro do histórico foi removido com sucesso.", variant: "success" });
    } catch (error) {
      toast({ title: "Erro ao Excluir Registro", description: "Não foi possível excluir o registro do histórico.", variant: "destructive" });
    } finally {
      setIsDeleteHistoryConfirmOpen(false);
      setHistoryItemToDelete(null);
    }
  };

  const applyAnamneseTemplate = (templateKey: string) => {
    if (templateKey === 'none') {
        setSelectedAnamneseModelKey('none');
        return;
    }
    const selectedTemplate = anamneseTemplatesForUser.find(t => t.key === templateKey);
    if (selectedTemplate) {
      if (editedPatient?.anamnese && editedPatient.anamnese.trim() !== '' && editedPatient.anamnese.trim() !== '<p></p>') {
        setTemplateToApply(selectedTemplate);
        setIsConfirmOverwriteAnamneseOpen(true);
      } else {
        handleAnamneseChange(selectedTemplate.content);
        setSelectedAnamneseModelKey(templateKey);
      }
    }
  };

  const confirmOverwriteAnamnese = () => {
    if (templateToApply) {
      handleAnamneseChange(templateToApply.content);
      setSelectedAnamneseModelKey(templateToApply.key);
    }
    setIsConfirmOverwriteAnamneseOpen(false);
    setTemplateToApply(null);
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
      if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) return age - 1;
      return age;
    } catch { return '-'; }
  };
  const formatDate = (dateString: string | undefined, formatStr = 'PPP') => {
    if (!dateString) return 'Data não disponível';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return format(new Date(year, month - 1, day), formatStr, { locale: ptBR });
    } catch {
      try { return format(parseISO(dateString), formatStr, { locale: ptBR }); }
      catch { return dateString; }
    }
  };

  const showMonthlyFeeEditFields = currentUserData?.plano === 'Profissional' || currentUserData?.plano === 'Clínica';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
              <Button size="sm" onClick={handleEditToggle}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className={`hover:text-black ${displayPatient.status === 'Ativo' ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-green-600 border-green-300 hover:bg-green-50'}`}>{displayPatient.status === 'Ativo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}{displayPatient.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja {displayPatient.status === 'Ativo' ? 'inativar' : 'ativar'} o paciente <strong>{displayPatient.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className={displayPatient.status === 'Inativo' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} onClick={handleToggleStatus}>{displayPatient.status === 'Ativo' ? 'Inativar' : 'Ativar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" onClick={handleEditToggle}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Excluir Paciente</Button></AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o paciente <strong>{displayPatient.name}</strong>? Esta ação não pode ser desfeita e removerá todo o histórico associado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeletePatient}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border"><AvatarImage src={displayPatient?.avatar} alt={displayPatient?.name} data-ai-hint="person face" /><AvatarFallback>{displayPatient?.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
            <div>
              <CardTitle className="text-2xl">{displayPatient?.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1"><CardDescription>{calculateAge(displayPatient?.dob || '')} anos</CardDescription><Badge variant={displayPatient?.status === 'Ativo' ? 'default' : 'secondary'} className={`px-2 py-0.5 text-xs ${displayPatient?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{displayPatient?.status}</Badge></div>
              <p className="text-sm text-muted-foreground mt-1">{displayPatient?.email}</p><p className="text-sm text-muted-foreground">{displayPatient?.phone}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue={initialTab} value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-wrap w-full items-center justify-start rounded-none border-b bg-transparent px-2 py-0 sm:px-4">
                <TabsTrigger value="historico" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Histórico</TabsTrigger>
                <TabsTrigger value="anamnese" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Anamnese</TabsTrigger>
                <TabsTrigger value="documentos" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Documentos</TabsTrigger>
                <TabsTrigger value="dados" className="flex-auto sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-3 h-auto">Dados Cadastrais</TabsTrigger>
            </TabsList>
            <TabsContent value="historico" className="p-6 space-y-6 mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg font-semibold flex items-center"><CalendarPlus className="mr-2 h-5 w-5 text-primary" /> Novo Registro</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="atendimento-tipo">Tipo</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Select value={newHistoryType} onValueChange={(value) => setNewHistoryType(value)}><SelectTrigger id="atendimento-tipo" className="flex-grow"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{activeAppointmentTypes.map((type) => <SelectItem key={type.id || type.name} value={type.name}>{type.name}</SelectItem>)}{activeAppointmentTypes.length === 0 && <SelectItem value="no-types" disabled>Nenhum tipo</SelectItem>}</SelectContent></Select>
                      <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setIsAddTypeDialogOpen(true)} title="Adicionar"><Plus className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setIsManageTypesDialogOpen(true)} title="Gerenciar"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="atendimento-notas">Observações</Label>
                    <div className="mt-1">{isClient && TiptapEditor ? <TiptapEditor content={newHistoryNote} onChange={setNewHistoryNote} /> : <div className="w-full h-[150px] border rounded-md bg-muted/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="ml-2">Carregando...</p></div>}</div>
                  </div>
                </CardContent>
                <CardFooter><Button onClick={handleAddHistory} disabled={(!newHistoryNote || newHistoryNote.trim() === '<p></p>' || newHistoryNote.trim() === '') || !newHistoryType.trim()}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button></CardFooter>
              </Card>
              <h3 className="text-lg font-semibold pt-6 border-t">Evolução do Paciente</h3>
              {displayPatient?.history && displayPatient.history.length > 0 ? (
                [...displayPatient.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, index) => (
                  <Card key={`${item.id || 'fallbackID'}-${index}`} className="bg-muted/50">
                    <CardHeader className="pb-3 flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{item.type}</CardTitle>
                        <span className="text-sm font-normal text-muted-foreground">{formatDate(item.date)}</span>
                        {item.createdByName && currentUserData?.plano === 'Clínica' && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><UserCog className="h-3 w-3" /> Registrado por: {item.createdByName}</p>
                        )}
                      </div>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /><span className="sr-only">Opções</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleOpenHistoryModal(item)}><Eye className="mr-2 h-4 w-4" /> Ver Detalhes</DropdownMenuItem><DropdownMenuItem onClick={() => handleOpenDeleteHistoryDialog(item)} className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir Registro</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-foreground history-note-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.notes.length > 250 ? item.notes.substring(0, 250) + "..." : item.notes }} />
                      {item.notes.length > 250 && <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary" onClick={() => handleOpenHistoryModal(item)}>Ver Detalhes</Button>}
                    </CardContent>
                  </Card>
                ))
              ) : <p className="text-muted-foreground text-center py-4">Nenhum histórico de atendimento registrado para este paciente.</p>}
            </TabsContent>
            <TabsContent value="anamnese" className="p-6 space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <BookText className="mr-2 h-5 w-5 text-primary" /> Registro de Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing && anamneseTemplatesForUser.length > 0 && (
                    <div className="mb-4">
                      <Label htmlFor="anamnese-template-select">Usar modelo de Anamnese</Label>
                      <Select
                        value={selectedAnamneseModelKey}
                        onValueChange={(value) => applyAnamneseTemplate(value)}
                      >
                        <SelectTrigger id="anamnese-template-select">
                          <SelectValue placeholder="Selecionar modelo (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (começar em branco)</SelectItem>
                          {anamneseTemplatesForUser
                            .filter(template => template.key && template.key.trim() !== "")
                            .map((template) => (
                            <SelectItem key={template.key} value={template.key}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {isEditing ? (
                    isClient && TiptapEditor ? (
                      <TiptapEditor
                        content={editedPatient?.anamnese || ''}
                        onChange={handleAnamneseChange}
                      />
                    ) : (
                      <div className="w-full h-[200px] border rounded-md bg-muted/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p className="ml-2 text-muted-foreground">Carregando editor de anamnese...</p>
                      </div>
                    )
                  ) : (
                    displayPatient?.anamnese && displayPatient.anamnese.trim() !== '' && displayPatient.anamnese.trim() !== '<p></p>' ? (
                      <div
                        className="prose prose-sm max-w-none p-4 border rounded-md bg-muted/30 min-h-[150px]"
                        dangerouslySetInnerHTML={{ __html: displayPatient.anamnese }}
                      />
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Nenhum registro de anamnese para este paciente. Clique em "Editar" para adicionar.</p>
                    )
                  )}
                </CardContent>
                {isEditing && (
                  <CardFooter>
                    <Button onClick={handleSaveEditedPatient}><Save className="mr-2 h-4 w-4" /> Salvar Anamnese</Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="documentos" className="p-6 space-y-6 mt-0">
              <Card><CardHeader><CardTitle className="text-lg font-semibold">Documentos do Paciente</CardTitle></CardHeader><CardContent className="text-center py-16 text-muted-foreground"><Info className="mx-auto h-12 w-12" /><p>Funcionalidade de Documentos em desenvolvimento.</p><p className="text-sm">Estará disponível em breve!</p></CardContent></Card>
            </TabsContent>
            <TabsContent value="dados" className="p-6 space-y-4 mt-0">
              <h3 className="text-lg font-semibold">Informações Pessoais</h3>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1"><Label htmlFor="edit-name">Nome*</Label><Input id="edit-name" name="name" value={editedPatient?.name || ''} onChange={handleInputChange} /></div>
                  <div className="space-y-1"><Label htmlFor="edit-dob">Nascimento</Label><Input id="edit-dob" name="dob" type="date" value={editedPatient?.dob || ''} onChange={handleInputChange} max={format(new Date(), 'yyyy-MM-dd')} /></div>
                  <div className="space-y-1"><Label htmlFor="edit-email">Email*</Label><Input id="edit-email" name="email" type="email" value={editedPatient?.email || ''} onChange={handleInputChange} /></div>
                  <div className="space-y-1"><Label htmlFor="edit-phone">Telefone</Label><Input id="edit-phone" name="phone" type="tel" value={editedPatient?.phone || ''} onChange={handleInputChange} /></div>
                  <div className="md:col-span-2 space-y-1"><Label htmlFor="edit-address">Endereço</Label><Input id="edit-address" name="address" value={editedPatient?.address || ''} onChange={handleInputChange} /></div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-objetivoPaciente">Objetivo</Label>
                    <div className="flex items-center gap-1">
                      <Select name="objetivoPaciente" value={editedPatient?.objetivoPaciente || ''} onValueChange={(value) => handleSelectChange('objetivoPaciente', value)}><SelectTrigger id="edit-objetivoPaciente" className="flex-grow"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{activePatientObjectives.map((obj) => <SelectItem key={obj.id || obj.name} value={obj.name}>{obj.name}</SelectItem>)}{activePatientObjectives.length === 0 && <SelectItem value="no-objectives" disabled>Nenhum</SelectItem>}</SelectContent></Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsAddObjectiveDialogOpen(true)} title="Adicionar" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsManageObjectivesDialogOpen(true)} title="Gerenciar" className="flex-shrink-0"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-status">Status</Label>
                    <select id="edit-status" name="status" value={editedPatient?.status || 'Ativo'} onChange={handleInputChange} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
                  </div>
                  {showMonthlyFeeEditFields && (
                    <>
                      <div className="md:col-span-2 border-t pt-4 mt-2">
                         <h4 className="text-md font-semibold mb-3 text-primary">Configuração de Mensalidade</h4>
                      </div>
                      <div className="space-y-1 flex items-center md:col-span-2">
                        <Label htmlFor="edit-hasMonthlyFee" className="mr-2">Paciente possui mensalidade?</Label>
                        <Switch
                          id="edit-hasMonthlyFee"
                          name="hasMonthlyFee"
                          checked={editedPatient?.hasMonthlyFee || false}
                          onCheckedChange={(checked) => handleSwitchChangeForEdit('hasMonthlyFee', checked)}
                        />
                      </div>
                      {editedPatient?.hasMonthlyFee && (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="edit-monthlyFeeAmount">Valor Mensalidade (R$)</Label>
                            <Input
                              id="edit-monthlyFeeAmount"
                              name="monthlyFeeAmount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={editedPatient?.monthlyFeeAmount || ''}
                              onChange={(e) => handleNumericInputChangeForEdit('monthlyFeeAmount', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="edit-monthlyFeeDueDate">Dia Vencimento</Label>
                            <Select
                              name="monthlyFeeDueDate"
                              value={editedPatient?.monthlyFeeDueDate?.toString() || '1'}
                              onValueChange={(value) => handleNumericInputChangeForEdit('monthlyFeeDueDate', value)}
                            >
                              <SelectTrigger id="edit-monthlyFeeDueDate">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <SelectItem key={day} value={day.toString()}>{day.toString().padStart(2, '0')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div><strong>Nome:</strong> {patient?.name}</div><div><strong>Nascimento:</strong> {formatDate(patient?.dob)}</div><div><strong>Email:</strong> {patient?.email}</div><div><strong>Telefone:</strong> {patient?.phone || '-'}</div>
                  <div className="md:col-span-2"><strong>Endereço:</strong> {patient?.address || '-'}</div><div><strong>Objetivo:</strong> {patient?.objetivoPaciente || '-'}</div><div><strong>Status:</strong> <Badge variant={patient?.status === 'Ativo' ? 'default' : 'secondary'} className={`ml-2 px-2 py-0.5 text-xs ${patient?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{patient?.status}</Badge></div>
                   {showMonthlyFeeEditFields && patient?.hasMonthlyFee && (
                     <>
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                             <h4 className="text-md font-semibold text-primary">Detalhes da Mensalidade</h4>
                        </div>
                        <div><strong>Possui Mensalidade:</strong> Sim</div>
                        <div><strong>Valor:</strong> R$ {(patient.monthlyFeeAmount || 0).toFixed(2)}</div>
                        <div><strong>Dia Vencimento:</strong> {patient.monthlyFeeDueDate?.toString().padStart(2, '0')}</div>
                     </>
                   )}
                   {showMonthlyFeeEditFields && !patient?.hasMonthlyFee && (
                     <>
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                             <h4 className="text-md font-semibold text-primary">Detalhes da Mensalidade</h4>
                        </div>
                        <div><strong>Possui Mensalidade:</strong> Não</div>
                     </>
                   )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Novo Tipo de Atendimento</DialogTitle><DialogDescription>Insira os detalhes.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="newCustomTypeName" className="text-right col-span-1">Nome*</Label><Input id="newCustomTypeName" value={newCustomType.name} onChange={(e) => setNewCustomType(prev => ({ ...prev, name: e.target.value }))} className="col-span-3" /></div>
            {currentUserData?.plano !== 'Gratuito' && (
                <>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="newCustomTypeValor" className="text-right col-span-1">Valor (R$)</Label><Input id="newCustomTypeValor" type="number" value={newCustomType.valor || ''} onChange={(e) => setNewCustomType(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))} className="col-span-3" placeholder="0.00" /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="newCustomTypeLancar" className="text-right col-span-3">Lançar Financeiro Automático?</Label><Switch id="newCustomTypeLancar" checked={newCustomType.lancarFinanceiroAutomatico} onCheckedChange={(checked) => setNewCustomType(prev => ({ ...prev, lancarFinanceiroAutomatico: checked }))} className="col-span-1 justify-self-start" /></div>
                </>
            )}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline" onClick={() => setNewCustomType({ name: '', valor: 0, lancarFinanceiroAutomatico: false, status: 'active' })}>Cancelar</Button></DialogClose><Button onClick={handleAddCustomType}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageTypesDialogOpen} onOpenChange={setIsManageTypesDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">
            {appointmentTypes.map((type) => (
              <div key={type.id || type.name} className="flex items-center justify-between p-2 border rounded-md">
                {editingTypeInfo?.type.id === type.id ? (
                  <div className="flex-grow grid grid-cols-3 gap-2 mr-2 items-center">
                    <Input value={editingTypeInfo.currentData?.name || ''} onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, name: e.target.value } } : null)} className="h-8 col-span-3" placeholder="Nome" />
                    {currentUserData?.plano !== 'Gratuito' && (
                        <>
                            <Input type="number" value={editingTypeInfo.currentData?.valor || ''} onChange={(e) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, valor: parseFloat(e.target.value) || 0 } } : null)} className="h-8 col-span-1" placeholder="Valor" />
                            <div className="col-span-2 flex items-center justify-end mt-1 gap-2"><Label htmlFor={`editLancar-${type.id}`} className="text-xs">Lançar Auto.?</Label><Switch id={`editLancar-${type.id}`} checked={editingTypeInfo.currentData?.lancarFinanceiroAutomatico || false} onCheckedChange={(checked) => setEditingTypeInfo(prev => prev ? { ...prev, currentData: { ...prev.currentData, lancarFinanceiroAutomatico: checked } } : null)} /></div>
                        </>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow"><span className={`${type.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{type.name}</span>
                  {currentUserData?.plano !== 'Gratuito' && (
                    <div className="text-xs text-muted-foreground">Valor: R$ {(type.valor || 0).toFixed(2)} - Lanç. Auto: {type.lancarFinanceiroAutomatico ? 'Sim' : 'Não'}</div>
                  )}
                  </div>
                )}
                <div className="flex gap-1 items-center ml-auto">
                  {editingTypeInfo?.type.id === type.id ? (<><Button size="icon" className="h-8 w-8" onClick={handleSaveEditedTypeName} title="Salvar"><Save className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTypeInfo(null)} title="Cancelar"><X className="h-4 w-4" /></Button></>)
                    : (<><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTypeInfo({ type: type, currentData: { name: type.name, valor: type.valor, lancarFinanceiroAutomatico: type.lancarFinanceiroAutomatico } })} title="Editar"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteTypeDialog(type)} title="Excluir"><Trash2 className="h-4 w-4" /></Button></>)}
                  <Switch checked={type.status === 'active'} onCheckedChange={() => setTypeToToggleStatusConfirm(type)} aria-label={`Status ${type.name}`} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400" />
                </div>
              </div>
            ))}
            {appointmentTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo.</p>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!typeToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setTypeToToggleStatusConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Status</AlertDialogTitle><AlertDialogDescription>Deseja {typeToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} "{typeToToggleStatusConfirm?.name}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setTypeToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => typeToToggleStatusConfirm && handleToggleTypeStatus(typeToToggleStatusConfirm)} className={typeToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}>{typeToToggleStatusConfirm?.status === 'active' ? 'Desativar' : 'Ativar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isDeleteTypeConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) setTypeToDelete(null); setIsDeleteTypeConfirmOpen(isOpen); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir "<strong>{typeToDelete?.name}</strong>"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setTypeToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteType} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={isAddObjectiveDialogOpen} onOpenChange={setIsAddObjectiveDialogOpen}><DialogContent className="sm:max-w-[400px]"><DialogHeader><DialogTitle>Novo Objetivo</DialogTitle><DialogDescription>Insira o nome.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="newCustomObjectiveNameModal">Nome*</Label><Input id="newCustomObjectiveNameModal" value={newCustomObjectiveName} onChange={(e) => setNewCustomObjectiveName(e.target.value)} /></div><DialogFooter><DialogClose asChild><Button variant="outline" onClick={() => setNewCustomObjectiveName('')}>Cancelar</Button></DialogClose><Button onClick={handleAddCustomObjective}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isManageObjectivesDialogOpen} onOpenChange={setIsManageObjectivesDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Gerenciar Objetivos</DialogTitle></DialogHeader><div className="space-y-3 max-h-[60vh] overflow-y-auto py-4 px-1">{patientObjectives.map((obj) => (<div key={obj.id || obj.name} className="flex items-center justify-between p-2 border rounded-md">{editingObjectiveInfo?.objective.id === obj.id ? (<div className="flex-grow flex items-center gap-2 mr-2"><Input value={editingObjectiveInfo.currentName} onChange={(e) => setEditingObjectiveInfo(prev => prev ? { ...prev, currentName: e.target.value } : null)} className="h-8" /><Button size="icon" className="h-8 w-8" onClick={handleSaveEditedObjectiveName} title="Salvar"><Save className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingObjectiveInfo(null)} title="Cancelar"><X className="h-4 w-4" /></Button></div>) : (<span className={`flex-grow ${obj.status === 'inactive' ? 'text-muted-foreground line-through' : ''}`}>{obj.name}</span>)}<div className="flex gap-1 items-center ml-auto">{editingObjectiveInfo?.objective.id !== obj.id && (<><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingObjectiveInfo({ objective: obj, currentName: obj.name })} title="Editar"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDeleteObjectiveDialog(obj)} title="Excluir"><Trash2 className="h-4 w-4" /></Button></>)}<Switch checked={obj.status === 'active'} onCheckedChange={() => setObjectiveToToggleStatusConfirm(obj)} aria-label={`Status ${obj.name}`} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-400" /></div></div>))}{patientObjectives.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum objetivo.</p>}</div><DialogFooter><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!objectiveToToggleStatusConfirm} onOpenChange={(isOpen) => !isOpen && setObjectiveToToggleStatusConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Status Objetivo</AlertDialogTitle><AlertDialogDescription>Deseja {objectiveToToggleStatusConfirm?.status === 'active' ? 'desativar' : 'ativar'} "{objectiveToToggleStatusConfirm?.name}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setObjectiveToToggleStatusConfirm(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => objectiveToToggleStatusConfirm && handleToggleObjectiveStatus(objectiveToToggleStatusConfirm)} className={objectiveToToggleStatusConfirm?.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}>{objectiveToToggleStatusConfirm?.status === 'active' ? 'Desativar' : 'Ativar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isDeleteObjectiveConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) setObjectiveToDelete(null); setIsDeleteObjectiveConfirmOpen(isOpen); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Objetivo</AlertDialogTitle><AlertDialogDescription>Deseja excluir "<strong>{objectiveToDelete?.name}</strong>"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setObjectiveToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteObjective} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={isHistoryNoteModalOpen} onOpenChange={setIsHistoryNoteModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Evolução</DialogTitle>
            {selectedHistoryNote && (
              <DialogDescription>
                Informações sobre o registro do paciente.
              </DialogDescription>
            )}
          </DialogHeader>
          <div id="historyNoteContentToExport" className="py-4 max-h-[60vh] overflow-y-auto text-sm">
            {selectedHistoryNote && (
              <>
                <div className="mb-4 space-y-1 border-b pb-3">
                  <p><strong>Tipo de Atendimento:</strong> {selectedHistoryNote.type || 'Não especificado'}</p>
                  <p><strong>Data do Registro:</strong> {formatDate(selectedHistoryNote.date)}</p>
                  {selectedHistoryNote.createdByName && (
                    <p><strong>Registrado por:</strong> {selectedHistoryNote.createdByName}</p>
                  )}
                </div>
                <h3 className="font-semibold mb-2 text-base">Observações:</h3>
                <div
                  className="history-note-content prose prose-sm sm:prose-base max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedHistoryNote.notes || '<p>Nenhuma observação registrada.</p>' }}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" /> Exportar para PDF
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteHistoryConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) setHistoryItemToDelete(null); setIsDeleteHistoryConfirmOpen(isOpen); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Registro</AlertDialogTitle><AlertDialogDescription>Deseja excluir este registro de <strong>{historyItemToDelete?.type}</strong> em {historyItemToDelete ? formatDate(historyItemToDelete.date) : ''}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setHistoryItemToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteHistory} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={isConfirmOverwriteAnamneseOpen} onOpenChange={setIsConfirmOverwriteAnamneseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Sobrescrita</AlertDialogTitle>
            <AlertDialogDescription>
              O campo Anamnese já possui conteúdo. Deseja realmente aplicar o modelo selecionado e substituir o texto atual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsConfirmOverwriteAnamneseOpen(false); setTemplateToApply(null); setSelectedAnamneseModelKey('none'); }}>Não, manter atual</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverwriteAnamnese}>Sim, aplicar modelo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
