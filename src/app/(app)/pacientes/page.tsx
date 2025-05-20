
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Trash2, Eye, UserCheck, UserX } from "lucide-react"; // Added Eye, UserCheck, UserX
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
import { Badge } from '@/components/ui/badge'; // Import Badge
import { format, isFuture, parseISO, startOfDay } from 'date-fns'; // Added isFuture, parseISO, startOfDay
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
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const { toast } = useToast();
  const today = startOfDay(new Date());

  // Form state for new patient
  const [newPatient, setNewPatient] = useState<Partial<Omit<Patient, 'internalId'>>>({ // Exclude internalId from form
    name: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    status: 'Ativo', // Default status
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };

  // Buscar pacientes do Firestore para o usuário logado
  const fetchPatients = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    try {
      const q = query(
        collection(db, 'pacientes'),
        where('uid', '==', user.uid)
      );

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
        });
      });

      setPatients(loadedPatients);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    }
  };

  // useEffect apenas chama a função
  useEffect(() => {
    fetchPatients();
  }, []);

  {/* Função de adicionar um novo paciente */ }
  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    let nomeEmpresa = '';
    try {
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        nomeEmpresa = userDocSnap.data().nomeEmpresa || '';
      } else {
        toast({ title: "Erro", description: "Dados do usuário não encontrados.", variant: "destructive" });
        return;
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      toast({ title: "Erro", description: "Falha ao buscar dados do usuário.", variant: "destructive" });
      return;
    }

    // Validações
    if (!newPatient.name || !newPatient.email) {
      toast({ title: "Erro de Validação", description: "Nome e Email são obrigatórios.", variant: "destructive" });
      return;
    }

    const slug = generateSlug(newPatient.name);

    try {
      await addDoc(collection(db, 'pacientes'), {
        ...newPatient,
        uid: user.uid,
        nomeEmpresa,
        status: newPatient.status || 'Ativo',
        createdAt: serverTimestamp(),
        lastVisit: new Date().toISOString().split('T')[0],
        nextVisit: '-',
        slug, // <- este é o novo campo para poder buscar depois
        avatar: 'https://placehold.co/100x100.png',
        history: [], // <- inicia como vazio
        documents: [], // <- inicia como vazio
      });

      toast({ title: "Sucesso!", description: `Paciente ${newPatient.name} adicionado.`, variant: "success" });
      setNewPatient({ name: '', email: '', phone: '', dob: '', address: '', status: 'Ativo' });
      setIsNewPatientDialogOpen(false);
      await fetchPatients();
    } catch (error) {
      console.error("Erro ao adicionar paciente:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o paciente.", variant: "destructive" });
    }
  };

  const handleUpdatePatientStatus = async (patientInternalId: string, newStatus: 'Ativo' | 'Inativo') => {
    setPatients(prev =>
      prev.map(p =>
        p.internalId === patientInternalId ? { ...p, status: newStatus } : p
      )
    );

    const patientName = patients.find(p => p.internalId === patientInternalId)?.name || 'Paciente';
    const isInactive = newStatus.toLowerCase() === "inativo";

    toast({
      title: "Status Atualizado",
      description: `Status de ${patientName} alterado para ${newStatus}.`,
      variant: isInactive ? "warning" : "success"
    });

    console.log(`Paciente ${patientInternalId} status alterado para ${newStatus}`);

    // Atualizar no Firestore
    try {
      const patientRef = doc(db, 'pacientes', patientInternalId);
      await updateDoc(patientRef, {
        status: newStatus
      });
    } catch (error) {
      console.error("Erro ao atualizar status do paciente:", error);
    }
  };

  const handleDeletePatient = async (patientInternalId: string, patientName: string) => {
    setPatients(prev => prev.filter(p => p.internalId !== patientInternalId));

    toast({
      title: "Paciente Excluído",
      description: `Paciente ${patientName} foi removido com sucesso.`,
      variant: "destructive"
    });

    console.log("Paciente excluído:", patientInternalId);

    // Deletar do Firestore
    try {
      const patientRef = doc(db, 'pacientes', patientInternalId);
      await deleteDoc(patientRef);
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Paciente</DialogTitle>
              <DialogDescription>
                Preencha as informações básicas do novo paciente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPatient}>
              <div className="grid gap-4 py-4">
                {/* Form fields remain the same */}
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
                    max={format(today, 'yyyy-MM-dd')} // Prevent future dates in native date picker
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
          <CardDescription>Gerencie as informações e o status dos seus pacientes.</CardDescription> {/* Updated description */}
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
                {/* <TableHead className="hidden md:table-cell">Próxima Consulta</TableHead> */}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.internalId}> {/* Use internalId for key */}
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{patient.lastVisit}</TableCell>
                  {/* <TableCell className="hidden md:table-cell">{patient.nextVisit}</TableCell> */}
                  <TableCell>
                    <Badge variant={patient.status === 'Ativo' ? 'default' : 'secondary'} className={patient.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}> {/* Conditional Badge styling */}
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1"> {/* Adjusted spacing */}
                    {/* View Details Button */}
                    <Button asChild variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-100 h-8 w-8" title="Ver Detalhes">
                      <Link href={`/pacientes/${generateSlug(patient.name)}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>

                    {/* Activate/Inactivate Button with Confirmation */}
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


                    {/* Delete Button with Confirmation */}
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
    </div>
  );
}

