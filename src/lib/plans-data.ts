
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
  level: number; // Added level for comparison
}

export const plans: Plan[] = [
  {
    name: 'Gratuito',
    price: 'R$0',
    priceDetail: ' para sempre',
    level: 0, // Base level
    features: [
      { text: 'Até 10 pacientes', included: true },
      { text: 'Agenda básica', included: true },
      { text: 'Suporte comunitário', included: true },
      { text: 'Relatórios e financeiro (não disponível)', included: false },
      { text: 'Upload de exames (não disponível)', included: false },
    ],
    cta: 'Começar Gratuitamente', 
  },
  {
    name: 'Essencial',
    price: 'R$39,90',
    priceDetail: '/mês (R$29,90/mês no plano anual)',
    level: 1,
    features: [
      { text: 'Até 50 pacientes', included: true },
      { text: 'Agenda completa com alertas', included: true },
      { text: 'Relatórios básicos', included: true },
      { text: 'Financeiro completo', included: true },
      { text: 'Suporte por e-mail', included: true },
    ],
    popular: true,
    cta: 'Escolher Essencial',
  },
  {
    name: 'Profissional',
    price: 'R$69,90',
    priceDetail: '/mês (R$49,90/mês no plano anual)',
    level: 2,
    features: [
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Todas as funcionalidades do Essencial', included: true },
      { text: 'Mensagens por WhatsApp (ilimitado)', included: true },
      { text: 'Relatórios avançados', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    cta: 'Escolher Profissional',
  },
  {
    name: 'Clínica',
    price: 'R$99,90',
    priceDetail: '/mês (R$79,90/mês no plano anual)',
    level: 3,
    features: [
      { text: 'Múltiplos profissionais', included: true },
      { text: 'Todas as funcionalidades do Profissional', included: true },
      { text: 'Relatórios por profissional/unidade', included: true },
      { text: 'Gerente de contas dedicado', included: true },
    ],
    cta: 'Escolher Clínica',
  },
];

