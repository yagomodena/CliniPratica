'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  priceDetail?: string;
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

const plans: Plan[] = [
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
    cta: 'Começar Gratuitamente',
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

export function PlansSection() {
  const handleCTAClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    const contactSection = document.getElementById('contato');
    if (contactSection) {
      const headerOffset = 80; 
      const elementPosition = contactSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section id="planos" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Planos flexíveis para cada necessidade
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          Escolha o plano ideal para você e comece a transformar a gestão do seu consultório hoje mesmo.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 ${
                plan.popular ? 'border-primary border-2 relative' : 'bg-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full shadow-md">
                  Mais Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  {plan.priceDetail && <span className="text-sm">{plan.priceDetail}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={`flex items-center ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}>
                      <Check className={`mr-2 h-5 w-5 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCTAClick} 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  aria-label={`Assinar o plano ${plan.name}`}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
