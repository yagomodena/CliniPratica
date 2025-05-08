
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { plans, type Plan } from '@/lib/plans-data'; // Import shared plans data
import { useToast } from '@/hooks/use-toast';

interface PlansModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentPlanName: string;
  onSelectPlan: (planName: string) => void; // Callback when a plan is selected
}

export function PlansModal({ isOpen, onOpenChange, currentPlanName, onSelectPlan }: PlansModalProps) {
  const { toast } = useToast();

  const handlePlanSelection = (plan: Plan) => {
    if (plan.name === currentPlanName) {
      toast({
        title: "Plano Atual",
        description: `Você já está no plano ${plan.name}.`,
      });
      return;
    }
    // In a real app, you'd likely trigger an API call or further steps here
    console.log("Selecionando plano:", plan.name);
    onSelectPlan(plan.name); // Call the parent callback
    toast({
      title: "Sucesso!",
      description: `Você selecionou o plano ${plan.name}. A alteração será processada.`, // Placeholder message
    });
    onOpenChange(false); // Close the modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Planos Disponíveis</DialogTitle>
          <DialogDescription>
            Escolha o plano que melhor se adapta às suas necessidades. Seu plano atual é: <strong>{currentPlanName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 ${
                plan.name === currentPlanName ? 'border-primary border-2 ring-2 ring-primary/30' : (plan.popular ? 'border-foreground/20 border-2 relative' : 'bg-card')
              }`}
            >
              {plan.popular && plan.name !== currentPlanName && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full shadow-md z-10">
                  Mais Popular
                </div>
              )}
               {plan.name === currentPlanName && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold rounded-full shadow-md z-10">
                  Plano Atual
                </div>
              )}
              <CardHeader className="pb-4 pt-6"> {/* Adjusted padding */}
                <CardTitle className="text-xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-center text-muted-foreground h-16 flex flex-col justify-center"> {/* Fixed height for alignment */}
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  {plan.priceDetail && <span className="text-xs">{plan.priceDetail}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={`flex items-start ${feature.included ? 'text-card-foreground' : 'text-muted-foreground line-through'}`}>
                      <Check className={`mr-2 mt-0.5 h-4 w-4 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handlePlanSelection(plan)}
                  className="w-full"
                  variant={plan.name === currentPlanName ? 'secondary' : (plan.popular ? 'default' : 'outline')}
                  disabled={plan.name === currentPlanName}
                  aria-label={plan.name === currentPlanName ? `Plano atual: ${plan.name}` : `Selecionar o plano ${plan.name}`}
                >
                  {plan.name === currentPlanName ? 'Plano Atual' : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
         <DialogFooter className="p-6 border-t">
             <DialogClose asChild>
               <Button variant="outline">Fechar</Button>
             </DialogClose>
           </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
