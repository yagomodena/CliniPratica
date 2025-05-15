
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { plans as allPlansData } from '@/lib/plans-data'; 
import { useRouter } from 'next/navigation';

export function PlansSection() {
  const router = useRouter();

  const handlePlanCTAClick = (planName: string) => {
    router.push(`/cadastro?plano=${encodeURIComponent(planName)}`);
  };

  return (
    <section id="planos" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Planos flexíveis para cada necessidade
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          Escolha o plano ideal para você e comece a transformar a gestão do seu consultório hoje mesmo. <strong>Todos os planos pagos incluem 1 mês grátis!</strong>
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {allPlansData.map((plan) => (
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
                <CardDescription className="text-center text-muted-foreground min-h-[60px] flex flex-col justify-center">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  {plan.priceDetail && <span className="text-xs mt-1">{plan.priceDetail}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={`flex items-start ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}>
                      <Check className={`mr-2 mt-0.5 h-5 w-5 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handlePlanCTAClick(plan.name)}
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  aria-label={`Começar com o plano ${plan.name}`}
                >
                  {plan.name === 'Gratuito' ? 'Começar Gratuitamente' : `Escolher ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
         <p className="text-center text-sm text-muted-foreground mt-10">
          <strong>Lembrete:</strong> Os planos pagos contam com 1 mês de teste gratuito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
