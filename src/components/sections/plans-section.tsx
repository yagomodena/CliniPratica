
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Percent } from 'lucide-react';
import { plans as allPlansData, type Plan } from '@/lib/plans-data'; // Import shared plans data
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type BillingCycle = 'monthly' | 'annually';
type PaymentMethod = 'card' | 'pix_boleto';


export function PlansSection() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annually');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card'); // For annual discount with pix/boleto

  const handlePlanCTAClick = (planName: string) => {
    router.push(`/cadastro?plano=${encodeURIComponent(planName)}`);
  };

  const getAdjustedPrice = (plan: Plan): string => {
    if (plan.name === 'Gratuito') return plan.price;
    
    let basePriceMonthly = 0;
    // Find the original annual price per month to calculate monthly
    const annualPlan = allPlansData.find(p => p.name === plan.name && p.priceDetail?.includes('/mês'));
    if (annualPlan) {
        basePriceMonthly = parseFloat(annualPlan.price.replace('R$', '').replace(',', '.'));
    }

    if (billingCycle === 'monthly') {
      return `R$${(basePriceMonthly + 10).toFixed(2).replace('.', ',')}`;
    }
    // Annual price is the default from plans-data for /mês types
    return plan.price; 
  };

  const getPriceDetail = (plan: Plan): string | undefined => {
    if (plan.name === 'Gratuito') return plan.priceDetail;
    if (billingCycle === 'monthly') return '/mês';
    
    // Annual billing details
    const basePriceMonthly = parseFloat(plan.price.replace('R$', '').replace(',', '.'));
    const annualTotal = basePriceMonthly * 12;
    let detail = `/mês (faturado R$${annualTotal.toFixed(2).replace('.', ',')} anualmente)`;

    if (paymentMethod === 'pix_boleto') {
      const discountedTotal = annualTotal * 0.95;
      detail += ` - R$${discountedTotal.toFixed(2).replace('.', ',')} à vista`;
    }
    return detail;
  };


  return (
    <section id="planos" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Planos flexíveis para cada necessidade
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Escolha o plano ideal para você e comece a transformar a gestão do seu consultório hoje mesmo.
        </p>

        <div className="flex flex-col items-center justify-center space-y-4 mb-12">
          <div className="flex items-center space-x-3 bg-card p-2 rounded-full shadow-sm border">
            <Button 
              variant={billingCycle === 'annually' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('annually')}
              className="rounded-full px-6 py-2 text-sm"
            >
              Anual <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">-10%</Badge>
            </Button>
            <Button 
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
              className="rounded-full px-6 py-2 text-sm"
            >
              Mensal
            </Button>
          </div>

          {billingCycle === 'annually' && (
            <div className="flex flex-col items-center space-y-2 text-sm text-muted-foreground">
              <p>Pague com Boleto ou Pix à vista e ganhe mais 5% de desconto no total anual!</p>
              <div className="flex items-center space-x-2">
                <Label htmlFor="payment-method-annual">Forma de Pagamento Anual:</Label>
                <Switch
                  id="payment-method-annual"
                  checked={paymentMethod === 'pix_boleto'}
                  onCheckedChange={(checked) => setPaymentMethod(checked ? 'pix_boleto' : 'card')}
                />
                <Label htmlFor="payment-method-annual" className="cursor-pointer">
                  {paymentMethod === 'pix_boleto' ? 'Boleto/Pix (Com Desconto)' : 'Cartão de Crédito'}
                </Label>
              </div>
              {paymentMethod === 'pix_boleto' && (
                 <Badge variant="success" className="text-xs px-2 py-0.5">
                    <Percent className="h-3 w-3 mr-1" /> 5% de desconto aplicado!
                 </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {allPlansData.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 ${
                plan.popular && billingCycle === 'annually' ? 'border-primary border-2 relative' : 'bg-card' // Popular only on annual view for emphasis
              }`}
            >
              {plan.popular && billingCycle === 'annually' && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full shadow-md">
                  Mais Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-center text-muted-foreground min-h-[60px] flex flex-col justify-center">
                  <span className="text-4xl font-bold text-primary">{getAdjustedPrice(plan)}</span>
                  {getPriceDetail(plan) && <span className="text-xs mt-1">{getPriceDetail(plan)}</span>}
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
                  variant={plan.popular && billingCycle === 'annually' ? 'default' : 'outline'}
                  aria-label={`Começar com o plano ${plan.name}`}
                >
                  {plan.name === 'Gratuito' ? 'Começar Gratuitamente' : `Escolher ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
         <p className="text-center text-sm text-muted-foreground mt-10">
          <strong>Todos os planos pagos incluem 1 mês grátis</strong> para testar sem compromisso. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
