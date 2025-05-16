
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
        description: `👋 Bem-vindo de volta, ${user.displayName}`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);

      let message = 'Erro ao fazer login.';
      console.error('Erro ao fazer login:', error);
      console.log('Código do erro:', error.code);

      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Usuário não encontrado. Verifique o e-mail.';
          break;
        case 'auth/wrong-password':
          message = 'Senha incorreta. Tente novamente.';
          break;
        case 'auth/invalid-email':
          message = 'Formato de e-mail inválido.';
          break;
        case 'auth/invalid-credential':
          message = 'E-mail ou senha incorretos. Verifique e tente novamente.';
          break;
        default:
          message = 'Erro inesperado. Tente novamente.';
          break;
      }

      toast({
        title: 'Erro no login',
        description: message,
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

