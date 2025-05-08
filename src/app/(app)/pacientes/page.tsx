
'use client';

import { useState } from 'react';
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

// Placeholder data
// Added an 'internalId' to ensure stable keys even if 'id' changes or is reused by chance
const initialPatients = [
  { internalId: 'int-p001', id: 'p001', name: 'Ana Silva', lastVisit: '2024-07-15', nextVisit: '2024-08-15', status: 'Ativo', email: 'ana.silva@email.com', phone: '(11) 98765-4321', dob: '1985-03-15', address: 'Rua Exemplo, 123, São Paulo - SP' },
  { internalId: 'int-p002', id: 'p002', name: 'Carlos Souza', lastVisit: '2024-07-10', nextVisit: '-', status: 'Ativo', email: 'carlos@email.com', phone: '(21) 91234-5678', dob: '1990-11-20', address: 'Av. Teste, 456, Rio de Janeiro - RJ' },
  { internalId: 'int-p003', id: 'p003', name: 'Beatriz Lima', lastVisit: '2024-06-20', nextVisit: '2024-07-25', status: 'Ativo', email: 'bia@email.com', phone: '(31) 99999-8888', dob: '1978-05-01', address: 'Praça Modelo, 789, Belo Horizonte - MG' },
  { internalId: 'int-p004', id: 'p004', name: 'Daniel Costa', lastVisit: '2024-07-18', nextVisit: '-', status: 'Inativo', email: 'daniel.costa@email.com', phone: '(41) 97777-6666', dob: '2000-09-10', address: 'Alameda Certa, 101, Curitiba - PR' },
  { internalId: 'int-p005', id: 'p005', name: 'Fernanda Oliveira', lastVisit: '2024-07-01', nextVisit: '2024-08-01', status: 'Ativo', email: 'fe.oliveira@email.com', phone: '(51) 96543-2109', dob: '1995-12-25', address: 'Travessa Central, 111, Porto Alegre - RS' },
];

type Patient = typeof initialPatients[0];

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const { toast } = useToast();

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

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.email) {
       toast({ title: "Erro", description: "Nome e Email são obrigatórios.", variant: "destructive" });
      return;
    }
    const newInternalId = `int-p${Date.now()}`; // More robust unique ID
    const newPublicId = `p${(Math.random() * 1000).toFixed(0).padStart(3, '0')}`; // Keep simpler public ID for display/URL?
    const patientToAdd: Patient = {
      internalId: newInternalId,
      id: newPublicId,
      name: newPatient.name!,
      email: newPatient.email!,
      phone: newPatient.phone || '',
      dob: newPatient.dob || '',
      address: newPatient.address || '',
      lastVisit: new Date().toISOString().split('T')[0],
      nextVisit: '-',
      status: newPatient.status || 'Ativo',
    };
    setPatients(prev => [patientToAdd, ...prev]);
    setNewPatient({ name: '', email: '', phone: '', dob: '', address: '', status: 'Ativo' });
    setIsNewPatientDialogOpen(false);
    toast({ title: "Sucesso!", description: `Paciente ${patientToAdd.name} adicionado.`, variant: "success" });
    console.log("Novo paciente adicionado:", patientToAdd);
  };

   const handleUpdatePatientStatus = (patientInternalId: string, newStatus: 'Ativo' | 'Inativo') => {
      setPatients(prev => prev.map(p =>
          p.internalId === patientInternalId ? { ...p, status: newStatus } : p
      ));
      const patientName = patients.find(p => p.internalId === patientInternalId)?.name || 'Paciente';
      toast({
          title: "Status Atualizado",
          description: `Status de ${patientName} alterado para ${newStatus}.`,
          variant: "success"
      });
      console.log(`Paciente ${patientInternalId} status alterado para ${newStatus}`);
      // Note: In a real app, make an API call here.
  };

  const handleDeletePatient = (patientInternalId: string, patientName: string) => {
      setPatients(prev => prev.filter(p => p.internalId !== patientInternalId));
      toast({
          title: "Paciente Excluído",
          description: `Paciente ${patientName} foi removido com sucesso.`,
          variant: "destructive"
      });
      console.log("Paciente excluído:", patientInternalId);
      // Note: In a real application, this would involve an API call.
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
                            className={`${
                              patient.status === 'Ativo' ? 'text-orange-600 hover:bg-orange-100' : 'text-green-600 hover:bg-green-100'
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
