
'use server';

import { contactFormSchema, type ContactFormValues } from '@/lib/schemas';
import { db } from '@/firebase'; // Import Firestore instance
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions

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

  const { name, email, subject, message } = parsed.data;

  try {
    // Save contact message to Firestore
    const contactMessagesRef = collection(db, 'contactMessages');
    await addDoc(contactMessagesRef, {
      name,
      email,
      subject: subject || '', // Handle optional subject
      message,
      createdAt: serverTimestamp(),
    });

    console.log('Mensagem de contato salva no Firestore:');
    console.log('Nome:', name);
    console.log('Email:', email);
    console.log('Assunto:', subject);
    console.log('Mensagem:', message);

    return {
      message: 'Obrigado pelo seu contato! Sua mensagem foi recebida e entraremos em contato em breve.',
      status: 'success',
    };
  } catch (error) {
    console.error("Erro ao salvar mensagem de contato no Firestore:", error);
    return {
      message: 'Ocorreu um erro ao tentar enviar sua mensagem. Tente novamente mais tarde.',
      status: 'error',
      fields: formData as Record<string, string>,
    };
  }
}
