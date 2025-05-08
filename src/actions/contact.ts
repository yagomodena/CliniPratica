'use server';

import { contactFormSchema, type ContactFormValues } from '@/lib/schemas';

export type FormState = {
  message: string;
  status: 'success' | 'error' | 'idle';
  fields?: Record<string, string>;
  issues?: string[];
};

export async function submitContactForm(
  prevState: FormState,
  data: FormData
): Promise<FormState> {
  const formData = Object.fromEntries(data);
  const parsed = contactFormSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      message: 'Falha ao enviar. Por favor, verifique os campos.',
      status: 'error',
      fields: formData as Record<string, string>,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const { name, email, area } = parsed.data as ContactFormValues;

  // Simulate API call or database save
  console.log('Formulário de contato recebido:');
  console.log('Nome:', name);
  console.log('Email:', email);
  console.log('Área de Atuação:', area);

  // Simulate success
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    message: 'Obrigado pelo seu contato! Entraremos em contato em breve.',
    status: 'success',
  };
}
