
'use server';

import { registrationFormSchema, type RegistrationFormValues } from '@/lib/schemas';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

  try {
    // 1. Cria usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Atualiza o perfil do usuário com o nome completo
    await updateProfile(user, {
      displayName: fullName,
    });

    // 3. Define dados padrão e permissões
    const userDoc = {
      nomeCompleto: fullName,
      email,
      telefone: phone,
      nomeEmpresa: companyName || '',
      areaAtuacao: area || '',
      plano: plan || 'Gratuito', // Default to Gratuito if plan is not passed
      fotoPerfilUrl: '', // Pode ser atualizado depois
      cargo: 'Administrador',
      permissoes: {
        dashboard: true,
        pacientes: true,
        agendas: true,
        // mensagens: true, // Mensagens removido
        financeiro: true,
        relatorios: true,
        configuracoes: true,
        usuarios: true,
      },
      criadoEm: serverTimestamp(),
    };

    // 4. Salva dados no Firestore (coleção "usuarios")
    await setDoc(doc(db, 'usuarios', user.uid), userDoc);

    return {
      message: 'Cadastro realizado com sucesso!',
      status: 'success',
    };
  } catch (error: any) {
    console.error('Erro ao registrar:', error);

    let message = 'Erro ao registrar. Tente novamente mais tarde.';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este e-mail já está em uso. Tente fazer login ou use outro e-mail.';
        break;
      case 'auth/invalid-email':
        message = 'O e-mail informado é inválido.';
        break;
      case 'auth/weak-password':
        message = 'A senha deve conter no mínimo 6 caracteres.';
        break;
      default:
        message = 'Erro ao registrar: ' + error.message;
        break;
    }

    return {
      message,
      status: 'error',
    };
  }
}
