
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore'; // Added updateDoc, Timestamp, serverTimestamp
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";
import { User, Shield } from "lucide-react";
import { isPast } from 'date-fns'; // Added isPast

export default function LoginPage() {
  const router = useRouter();
  const { toast, dismiss } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const [isAccountSuspendedAlertOpen, setIsAccountSuspendedAlertOpen] = useState(false);
  const [isTrialEndedAlertOpen, setIsTrialEndedAlertOpen] = useState(false); // New state for trial ended alert


  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    let shouldProceedWithLogin = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        let currentStatus = userData.statusCobranca;

        // Check if trial period has ended
        if (currentStatus === 'trial' && userData.trialEndsAt && isPast((userData.trialEndsAt as Timestamp).toDate())) {
          await updateDoc(userDocRef, { 
            statusCobranca: 'trial_ended',
            updatedAt: serverTimestamp() 
          });
          currentStatus = 'trial_ended'; // Update status for subsequent checks
          console.log(`User ${user.uid} trial ended. Status updated to 'trial_ended'.`);
        }

        if (currentStatus === 'cancelado') {
          await signOut(auth); 
          setIsAccountSuspendedAlertOpen(true);
          shouldProceedWithLogin = false;
        } else if (currentStatus === 'trial_ended') {
          await signOut(auth);
          setIsTrialEndedAlertOpen(true);
          shouldProceedWithLogin = false;
        }
      } else {
        console.warn(`User document not found for UID: ${user.uid} during login. This should not happen.`);
        // Potentially sign out and show an error, or allow login if only displayName/email is needed initially.
        // For now, proceed with caution as status checks depend on this document.
      }

      if (shouldProceedWithLogin) {
        toast({
          title: 'Login realizado com sucesso!',
          description: `👋 Bem-vindo de volta, ${user.displayName || user.email}`,
          variant: 'success',
        });
        router.push('/dashboard');
      }

    } catch (error: any) {
      shouldProceedWithLogin = false; // Ensure no further login processing on error
      let toastMessage = 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.';
      let consoleMessage = `Erro ao fazer login - Código: "${error.code}", Mensagem: "${error.message}"`;

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          toastMessage = 'E-mail ou senha incorretos. Verifique e tente novamente.';
          console.warn(consoleMessage, error);
          break;
        case 'auth/invalid-email':
          toastMessage = 'O formato do e-mail informado é inválido.';
          console.warn(consoleMessage, error);
          break;
        case 'auth/user-disabled':
          toastMessage = 'Esta conta de usuário foi desabilitada.';
          console.warn(consoleMessage, error);
          break;
        case 'auth/too-many-requests':
          toastMessage = 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
          console.warn(consoleMessage, error);
          break;
        default:
          console.error(consoleMessage, error);
          break;
      }

      toast({
        title: 'Erro no Login',
        description: toastMessage,
        variant: 'destructive',
      });
    } finally {
       if (!isAccountSuspendedAlertOpen && !isTrialEndedAlertOpen) {
         setIsLoading(false);
       } else {
         // If an alert is shown, we might want to keep isLoading true until alert is dismissed,
         // or ensure it's false so other UI elements aren't stuck.
         // For simplicity, setting it false.
         setIsLoading(false);
       }
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      toast({
        title: "E-mail Necessário",
        description: "Por favor, insira seu endereço de e-mail.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "E-mail de Redefinição Enviado",
        description: "Se este e-mail estiver registrado, você receberá instruções para redefinir sua senha em breve.",
        variant: "success",
      });
      setIsResetPasswordDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de redefinição:", error);
      let message = "Ocorreu um erro ao tentar enviar o e-mail de redefinição.";
      if (error.code === 'auth/invalid-email') {
        message = "O formato do e-mail fornecido é inválido.";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <>
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Entrar no CliniPrática</CardTitle>
          <CardDescription>Acesse sua conta para gerenciar seus pacientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Dialog 
                  open={isResetPasswordDialogOpen} 
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      dismiss(); 
                    }
                    setIsResetPasswordDialogOpen(isOpen);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="link" type="button" className="px-0 text-xs h-auto py-0 text-muted-foreground hover:text-primary">
                      Esqueceu sua senha?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Redefinir Senha</DialogTitle>
                      <DialogDescription>
                        Insira seu e-mail para receber as instruções de redefinição de senha.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordResetRequest}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="reset-email" className="text-right col-span-1">
                            Email
                          </Label>
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="seu@email.com"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSendingResetEmail}>
                          {isSendingResetEmail ? 'Enviando...' : 'Enviar E-mail'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Shield className="mr-2 h-4 w-4" />
              {isLoading ? 'Entrando...' : 'Entrar (Profissional)'}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => router.push('/portal-paciente/login')}>
            <User className="mr-2 h-4 w-4" />
            Acessar como Paciente
          </Button>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/#planos" className="font-medium text-primary hover:underline">
              Crie uma agora
            </Link>
          </div>
          <div className="text-center text-sm">
            <Link href="/" className="font-medium text-primary hover:underline">
              &larr; Voltar para a página inicial
            </Link>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Versão 1.0.0
          </div>
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={isAccountSuspendedAlertOpen} onOpenChange={setIsAccountSuspendedAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conta Suspensa</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta foi suspensa devido à assinatura cancelada. Para reativar, por favor, escolha um novo plano ou entre em contato com o suporte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
                setIsAccountSuspendedAlertOpen(false);
                router.push('/#planos'); 
            }}>
              Ver Planos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isTrialEndedAlertOpen} onOpenChange={setIsTrialEndedAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Período de Teste Finalizado</AlertDialogTitle>
            <AlertDialogDescription>
              Seu período de teste gratuito de 30 dias terminou. Para continuar utilizando todas as funcionalidades do CliniPrática, por favor, escolha um dos nossos planos pagos ou entre em contato com o suporte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
                setIsTrialEndedAlertOpen(false);
                router.push('/configuracoes?tab=plano'); // Redirect to plans inside the app
            }}>
              Ver Planos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
