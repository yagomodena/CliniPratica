
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
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


interface PlansModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentPlanName: string;
  onSelectPlan: (planName: string) => void; // Callback when a plan is selected
}

export function PlansModal({ isOpen, onOpenChange, currentPlanName, onSelectPlan }: PlansModalProps) {
  const { toast } = useToast();
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

    // Determine if it's a downgrade
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
    console.log("Confirmando mudança para o plano:", selectedPlanForConfirmation.name);
    onSelectPlan(selectedPlanForConfirmation.name); // Call the parent callback

    toast({
      title: "Sucesso!",
      description: `Seu plano foi alterado para ${selectedPlanForConfirmation.name}. A cobrança será ajustada no próximo ciclo.`,
      variant: "success", // Use success variant
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
            <DialogHeader className="p-6 pb-4 border-b pt-6">
            <DialogTitle className="text-2xl">Planos Disponíveis</DialogTitle>
            <DialogDescription>
                Escolha o plano que melhor se adapta às suas necessidades. Seu plano atual é: <strong>{currentPlanName}</strong>.
            </DialogDescription>
            </DialogHeader>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => (
                <Card
                key={plan.name}
                className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 relative pt-4 ${
                    plan.name === currentPlanName ? 'border-primary border-2 ring-2 ring-primary/30' : (plan.popular ? 'border-foreground/20 border-2' : 'bg-card')
                }`}
                >
                {plan.popular && plan.name !== currentPlanName && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full shadow-md z-10 whitespace-nowrap">
                    Mais Popular
                    </div>
                )}
                {plan.name === currentPlanName && ( // This condition correctly shows the badge ONLY on the current plan
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold rounded-full shadow-md z-10 whitespace-nowrap">
                    Plano Atual
                    </div>
                )}
                {/* Card header moved slightly down */}
                <CardHeader className="pb-4 pt-2">
                    <CardTitle className="text-xl font-semibold text-center text-card-foreground">{plan.name}</CardTitle>
                    <CardDescription className="text-center text-muted-foreground h-16 flex flex-col justify-center">
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
                    onClick={() => handlePlanSelectionClick(plan)}
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

        {/* Confirmation Dialog */}
         <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle className="flex items-center gap-2">
                     {isDowngrade && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    Confirmar Mudança de Plano
                 </AlertDialogTitle>
                 <AlertDialogDescription>
                    {isDowngrade ? (
                        <>
                        Você está mudando do plano <strong>{currentPlanName}</strong> para o plano <strong>{selectedPlanForConfirmation?.name}</strong>.
                        <br /><br />
                        <strong className="text-destructive-foreground">Atenção:</strong> Ao fazer o downgrade, você perderá acesso a funcionalidades exclusivas do plano {currentPlanName}.
                        <br />
                        Tem certeza que deseja continuar? A cobrança será ajustada no próximo ciclo.
                        </>
                    ) : (
                        <>
                        Você está saindo do plano <strong>{currentPlanName}</strong> e mudando para o plano <strong>{selectedPlanForConfirmation?.name}</strong>.
                        <br />
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
