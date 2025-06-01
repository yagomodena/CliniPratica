
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
  level: number; 
  stripePriceId: string | null; // Added Stripe Price ID, null for Gratuito
}

export const plans: Plan[] = [
  {
    name: 'Gratuito',
    price: 'R$0',
    priceDetail: ' para sempre',
    level: 0,
    stripePriceId: null, // Gratuito plan doesn't have a Stripe Price ID for subscription
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
    priceDetail: '/mês',
    level: 1,
    stripePriceId: 'price_1ROmWcRw8WdJEMXT4GFt0UKv', // Provided Price ID
    features: [
      { text: 'Até 50 pacientes', included: true },
      { text: 'Agenda completa com alertas', included: true },
      { text: 'Relatórios básicos (Agend. e Novos Pacientes)', included: true },
      { text: 'Controle de Lançamentos Financeiros Gerais', included: true },
      { text: 'Suporte por e-mail', included: true },
    ],
    popular: true,
    cta: 'Escolher Essencial',
  },
  {
    name: 'Profissional',
    price: 'R$69,90',
    priceDetail: '/mês',
    level: 2,
    stripePriceId: 'price_1ROmZkRw8WdJEMXTfLK6qKbt', // Provided Price ID
    features: [
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Todas as funcionalidades do Essencial', included: true },
      { text: 'Financeiro Completo (inclui contas a receber por paciente)', included: true },
      { text: 'Mensagens por WhatsApp (ilimitado)', included: true },
      { text: 'Relatórios avançados (todos)', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    cta: 'Escolher Profissional',
  },
  {
    name: 'Clínica',
    price: 'R$99,90',
    priceDetail: '/mês',
    level: 3,
    stripePriceId: 'price_1ROmaJRw8WdJEMXTDMPmD0pz', // Provided Price ID
    features: [
      { text: 'Múltiplos profissionais', included: true },
      { text: 'Todas as funcionalidades do Profissional', included: true },
      { text: 'Relatórios por profissional/unidade', included: true },
      { text: 'Gerente de contas dedicado', included: true },
    ],
    cta: 'Escolher Clínica',
  },
];
