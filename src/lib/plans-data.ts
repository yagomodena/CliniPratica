
export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  name: string;
  price: string; // Represents the effective *annual* monthly price
  monthlyPrice: string; // The actual monthly price when billed monthly
  priceDetail?: string; // Detail shown for annual pricing (e.g., /mês, faturado anualmente)
  monthlyPriceDetail?: string; // Detail shown for monthly pricing (e.g., /mês)
  annualBillingValue?: number; // Calculated annual total for display/discount
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
  level: number; // Added level for comparison
}

export const plans: Plan[] = [
  {
    name: 'Gratuito',
    price: 'R$0',
    monthlyPrice: 'R$0',
    priceDetail: 'para sempre',
    monthlyPriceDetail: 'para sempre',
    level: 0, // Base level
    features: [
      { text: 'Até 10 pacientes', included: true },
      { text: 'Agenda básica', included: true },
      { text: 'Suporte comunitário', included: true },
      { text: 'Upload de exames (limitado)', included: false },
    ],
    cta: 'Começar Gratuitamente', // Updated CTA for modal context
  },
  {
    name: 'Essencial',
    price: 'R$29,90', // Annual effective monthly
    monthlyPrice: 'R$39,90', // Monthly actual
    priceDetail: '/mês (faturado R$358,80 anualmente)',
    monthlyPriceDetail: '/mês',
    annualBillingValue: 358.80,
    level: 1,
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
    price: 'R$49,90', // Annual effective monthly
    monthlyPrice: 'R$59,90', // Monthly actual
    priceDetail: '/mês (faturado R$598,80 anualmente)',
    monthlyPriceDetail: '/mês',
    annualBillingValue: 598.80,
    level: 2,
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
    price: 'R$79,90', // Annual effective monthly
    monthlyPrice: 'R$89,90', // Monthly actual
    priceDetail: '/mês (faturado R$958,80 anualmente)',
    monthlyPriceDetail: '/mês',
    annualBillingValue: 958.80,
    level: 3,
    features: [
      { text: 'Múltiplos profissionais', included: true },
      { text: 'Todas as funcionalidades Profissional', included: true },
      { text: 'Relatórios avançados', included: true },
      { text: 'Gerente de contas dedicado', included: true },
    ],
    cta: 'Escolher Clínica',
  },
];
