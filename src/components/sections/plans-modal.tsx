
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';
import { plans, type Plan } from '@/lib/plans-data';
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
import { loadStripe } from '@stripe/stripe-js';
import { auth, db } from '@/firebase'; // Import auth and db for Firestore updates
import { doc, updateDoc } from 'firebase/firestore'; // Import Firestore functions
import { User as FirebaseUser } from 'firebase/auth';


interface PlansModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentPlanName: string;
  onSelectPlan: (planName: string, stripePriceId: string | null) => void; // Updated to pass stripePriceId
  currentUser: FirebaseUser | null; // Pass current Firebase user
  currentUserName?: string;
}

// Ensure Stripe public key is defined
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
  : null;


export function PlansModal({ isOpen, onOpenChange, currentPlanName, onSelectPlan, currentUser, currentUserName }: PlansModalProps) {
  const { toast } = useToast();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedPlanForConfirmation, setSelectedPlanForConfirmation] = useState<Plan | null>(null);
  const [isDowngrade, setIsDowngrade] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);


  const handlePlanSelectionClick = async (plan: Plan) => {
    if (plan.name === currentPlanName) {
      toast({
        title: "Plano Atual",
        description: `Você já está no plano ${plan.name}.`,
      });
      return;
    }

    if (plan.name === 'Gratuito') {
        // Logic for downgrading to Gratuito
        const currentPlanDetails = plans.find(p => p.name === currentPlanName);
        if (currentPlanDetails && currentPlanDetails.stripePriceId) { // Check if current plan is paid
            setIsDowngrade(true);
            setSelectedPlanForConfirmation(plan);
            setIsConfirmDialogOpen(true);
        } else { // If current is already Gratuito or somehow not a Stripe plan
            onSelectPlan(plan.name, null); // Update locally
            onOpenChange(false); // Close modal
        }
        return;
    }


    if (!plan.stripePriceId) {
        toast({ title: "Erro", description: "ID de preço do Stripe não configurado para este plano.", variant: "destructive" });
        return;
    }

    if (!currentUser || !currentUser.email) {
      toast({ title: "Erro", description: "Usuário não autenticado ou e-mail não encontrado.", variant: "destructive" });
      return;
    }
     if (!stripePromise) {
      toast({ title: "Erro de Configuração", description: "Chave pública do Stripe não configurada.", variant: "destructive" });
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUserName || currentUser.displayName || currentUser.email,
        }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      if (sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
          if (stripeError) {
            console.error("Stripe redirect error:", stripeError);
            toast({ title: "Erro no Checkout", description: stripeError.message || "Não foi possível redirecionar para o pagamento.", variant: "destructive" });
          }
        } else {
             toast({ title: "Erro", description: "Stripe.js não carregou.", variant: "destructive" });
        }
      }
    } catch (err: any) {
      console.error("Failed to create checkout session:", err);
      toast({ title: "Erro ao Iniciar Pagamento", description: err.message || "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

   const handleConfirmPlanChange = async () => {
    if (!selectedPlanForConfirmation || !currentUser) return;

    if (selectedPlanForConfirmation.name === 'Gratuito') {
        // User is downgrading to Gratuito.
        // Update Firestore directly. Stripe webhook will handle actual subscription cancellation if user does it via Stripe portal.
        try {
            const userDocRef = doc(db, 'usuarios', currentUser.uid);
            await updateDoc(userDocRef, {
                plano: 'Gratuito',
                // Optionally clear Stripe fields, or let webhook handle it.
                // stripeSubscriptionId: null,
                // stripePriceId: null,
                // stripeSubscriptionStatus: 'canceled_locally',
            });
            onSelectPlan('Gratuito', null); // Update parent state
            toast({
                title: "Plano Alterado para Gratuito",
                description: `Seu plano foi alterado para Gratuito. Se você tinha uma assinatura ativa, gerencie-a no portal do cliente Stripe.`,
                variant: "success",
            });
        } catch (error) {
            console.error("Error updating plan to Gratuito in Firestore:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar seu plano para Gratuito.", variant: "destructive" });
        }
    }
    // For upgrades/changes between paid plans, Stripe checkout handles it.

    setIsConfirmDialogOpen(false);
    setSelectedPlanForConfirmation(null);
    onOpenChange(false); // Close the main plans modal as well
  };

  const handleCancelConfirmation = () => {
      setIsConfirmDialogOpen(false);
      setSelectedPlanForConfirmation(null);
  }

  return (
     <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[80vw] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
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
                {plan.name === currentPlanName && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold rounded-full shadow-md z-10 whitespace-nowrap">
                    Plano Atual
                    </div>
                )}
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
                    disabled={plan.name === currentPlanName || isProcessingCheckout}
                    aria-label={plan.name === currentPlanName ? `Plano atual: ${plan.name}` : `Selecionar o plano ${plan.name}`}
                    >
                    {isProcessingCheckout && selectedPlanForConfirmation?.name === plan.name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isProcessingCheckout && selectedPlanForConfirmation?.name === plan.name ? "Processando..." : (plan.name === currentPlanName ? 'Plano Atual' : plan.cta)}
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
            <DialogFooter className="p-6 border-t">
                <DialogClose asChild>
                <Button variant="outline" disabled={isProcessingCheckout}>Fechar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
        </Dialog>

         <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle className="flex items-center gap-2">
                     {isDowngrade && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    Confirmar Mudança para Gratuito
                 </AlertDialogTitle>
                 <AlertDialogDescription>
                    {isDowngrade ? (
                        <>
                        Você está mudando do plano <strong>{currentPlanName}</strong> para o plano <strong>{selectedPlanForConfirmation?.name}</strong>.
                        <br /><br />
                        <strong className="text-destructive-foreground">Atenção:</strong> Ao fazer o downgrade para o plano Gratuito, você perderá acesso a funcionalidades pagas ao final do seu ciclo de cobrança atual. Sua assinatura com a Stripe não será cancelada automaticamente por esta ação; você precisará gerenciá-la através do portal do cliente Stripe ou ela será cancelada caso o pagamento falhe.
                        <br />
                        Tem certeza que deseja continuar e atualizar seu plano em nosso sistema para Gratuito?
                        </>
                    ) : ( // This case should not be reached if selection is not 'Gratuito' and we go to Stripe
                        <>
                        Você está mudando para o plano <strong>{selectedPlanForConfirmation?.name}</strong>.
                        Tem certeza que deseja continuar?
                        </>
                    )}
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel onClick={handleCancelConfirmation}>Cancelar</AlertDialogCancel>
                 <AlertDialogAction onClick={handleConfirmPlanChange}>
                   Confirmar e Ir para Gratuito
                 </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
     </>
  );
}
