
'use client'; // Adicionado para usar hooks e estado de autenticação

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { auth } from '@/firebase'; // Importar auth do Firebase
import type { User as FirebaseUser } from 'firebase/auth'; // Importar tipo User do Firebase Auth
import { onAuthStateChanged } from 'firebase/auth';

export default function ContatoSuportePage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe(); // Limpar o listener ao desmontar
  }, []);

  const backButtonHref = currentUser ? "/dashboard" : "/";
  const backButtonText = currentUser ? "Voltar ao Dashboard" : "Voltar para a Página Inicial";

  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary">Entre em Contato</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Estamos aqui para ajudar! Envie sua dúvida, sugestão ou problema.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Envie uma Mensagem</CardTitle>
            <CardDescription>Preencha o formulário abaixo e retornaremos o mais breve possível.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Seu nome completo" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" />
              </div>
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" placeholder="Sobre o que você gostaria de falar?" />
              </div>
              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea id="message" placeholder="Digite sua mensagem aqui..." rows={5} />
              </div>
              <Button type="submit" className="w-full">Enviar Mensagem</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <a href="mailto:clinipratica@gmail.com" className="text-muted-foreground hover:text-primary">clinipratica@gmail.com</a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Telefone</h3>
                  <p className="text-muted-foreground">(16) 98857-7820 (Seg-Sex, 9h-18h)</p>
                </div>
              </div>
              {/* <div className="flex items-start space-x-3">
                <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Endereço</h3>
                  <p className="text-muted-foreground">Rua Fictícia, 123, Sala 45<br />Cidade Exemplo, Estado</p>
                </div>
              </div> */}
            </CardContent>
          </Card>
           <div className="text-center md:text-left">
            {!isLoadingAuth && (
              <Button asChild variant="outline">
                <Link href={backButtonHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backButtonText}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
