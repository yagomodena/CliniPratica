
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { KeyRound } from 'lucide-react';

export default function PatientLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [patientId, setPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePatientLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patientId.trim()) {
      toast({
        title: "ID do Paciente Necessário",
        description: "Por favor, insira seu ID de paciente.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const patientDocRef = doc(db, 'pacientes', patientId.trim());
      const patientDocSnap = await getDoc(patientDocRef);

      if (patientDocSnap.exists()) {
        // Store patient ID in localStorage for the session
        localStorage.setItem('patientPortalId', patientId.trim());
        localStorage.setItem('patientName', patientDocSnap.data()?.name || 'Paciente');
        
        toast({
          title: "Login Realizado!",
          description: `Bem-vindo(a) de volta, ${patientDocSnap.data()?.name || 'Paciente'}!`,
          variant: "success",
        });
        router.push('/portal-paciente/dashboard');
      } else {
        toast({
          title: "ID Inválido",
          description: "O ID do paciente informado não foi encontrado. Verifique e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao tentar login do paciente:", error);
      toast({
        title: "Erro no Login",
        description: "Ocorreu um erro ao tentar fazer login. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 w-fit">
            <Logo textClassName="text-primary text-3xl" dotClassName="text-foreground text-3xl" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Portal do Paciente</CardTitle>
          <CardDescription>Acesse seus agendamentos e informações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handlePatientLogin}>
            <div>
              <Label htmlFor="patientId">Seu ID de Paciente</Label>
              <Input
                id="patientId"
                type="text"
                placeholder="Insira seu ID aqui"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <KeyRound className="mr-2 h-4 w-4" />
              {isLoading ? 'Entrando...' : 'Acessar Portal'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              &larr; Voltar para login de profissional
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
