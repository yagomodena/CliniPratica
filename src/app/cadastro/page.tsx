
'use client';

import { useEffect, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react'; // Import Eye and EyeOff icons

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      area: '',
      plan: planFromQuery,
    },
  });

   useEffect(() => {
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
      form.reset({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', area: '', plan: planFromQuery });
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } else if (state.status === 'error') {
      toast({
        title: 'Erro no Cadastro',
        description: state.message || 'Por favor, verifique os campos.',
        variant: 'destructive',
      });
      
      const fieldErrors = registrationFormSchema.safeParse(state.fields || {}).error?.flatten().fieldErrors;
      if (fieldErrors) {
        (Object.keys(fieldErrors) as Array<keyof RegistrationFormValues>).forEach((key) => {
            const messages = fieldErrors[key];
            if (messages && messages.length > 0) {
              form.setError(key, { type: 'server', message: messages[0] });
            }
        });
      }
       // Specific handling for password confirmation mismatch not directly tied to Zod path from server state issues
      if (state.issues?.some(issue => issue.toLowerCase().includes('senhas não coincidem'))) {
        form.setError('confirmPassword', {type: 'server', message: 'As senhas não coincidem.'})
      }
    }
  }, [state, toast, form, router, planFromQuery]);


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
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Mínimo 6 caracteres" 
                {...form.register('password')}
                className="pr-10" 
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar Senha*</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Repita a senha" 
                {...form.register('confirmPassword')} 
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.confirmPassword && <p className="text-sm text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>}
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
