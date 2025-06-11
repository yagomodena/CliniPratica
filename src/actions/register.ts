
'use server';

import { registrationFormSchema, type RegistrationFormValues } from '@/lib/schemas';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { addDays } from 'date-fns'; // Added addDays

export type FormState = {
  message: string;
  status: 'success' | 'error' | 'idle';
  fields?: Record<string, string>;
  issues?: string[];
  userId?: string;
  userEmail?: string;
  isTrial?: boolean; // Flag to indicate if it's a trial
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
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach(issue => {
      if (issue.path.length > 0) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
    });

    return {
      message: 'Falha ao registrar. Por favor, verifique os campos.',
      status: 'error',
      fields: formData as Record<string, string>,
      issues: parsed.error.issues.map(issue => issue.message),
    };
  }

  const { fullName, email, phone, cpf, companyName, password, area, plan, paymentMethodPreference } = parsed.data;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: fullName,
    });

    const now = new Date();
    const trialEndsDate = addDays(now, 30);

    const userDoc = {
      nomeCompleto: fullName,
      email,
      telefone: phone,
      cpf, // Save CPF
      nomeEmpresa: companyName || '',
      areaAtuacao: area || '',
      plano: plan || 'Gratuito',
      paymentMethodPreference, // Save payment method preference
      statusCobranca: plan === 'Gratuito' ? 'ativo' : 'trial', // Set to 'trial' for paid plans
      trialEndsAt: plan === 'Gratuito' ? null : Timestamp.fromDate(trialEndsDate), // Set trial end date
      fotoPerfilUrl: '',
      cargo: 'Administrador',
      permissoes: {
        dashboard: true,
        pacientes: true,
        agendas: true,
        financeiro: true,
        relatorios: true,
        configuracoes: true,
        usuarios: true,
      },
      criadoEm: serverTimestamp(),
      mercadoPagoSubscriptionId: null,
      mercadoPagoSubscriptionStatus: null,
      mercadoPagoPreapprovalPlanId: null,
      mercadoPagoNextPaymentDate: null,
    };

    await setDoc(doc(db, 'usuarios', user.uid), userDoc);

    return {
      message: plan === 'Gratuito'
        ? 'Cadastro realizado com sucesso! Você será redirecionado para o login.'
        : 'Cadastro realizado com sucesso! Você está em um período de teste gratuito de 30 dias. Após o aviso, você será redirecionado para o login.',
      status: 'success',
      userId: user.uid,
      userEmail: email,
      isTrial: plan !== 'Gratuito',
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
