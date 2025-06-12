
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // Corrected import
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Mail, Phone, ArrowLeft, Send } from "lucide-react";
import { auth } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { contactFormSchema, type ContactFormValues } from '@/lib/schemas';

export default function ContatoSuportePage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFormSubmit = (data: ContactFormValues) => {
    setIsSubmitting(true);
    const { name, email, subject, message } = data;
    const yourPhoneNumber = "5516988577820"; // Brazil country code + your number without non-digits

    let whatsappMessage = `Nova mensagem de Contato:\n\n`;
    whatsappMessage += `*Nome:* ${name}\n`;
    if (email) whatsappMessage += `*Email:* ${email}\n`;
    if (subject) whatsappMessage += `*Assunto:* ${subject}\n`;
    whatsappMessage += `*Mensagem:*\n${message}`;

    const whatsappLink = `https://wa.me/${yourPhoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    try {
      window.open(whatsappLink, '_blank');
      toast({
        title: "Mensagem Pronta!",
        description: "Sua mensagem está pronta para ser enviada no WhatsApp.",
        variant: "success",
      });
      form.reset();
    } catch (error) {
      console.error("Erro ao abrir link do WhatsApp:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o WhatsApp. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <CardDescription>Preencha o formulário abaixo e sua mensagem será direcionada ao nosso WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="name">Nome*</Label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  {...form.register('name')}
                  aria-invalid={form.formState.errors.name ? "true" : "false"}
                  className={form.formState.errors.name ? 'border-destructive' : ''}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email*</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...form.register('email')}
                  aria-invalid={form.formState.errors.email ? "true" : "false"}
                  className={form.formState.errors.email ? 'border-destructive' : ''}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Sobre o que você gostaria de falar?"
                  {...form.register('subject')}
                  aria-invalid={form.formState.errors.subject ? "true" : "false"}
                  className={form.formState.errors.subject ? 'border-destructive' : ''}
                />
                {form.formState.errors.subject && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.subject.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="message">Mensagem*</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem aqui..."
                  rows={5}
                  {...form.register('message')}
                  aria-invalid={form.formState.errors.message ? "true" : "false"}
                  className={form.formState.errors.message ? 'border-destructive' : ''}
                />
                {form.formState.errors.message && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.message.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                   <Send className="mr-2 h-4 w-4" /> Enviar Mensagem
                  </>
                )}
              </Button>
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
