
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
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

export default function LoginPage() {
  const router = useRouter();
  const { toast, dismiss } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      toast({
        title: 'Login realizado com sucesso!',
        description: `👋 Bem-vindo de volta, ${user.displayName || user.email}`,
        variant: 'success',
      });

      router.push('/dashboard');
    } catch (error: any) {
      let toastMessage = 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.';
      let consoleMessage = `Erro ao fazer login - Código: "${error.code}", Mensagem: "${error.message}"`;

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          toastMessage = 'E-mail ou senha incorretos. Verifique e tente novamente.';
          console.warn(consoleMessage, error); // Warn for common credential issues
          break;
        case 'auth/invalid-email':
          toastMessage = 'O formato do e-mail informado é inválido.';
          console.warn(consoleMessage, error); // Warn for invalid email format
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
          console.error(consoleMessage, error); // Error for unexpected issues
          break;
      }

      toast({
        title: 'Erro no Login',
        description: toastMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
                      dismiss(); // Dismiss any active toasts when opening the dialog
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
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
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
  );
}
