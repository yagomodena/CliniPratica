
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Placeholder data
const patients = [
  { id: 'p001', name: 'Ana Silva', lastVisit: '2024-07-15', nextVisit: '2024-08-15', status: 'Ativo' },
  { id: 'p002', name: 'Carlos Souza', lastVisit: '2024-07-10', nextVisit: '-', status: 'Ativo' },
  { id: 'p003', name: 'Beatriz Lima', lastVisit: '2024-06-20', nextVisit: '2024-07-25', status: 'Ativo' },
  { id: 'p004', name: 'Daniel Costa', lastVisit: '2024-07-18', nextVisit: '-', status: 'Inativo' },
  { id: 'p005', name: 'Fernanda Oliveira', lastVisit: '2024-07-01', nextVisit: '2024-08-01', status: 'Ativo' },
];

export default function PacientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>Gerencie as informações dos seus pacientes.</CardDescription>
           <div className="pt-4">
             <div className="relative">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Buscar paciente..." className="pl-8 w-full md:w-1/3" />
            </div>
           </div>
        </CardHeader>
        <CardContent>
           <Table>
             <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Última Consulta</TableHead>
                  <TableHead>Próxima Consulta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
               {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.lastVisit}</TableCell>
                    <TableCell>{patient.nextVisit}</TableCell>
                    <TableCell>{patient.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Ver Detalhes</Button>
                    </TableCell>
                  </TableRow>
               ))}
             </TableBody>
           </Table>
             {patients.length === 0 && (
                 <p className="text-center text-muted-foreground py-8">Nenhum paciente cadastrado.</p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
