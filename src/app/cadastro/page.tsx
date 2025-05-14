'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { registrationFormSchema, type RegistrationFormValues } from '@/lib/schemas';
import { submitRegistrationForm, type FormState as RegistrationFormState } from '@/actions/register';
import { Logo } from '@/components/icons/logo';

const initialState: RegistrationFormState = {
  message: '',
  status: 'idle',
  fields: {},
  issues: []
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando conta...' : 'Criar Conta'}
    </Button>
  );
}

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromQuery = searchParams.get('plano') || '';
  const { toast } = useToast();

  const [state, formAction] = useFormState(submitRegistrationForm, initialState);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      area: '',
      plan: planFromQuery,
    },
  });

   useEffect(() => {
    // This ensures the form's plan value is updated if the query param is available on initial load
    // or if it somehow changes (though less likely for a static query param on page load).
    if (planFromQuery && form.getValues('plan') !== planFromQuery) {
      form.reset({ ...form.getValues(), plan: planFromQuery });
    }
  }, [planFromQuery, form]);


  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: 'Sucesso!',
        description: state.message,
        variant: 'success',
      });
      form.reset({ fullName: '', email: '', phone: '', password: '', area: '', plan: planFromQuery }); // Reset form but keep plan
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } else if (state.status === 'error') {
      toast({
        title: 'Erro no Cadastro',
        description: state.message || 'Por favor, verifique os campos.',
        variant: 'destructive',
      });
      // Populate field errors from Zod issues if available
      if (state.issues) {
         parsed.error.issues.forEach(issue => { // Assuming parsed is available if schema failed.
          const fieldName = issue.path[0] as keyof RegistrationFormValues;
          if (fieldName) {
            form.setError(fieldName, { type: 'server', message: issue.message });
          }
        });
      } else if (state.fields) { // Fallback for more general errors
         // Attempt to repopulate form, though RHF should handle this with register
      }
    }
  }, [state, toast, form, router, planFromQuery]);

  // Temporary workaround if `parsed` is not in scope for error handling:
   useEffect(() => {
    if (state.status === 'error' && state.issues) {
        const fieldErrors = registrationFormSchema.safeParse(state.fields || {}).error?.flatten().fieldErrors;
        if (fieldErrors) {
            (Object.keys(fieldErrors) as Array<keyof RegistrationFormValues>).forEach((key) => {
                 const messages = fieldErrors[key];
                 if (messages && messages.length > 0) {
                    form.setError(key, { type: 'server', message: messages[0] });
                 }
            });
        }
    }
   }, [state, form]);


  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-6 w-fit">
            <Logo textClassName="text-primary text-3xl" dotClassName="text-foreground text-3xl" />
        </div>
        <CardTitle className="text-3xl font-bold text-primary">Crie sua Conta no CliniPrática</CardTitle>
        <CardDescription>
          {planFromQuery ? `Você está se cadastrando para o plano ${planFromQuery}. ` : ''}
          Preencha seus dados para começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Hidden input to pass the plan to the server action */}
          <input type="hidden" {...form.register('plan')} value={planFromQuery} />

          <div>
            <Label htmlFor="fullName">Nome Completo*</Label>
            <Input id="fullName" placeholder="Seu nome completo" {...form.register('fullName')} />
            {form.formState.errors.fullName && <p className="text-sm text-destructive mt-1">{form.formState.errors.fullName.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email*</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Telefone*</Label>
            <Input id="phone" type="tel" placeholder="(XX) XXXXX-XXXX" {...form.register('phone')} />
            {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Senha*</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...form.register('password')} />
            {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="area">Área de Atuação (Opcional)</Label>
            <Input id="area" placeholder="Ex: Psicologia, Nutrição, Fisioterapia" {...form.register('area')} />
             {form.formState.errors.area && <p className="text-sm text-destructive mt-1">{form.formState.errors.area.message}</p>}
          </div>
          <SubmitButton />
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Faça login
          </Link>
        </div>
        <div className="mt-2 text-center text-sm">
          <Link href="/" className="font-medium text-primary hover:underline">
            &larr; Voltar para a página inicial
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CadastroPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Suspense fallback={<div className="text-lg text-muted-foreground">Carregando formulário...</div>}>
        <CadastroForm />
      </Suspense>
    </div>
  );
}
