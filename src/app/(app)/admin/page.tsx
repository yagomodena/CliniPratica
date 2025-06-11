
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Search, Users, ChevronDown, Edit, CalendarDays } from 'lucide-react';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy, where, getCountFromServer, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

const ADMIN_EMAIL = 'yagobmodena1@gmail.com';

type SystemUser = {
  id: string;
  nomeCompleto?: string;
  nomeEmpresa?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  paymentMethodPreference?: string;
  statusCobranca?: 'ativo' | 'pendente' | 'cancelado' | 'trial' | 'trial_ended' | string;
  plano?: string;
  criadoEm?: any;
  trialEndsAt?: Timestamp | null;
  patientCount?: number;
};

const billingStatusOptions: Array<SystemUser['statusCobranca']> = ['ativo', 'pendente', 'cancelado', 'trial', 'trial_ended'];
const billingStatusLabels: Record<string, string> = {
    ativo: 'Ativo',
    pendente: 'Pendente',
    cancelado: 'Cancelado',
    trial: 'Período de Teste',
    trial_ended: 'Teste Finalizado',
};


export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSystemUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'usuarios');
      const qUsers = query(usersRef, orderBy('criadoEm', 'desc'));
      const usersSnapshot = await getDocs(qUsers);
      const usersListPromises: Promise<SystemUser>[] = usersSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let patientCount = 0;

        const patientsRef = collection(db, 'pacientes');
        let patientQuery;

        if (data.plano === 'Clínica' && data.nomeEmpresa) {
          patientQuery = query(patientsRef, where('nomeEmpresa', '==', data.nomeEmpresa), where('status', '==', 'Ativo'));
        } else {
          patientQuery = query(patientsRef, where('uid', '==', docSnap.id), where('status', '==', 'Ativo'));
        }
        
        try {
            const patientCountSnapshot = await getCountFromServer(patientQuery);
            patientCount = patientCountSnapshot.data().count;
        } catch (countError) {
            console.error(`Erro ao contar pacientes para ${data.email || docSnap.id}:`, countError);
        }

        return {
          id: docSnap.id,
          nomeCompleto: data.nomeCompleto,
          nomeEmpresa: data.nomeEmpresa,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          paymentMethodPreference: data.paymentMethodPreference,
          statusCobranca: data.statusCobranca,
          plano: data.plano,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : (data.criadoEm ? new Date(data.criadoEm) : undefined),
          trialEndsAt: data.trialEndsAt || null,
          patientCount: patientCount,
        };
      });
      
      const usersList = await Promise.all(usersListPromises);
      setSystemUsers(usersList);

    } catch (error) {
      console.error("Erro ao buscar usuários do sistema:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.email === ADMIN_EMAIL) {
          setIsAuthorized(true);
          fetchSystemUsers();
        } else {
          setIsAuthorized(false);
          setIsLoading(false);
          router.push('/dashboard'); 
        }
      } else {
        setIsAuthorized(false);
        setIsLoading(false);
        router.push('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router]);


  const filteredUsers = useMemo(() => {
    if (!searchTerm) return systemUsers;
    return systemUsers.filter(user =>
      user.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nomeEmpresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.plano?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.cpf?.includes(searchTerm)
    );
  }, [systemUsers, searchTerm]);

  const getStatusCobrancaBadgeVariant = (status: SystemUser['statusCobranca']) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'ativo': return 'success';
      case 'pendente': return 'warning';
      case 'cancelado': return 'destructive';
      case 'trial': return 'default';
      case 'trial_ended': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPatientCountBadgeVariant = (count: number | undefined, plan: string | undefined) => {
    if (count === undefined || !plan) return 'secondary';
    if (plan === 'Gratuito' && count >= 10) return 'destructive';
    if (plan === 'Essencial' && count >= 50) return 'destructive';
    if (plan === 'Gratuito' && count >= 7) return 'warning';
    if (plan === 'Essencial' && count >= 40) return 'warning';
    return 'default';
  }

  const handleUpdateBillingStatus = async (userId: string, newStatus: string) => {
    try {
      const userDocRef = doc(db, 'usuarios', userId);
      await updateDoc(userDocRef, {
        statusCobranca: newStatus,
      });
      toast({ title: "Sucesso!", description: `Status de cobrança do usuário atualizado para ${billingStatusLabels[newStatus] || newStatus}.` });
      fetchSystemUsers(); 
    } catch (error) {
      console.error("Erro ao atualizar status de cobrança:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o status de cobrança.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Administração de Usuários</h1>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Legenda dos Status de Cobrança</CardTitle>
          <CardDescription>Referência rápida para os status de cobrança utilizados no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {billingStatusOptions.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <Badge variant={getStatusCobrancaBadgeVariant(status)} className="capitalize text-sm px-3 py-1">
                {billingStatusLabels[status as string] || status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status === 'ativo' && '- Assinatura regularizada.'}
                {status === 'pendente' && '- Pagamento aguardando confirmação ou ação necessária.'}
                {status === 'cancelado' && '- Assinatura interrompida ou conta bloqueada.'}
                {status === 'trial' && '- Usuário em período de teste gratuito.'}
                {status === 'trial_ended' && '- Período de teste finalizado, aguardando ação.'}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Todos os Usuários do Sistema</CardTitle>
          <CardDescription>Visualize e gerencie os usuários cadastrados na plataforma.</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome, e-mail, empresa, plano ou CPF..."
                className="pl-8 w-full md:w-1/2 lg:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="hidden lg:table-cell">CPF</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Pacientes</TableHead>
                    <TableHead>Pag. Pref.</TableHead>
                    <TableHead>Status Cobrança</TableHead>
                    <TableHead className="hidden sm:table-cell">Teste Até</TableHead>
                    <TableHead className="hidden sm:table-cell">Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nomeCompleto || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.nomeEmpresa || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{user.cpf || 'N/A'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{user.telefone || 'N/A'}</TableCell>
                      <TableCell>{user.plano || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getPatientCountBadgeVariant(user.patientCount, user.plano)} className="text-xs">
                          <Users className="mr-1 h-3 w-3" />
                          {user.patientCount !== undefined ? user.patientCount : '-'}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-xs text-muted-foreground">{user.paymentMethodPreference || 'N/A'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="capitalize w-full justify-between text-left font-normal px-2 py-1 h-auto text-xs sm:text-sm">
                              {user.statusCobranca ? (
                                <Badge variant={getStatusCobrancaBadgeVariant(user.statusCobranca)} className="capitalize">
                                  {billingStatusLabels[user.statusCobranca] || user.statusCobranca}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">N/A</Badge>
                              )}
                              <ChevronDown className="ml-1 h-3 w-3 opacity-50"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {billingStatusOptions.map((statusOption) => (
                              <DropdownMenuItem
                                key={statusOption}
                                onClick={() => handleUpdateBillingStatus(user.id, statusOption as string)}
                                disabled={user.statusCobranca === statusOption}
                                className="capitalize"
                              >
                                <Edit className="mr-2 h-3 w-3" />
                                {billingStatusLabels[statusOption as string] || statusOption}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        {user.trialEndsAt ? (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                            {format(user.trialEndsAt.toDate(), 'dd/MM/yy')}
                          </span>
                        ) : (user.plano !== 'Gratuito' ? 'Expirado' : 'N/A') }
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {user.criadoEm ? format(user.criadoEm, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {systemUsers.length > 0 ? 'Nenhum usuário encontrado com os critérios de busca.' : 'Nenhum usuário cadastrado no sistema ainda.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

