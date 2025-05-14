
'use client'; // Add 'use client' for interactivity (router)

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Import useRouter
import type { FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter(); // Initialize router

  // Simulate login and redirect
  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // In a real app, you'd validate credentials here
    console.log("Simulating login...");
    // Redirect to the dashboard
    router.push('/dashboard');
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
              <Input id="email" type="email" placeholder="seu@email.com" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="Sua senha" required />
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

