
import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome deve ter no máximo 50 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  area: z.string().min(3, { message: "A área de atuação deve ter pelo menos 3 caracteres." }).max(100, { message: "A área de atuação deve ter no máximo 100 caracteres." }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const registrationFormSchema = z.object({
  fullName: z.string().min(3, { message: "O nome completo deve ter pelo menos 3 caracteres." }).max(100, { message: "O nome completo deve ter no máximo 100 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  phone: z.string().min(10, { message: "O telefone deve ter pelo menos 10 dígitos (com DDD)." }).max(15, { message: "O telefone deve ter no máximo 15 dígitos." }),
  companyName: z.string().max(100, { message: "O nome da empresa deve ter no máximo 100 caracteres."}).optional().or(z.literal('')),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "A confirmação da senha deve ter pelo menos 6 caracteres." }),
  area: z.string().min(3, { message: "A área de atuação deve ter pelo menos 3 caracteres." }).max(100, { message: "A área de atuação deve ter no máximo 100 caracteres."}),
  plan: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.plan === 'Clínica' && (!data.companyName || data.companyName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O nome da empresa é obrigatório para o plano Clínica e deve ter pelo menos 2 caracteres.",
      path: ['companyName'],
    });
  }
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

