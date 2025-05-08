'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { contactFormSchema, type ContactFormValues } from '@/lib/schemas';
import { submitContactForm, type FormState } from '@/actions/contact';

const initialState: FormState = {
  message: '',
  status: 'idle',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Enviando...' : 'Enviar Contato'}
    </Button>
  );
}

export function ContactSection() {
  const [state, formAction] = useFormState(submitContactForm, initialState);
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      area: '',
    },
  });

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: 'Sucesso!',
        description: state.message,
      });
      form.reset();
    } else if (state.status === 'error') {
      toast({
        title: 'Erro!',
        description: state.message,
        variant: 'destructive',
      });
      state.issues?.forEach((issue, index) => {
        // This is a basic way to link issues to fields. For more complex forms, consider a more robust mapping.
        if (issue.toLowerCase().includes('nome') || issue.toLowerCase().includes('name')) form.setError('name', { message: issue});
        else if (issue.toLowerCase().includes('email')) form.setError('email', { message: issue});
        else if (issue.toLowerCase().includes('área') || issue.toLowerCase().includes('area')) form.setError('area', { message: issue});
      });
    }
  }, [state, toast, form]);


  return (
    <section id="contato" className="py-16 md:py-24 bg-gradient-to-br from-accent to-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-card-foreground">
                Quer testar gratuitamente quando lançarmos?
              </CardTitle>
              <CardDescription className="text-muted-foreground pt-2">
                Deixe seu contato e seja um dos primeiros a experimentar o CliniPrática.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-card-foreground">Nome Completo</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Seu nome"
                    {...form.register('name')}
                    aria-invalid={form.formState.errors.name ? "true" : "false"}
                    className={form.formState.errors.name ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-card-foreground">Email</Label>
                  <Input
                    id="email"
                    name="email"
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
                  <Label htmlFor="area" className="text-card-foreground">Área de Atuação</Label>
                  <Input
                    id="area"
                    name="area"
                    placeholder="Ex: Psicologia, Nutrição, Fisioterapia"
                    {...form.register('area')}
                    aria-invalid={form.formState.errors.area ? "true" : "false"}
                    className={form.formState.errors.area ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.area && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.area.message}</p>
                  )}
                </div>
                <SubmitButton />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
