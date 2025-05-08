
'use client'; // Keep 'use client' because of the onClick handler for smooth scrolling

import type React from 'react'; // Import React for MouseEvent type
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button directly
import { Check, Info } from 'lucide-react';
import { plans } from '@/lib/plans-data';
// Removed Label, Switch, Badge imports as toggle is removed
// Removed useState import

// Removed BillingCycle type as it's no longer used here

export function PlansSection() {
  // Removed useState for billingCycle - display default (annual) pricing
  const billingCycle = 'annual'; // Default to annual for static display

  // onClick handler for smooth scrolling remains client-side logic
  const handleCTAClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const headerOffset = 80; // Adjust if header height changes
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };


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
        <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto"> {/* Increased bottom margin */}
          Escolha o plano ideal para você e comece a transformar a gestão do seu consultório hoje mesmo.
        </p>

        {/* Billing Cycle Toggle Removed from here */}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {landingPagePlans.map((plan) => {
            // Display prices based on the default annual cycle
            const displayPrice = plan.price; // Always show annual effective price
            const displayPriceDetail = plan.priceDetail; // Always show annual detail

            return (
              <Card
                key={plan.name}
                className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 ${
                  plan.popular ? 'border-primary border-2 relative pt-4' : 'bg-card' // Added top padding for popular badge
                }`}
              >
                 {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full shadow-md whitespace-nowrap z-10"> {/* Added z-10 */}
                    Mais Popular
                  </div>
                )}
                <CardHeader className="pb-4 pt-2"> {/* Adjusted padding */}
                  <CardTitle className="text-2xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                   <CardDescription className="text-center text-muted-foreground min-h-[60px]"> {/* Ensure consistent height */}
                    <span className="text-4xl font-bold text-primary">{displayPrice}</span>
                    {displayPriceDetail && <span className="text-sm block mt-1">{displayPriceDetail}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}> {/* Adjusted items-center to items-start */}
                        <Check className={`mr-2 mt-0.5 h-5 w-5 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>{feature.text}</span> {/* Wrap text in span for better alignment */}
                      </li>
                    ))}
                  </ul>
                   {plan.name !== 'Gratuito' && ( // Show discount info for paid plans (annual view)
                    <div className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                       <Info className="h-3 w-3"/> <span>+5% de desconto no Pix/Boleto</span>
                    </div>
                   )}
                </CardContent>
                <CardFooter>
                  {/* Use the regular Button with onClick handler */}
                   <Button
                      onClick={(e) => handleCTAClick(e, 'contato')} // Pass target ID
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      aria-label={`Assinar o plano ${plan.name} (anual)`} // Indicate annual plan
                    >
                      {plan.cta}
                    </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

    