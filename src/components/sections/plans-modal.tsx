
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Info } from 'lucide-react'; // Added AlertTriangle, Info
import { plans, type Plan } from '@/lib/plans-data'; // Import shared plans data
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

type BillingCycle = 'monthly' | 'annual';

interface PlansModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentPlanName: string;
  onSelectPlan: (planName: string) => void; // Callback when a plan is selected
}

export function PlansModal({ isOpen, onOpenChange, currentPlanName, onSelectPlan }: PlansModalProps) {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual'); // Default to annual
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedPlanForConfirmation, setSelectedPlanForConfirmation] = useState<Plan | null>(null);
  const [isDowngrade, setIsDowngrade] = useState(false);


  const handlePlanSelectionClick = (plan: Plan) => {
    if (plan.name === currentPlanName) {
      toast({
        title: "Plano Atual",
        description: `Você já está no plano ${plan.name}.`,
      });
      return;
    }

    // Determine if it's a downgrade based on plan levels
    const currentPlan = plans.find(p => p.name === currentPlanName);
    const downgrade = currentPlan ? plan.level < currentPlan.level : false;
    setIsDowngrade(downgrade);

    // Set the plan to be confirmed and open the confirmation dialog
    setSelectedPlanForConfirmation(plan);
    setIsConfirmDialogOpen(true);
  };

   const handleConfirmPlanChange = () => {
    if (!selectedPlanForConfirmation) return;

    // In a real app, you'd likely trigger an API call or further steps here
    console.log(`Confirmando mudança para o plano ${selectedPlanForConfirmation.name} com cobrança ${billingCycle}`);
    onSelectPlan(selectedPlanForConfirmation.name); // Call the parent callback

    toast({
      title: "Sucesso!",
      description: `Seu plano foi alterado para ${selectedPlanForConfirmation.name}. A cobrança (${billingCycle}) será ajustada no próximo ciclo.`,
      variant: "success",
    });

    // Close both dialogs
    setIsConfirmDialogOpen(false);
    setSelectedPlanForConfirmation(null);
    onOpenChange(false);
  };

  const handleCancelConfirmation = () => {
      setIsConfirmDialogOpen(false);
      setSelectedPlanForConfirmation(null);
      // Keep the main plans modal open unless the user explicitly closes it
  }

  return (
     <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[80vw] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
            {/* Adjusted padding top for header */}
            <DialogHeader className="p-6 pb-4 border-b pt-6 sticky top-0 bg-background z-10">
            <DialogTitle className="text-2xl">Planos Disponíveis</DialogTitle>
            <DialogDescription>
                Escolha o plano que melhor se adapta às suas necessidades. Seu plano atual é: <strong>{currentPlanName}</strong>.
            </DialogDescription>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center space-x-4 pt-4">
                 <Label htmlFor="modal-billing-cycle-switch" className={`font-medium ${billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Mensal
                 </Label>
                 <Switch
                    id="modal-billing-cycle-switch"
                    checked={billingCycle === 'annual'}
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
                    aria-label="Alternar entre cobrança mensal e anual"
                 />
                 <Label htmlFor="modal-billing-cycle-switch" className={`font-medium ${billingCycle === 'annual' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Anual
                 </Label>
                 {billingCycle === 'annual' && (
                    <Badge variant="outline" className="ml-2 border-green-500 text-green-700 bg-green-50">
                        Economize ~17%
                    </Badge>
                 )}
               </div>
            </DialogHeader>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
                const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.price;
                const displayPriceDetail = billingCycle === 'monthly' ? plan.monthlyPriceDetail : plan.priceDetail;
                const isCurrent = plan.name === currentPlanName;

                return (
                    <Card
                        key={plan.name}
                        className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 relative pt-4 ${
                            isCurrent ? 'border-primary border-2 ring-2 ring-primary/30' : (plan.popular ? 'border-foreground/20 border-2' : 'bg-card')
                        }`}
                    >
                        {plan.popular && !isCurrent && (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full shadow-md z-10 whitespace-nowrap">
                                Mais Popular
                            </div>
                        )}
                        {isCurrent && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold rounded-full shadow-md z-10 whitespace-nowrap">
                                Plano Atual
                            </div>
                        )}
                        <CardHeader className="pb-4 pt-2">
                            <CardTitle className="text-xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                             <CardDescription className="text-center text-muted-foreground min-h-[60px]"> {/* Ensure consistent height */}
                                <span className="text-3xl font-bold text-primary">{displayPrice}</span>
                                {displayPriceDetail && <span className="text-xs block mt-1">{displayPriceDetail}</span>}
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
                            {/* Placeholder for 5% discount info */}
                            {billingCycle === 'annual' && plan.name !== 'Gratuito' && (
                              <div className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                                <Info className="h-3 w-3"/> <span>+5% de desconto no Pix/Boleto</span>
                              </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={() => handlePlanSelectionClick(plan)}
                                className="w-full"
                                variant={isCurrent ? 'secondary' : (plan.popular ? 'default' : 'outline')}
                                disabled={isCurrent}
                                aria-label={isCurrent ? `Plano atual: ${plan.name}` : `Selecionar o plano ${plan.name} (${billingCycle === 'monthly' ? 'mensal' : 'anual'})`}
                            >
                                {isCurrent ? 'Plano Atual' : plan.cta}
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
            </div>
            <DialogFooter className="p-6 border-t sticky bottom-0 bg-background z-10">
                <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
         <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle className="flex items-center gap-2">
                     {isDowngrade && <AlertTriangle className="h-5 w-5 text-orange-500" />} {/* Changed icon color */}
                    Confirmar Mudança de Plano
                 </AlertDialogTitle>
                 <AlertDialogDescription>
                    {isDowngrade ? (
                        <>
                        Você está mudando do plano <strong>{currentPlanName}</strong> para o plano <strong>{selectedPlanForConfirmation?.name}</strong> com cobrança {billingCycle}.
                        <br /><br />
                        <strong className="text-orange-600 dark:text-orange-400">Atenção:</strong> Ao fazer o downgrade, você perderá acesso a funcionalidades exclusivas do plano {currentPlanName}.
                        <br />
                        Tem certeza que deseja continuar? A cobrança será ajustada no próximo ciclo.
                        </>
                    ) : (
                        <>
                        Você está saindo do plano <strong>{currentPlanName}</strong> e mudando para o plano <strong>{selectedPlanForConfirmation?.name}</strong> com cobrança {billingCycle}.
                        <br /><br />
                        Tem certeza que deseja continuar? A cobrança será ajustada no próximo ciclo de faturamento.
                        </>
                    )}
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel onClick={handleCancelConfirmation}>Cancelar</AlertDialogCancel>
                 <AlertDialogAction onClick={handleConfirmPlanChange}>
                   Confirmar Mudança
                 </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
     </>
  );
}
