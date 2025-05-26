
'use client'; // Add 'use client' for interactivity (router)

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Import useRouter
import type { FormEvent } from 'react';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuário logado:', userCredential.user);
      const user = userCredential.user;

      toast({
        title: 'Login realizado com sucesso!',
        description: `👋 Bem-vindo de volta, ${user.displayName || user.email}`,
        variant: 'success',
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro ao fazer login - Código:', error.code, 'Mensagem:', error.message);

      let toastMessage = 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.';

      switch (error.code) {
        case 'auth/user-not-found': // Often superseded by invalid-credential
        case 'auth/wrong-password': // Often superseded by invalid-credential
        case 'auth/invalid-credential':
          toastMessage = 'E-mail ou senha incorretos. Verifique e tente novamente.';
          break;
        case 'auth/invalid-email':
          toastMessage = 'O formato do e-mail informado é inválido.';
          break;
        case 'auth/user-disabled':
          toastMessage = 'Esta conta de usuário foi desabilitada.';
          break;
        case 'auth/too-many-requests':
          toastMessage = 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
          break;
        default:
          console.warn('Erro de login não mapeado diretamente:', error.code, error.message);
          // For other unmapped errors, the default toastMessage is already set.
          break;
      }

      toast({
        title: 'Erro no Login',
        description: toastMessage,
        variant: 'destructive',
      });
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
          {/* Use onSubmit for the form */}
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
              <Label htmlFor="password">Senha</Label>
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
            <Button type="submit" className="w-full">
              Entrar
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
        </CardContent>
      </Card>
    </div>
  );
}
