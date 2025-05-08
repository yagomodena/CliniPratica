'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button'; // Remove direct Button import if only used in CTA
import { Check, Info } from 'lucide-react';
import { plans } from '@/lib/plans-data';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PlanCTAButton } from './plan-cta-button'; // Import the new component

type BillingCycle = 'monthly' | 'annual';

export function PlansSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');

  // handleCTAClick is moved to PlanCTAButton

  const landingPagePlans = plans.map(plan => ({
    ...plan,
    // Keep the cta text definition here
    cta: plan.name === 'Gratuito' ? 'Começar Gratuitamente' : `Assinar ${plan.name}`
  }));

  return (
    <section id="planos" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Planos flexíveis para cada necessidade
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Escolha o plano ideal para você e comece a transformar a gestão do seu consultório hoje mesmo.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-12 md:mb-16">
           <Label htmlFor="billing-cycle-switch" className={`font-medium ${billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
            Mensal
           </Label>
           <Switch
              id="billing-cycle-switch"
              checked={billingCycle === 'annual'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
              aria-label="Alternar entre cobrança mensal e anual"
           />
           <Label htmlFor="billing-cycle-switch" className={`font-medium ${billingCycle === 'annual' ? 'text-primary' : 'text-muted-foreground'}`}>
            Anual
           </Label>
           {billingCycle === 'annual' && (
              <Badge variant="outline" className="ml-2 border-green-500 text-green-700 bg-green-50">
                  Economize ~17% {/* Adjusted text */}
              </Badge>
           )}
         </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {landingPagePlans.map((plan) => {
            const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.price;
            const displayPriceDetail = billingCycle === 'monthly' ? plan.monthlyPriceDetail : plan.priceDetail;

            return (
              <Card
                key={plan.name}
                className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 ${
                  plan.popular ? 'border-primary border-2 relative' : 'bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full shadow-md whitespace-nowrap">
                    Mais Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-center text-muted-foreground min-h-[60px]"> {/* Ensure consistent height */}
                    <span className="text-4xl font-bold text-primary">{displayPrice}</span>
                    {displayPriceDetail && <span className="text-sm block mt-1">{displayPriceDetail}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-center ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}>
                        <Check className={`mr-2 h-5 w-5 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                   {billingCycle === 'annual' && plan.name !== 'Gratuito' && (
                    <div className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                       <Info className="h-3 w-3"/> <span>+5% de desconto no Pix/Boleto</span>
                    </div>
                   )}
                </CardContent>
                <CardFooter>
                  {/* Use the new client component for the button */}
                  <PlanCTAButton
                    targetId="contato" // Pass the target section ID
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    aria-label={`Assinar o plano ${plan.name} (${billingCycle === 'monthly' ? 'mensal' : 'anual'})`}
                  >
                    {plan.cta}
                  </PlanCTAButton>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
