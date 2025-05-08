import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome deve ter no máximo 50 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  area: z.string().min(3, { message: "A área de atuação deve ter pelo menos 3 caracteres." }).max(100, { message: "A área de atuação deve ter no máximo 100 caracteres." }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
