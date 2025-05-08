
export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  name: string;
  price: string;
  priceDetail?: string;
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

export const plans: Plan[] = [
  {
    name: 'Gratuito',
    price: 'R$0',
    priceDetail: 'para sempre',
    features: [
      { text: 'Até 10 pacientes', included: true },
      { text: 'Agenda básica', included: true },
      { text: 'Suporte comunitário', included: true },
      { text: 'Upload de exames (limitado)', included: false },
    ],
    cta: 'Plano Atual', // Updated CTA for modal context
  },
  {
    name: 'Essencial',
    price: 'R$29,90',
    priceDetail: '/mês',
    features: [
      { text: 'Até 50 pacientes', included: true },
      { text: 'Agenda completa com alertas', included: true },
      { text: 'Upload de exames (1GB)', included: true },
      { text: 'Suporte por e-mail', included: true },
    ],
    popular: true,
    cta: 'Escolher Essencial',
  },
  {
    name: 'Profissional',
    price: 'R$49,90',
    priceDetail: '/mês',
    features: [
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Todas as funcionalidades Essencial', included: true },
      { text: 'Envio automático de mensagens', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    cta: 'Escolher Profissional',
  },
  {
    name: 'Clínica',
    price: 'R$79,90',
    priceDetail: '/mês',
    features: [
      { text: 'Múltiplos profissionais', included: true },
      { text: 'Todas as funcionalidades Profissional', included: true },
      { text: 'Relatórios avançados', included: true },
      { text: 'Gerente de contas dedicado', included: true },
    ],
    cta: 'Escolher Clínica',
  },
];
