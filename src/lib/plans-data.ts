
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
  mercadoPagoPreapprovalPlanId: string | null; // Switched from stripePriceId
}

export const plans: Plan[] = [
  {
    name: 'Gratuito',
    price: 'R$0',
    priceDetail: ' para sempre',
    level: 0,
    mercadoPagoPreapprovalPlanId: null,
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
    mercadoPagoPreapprovalPlanId: '2c93808497312f410197317897b2001c', // Your Essencial Plan ID
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
    mercadoPagoPreapprovalPlanId: '2c93808497312f41019731790c2d001d', // Your Profissional Plan ID
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
    mercadoPagoPreapprovalPlanId: '2c938084970fb5df01973179624c0cee', // Your Clínica Plan ID
    features: [
      { text: 'Múltiplos profissionais', included: true },
      { text: 'Todas as funcionalidades do Profissional', included: true },
      { text: 'Relatórios por profissional/unidade', included: true },
      { text: 'Gerente de contas dedicado', included: true },
    ],
    cta: 'Escolher Clínica',
  },
];
