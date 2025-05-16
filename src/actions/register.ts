
'use server';

import { registrationFormSchema, type RegistrationFormValues } from '@/lib/schemas';

// Reusing FormState type, ensure it's compatible or define a specific one if needed.
// For now, we assume it's compatible for message and status.
export type FormState = {
  message: string;
  status: 'success' | 'error' | 'idle';
  fields?: Record<string, string>; // To send back values for repopulation
  issues?: string[]; // For specific error messages
};

const initialState: FormState = {
  message: '',
  status: 'idle',
};

export async function submitRegistrationForm(
  prevState: FormState,
  data: FormData
): Promise<FormState> {
  const formData = Object.fromEntries(data);
  const parsed = registrationFormSchema.safeParse(formData);

  if (!parsed.success) {
    // Extract field-specific errors if possible, or general issues
    const fieldErrors: Record<string, string> = {};
    const generalIssues: string[] = [];
    parsed.error.issues.forEach(issue => {
      if (issue.path.length > 0) {
        // Assuming the first path item is the field name
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      generalIssues.push(`${issue.path.join('.') || 'Formulário'}: ${issue.message}`);
    });

    return {
      message: 'Falha ao registrar. Por favor, verifique os campos.',
      status: 'error',
      fields: formData as Record<string, string>, // Send back entered data
      issues: parsed.error.issues.map(issue => issue.message), // Send back all Zod issues
    };
  }

  const { fullName, email, phone, companyName, password, area, plan } = parsed.data;

  // Simulate API call or database save
  console.log('Formulário de cadastro recebido:');
  console.log('Plano Selecionado:', plan);
  console.log('Nome:', fullName);
  console.log('Email:', email);
  console.log('Telefone:', phone);
  console.log('Nome da Empresa:', companyName);
  console.log('Senha:', '[Protected]'); // Don't log password
  console.log('Área de Atuação:', area);

  // Here you would typically:
  // 1. Hash the password
  // 2. Save user data to your database (e.g., Firestore)
  // 3. Potentially create an authentication entry (e.g., Firebase Auth)
  // 4. Handle any errors from these operations

  // Simulate success for now
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    message: 'Cadastro realizado com sucesso! Você será redirecionado para o login em breve.',
    status: 'success',
  };
}
