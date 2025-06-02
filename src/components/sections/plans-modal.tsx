
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
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
import { auth, db } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';


interface PlansModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentPlanName: string;
  onSelectPlan: (planName: string, mercadoPagoPlanId: string | null) => void;
  currentUser: FirebaseUser | null;
  currentUserName?: string;
}

export function PlansModal({ isOpen, onOpenChange, currentPlanName, onSelectPlan, currentUser, currentUserName }: PlansModalProps) {
  const { toast } = useToast();
  const router = useRouter();
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
        const currentPlanDetails = plans.find(p => p.name === currentPlanName);
        if (currentPlanDetails && currentPlanDetails.mercadoPagoPreapprovalPlanId) { // Check if current plan is paid
            setIsDowngrade(true);
            setSelectedPlanForConfirmation(plan);
            setIsConfirmDialogOpen(true);
        } else {
            onSelectPlan(plan.name, null);
            onOpenChange(false);
        }
        return;
    }

    if (!plan.mercadoPagoPreapprovalPlanId) {
        toast({ title: "Erro", description: "ID do plano de pré-aprovação do Mercado Pago não configurado.", variant: "destructive" });
        return;
    }

    if (!currentUser || !currentUser.email) {
      toast({ title: "Ação Necessária", description: "Por favor, faça login ou crie uma conta para selecionar um plano pago.", variant: "destructive" });
      // Optionally redirect to login/signup
      // router.push(`/cadastro?plano=${encodeURIComponent(plan.name)}&redirect=/configuracoes?tab=plano`);
      onOpenChange(false);
      return;
    }

    setIsProcessingCheckout(true);
    // For Mercado Pago preapproval plans, we redirect directly to the checkout URL.
    // We can append `external_reference` for tracking if needed and supported by MP in this context.
    // Example: `&external_reference=${currentUser.uid}` (ensure URL encoding)
    // Also `payer_email` can sometimes be prefilled: `&payer_email=${encodeURIComponent(currentUser.email)}`
    // The user's actual subscription will be linked via webhooks based on payer_email or external_reference.
    let checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${plan.mercadoPagoPreapprovalPlanId}`;
    checkoutUrl += `&external_reference=${encodeURIComponent(currentUser.uid)}`;
    if (currentUser.email) {
        checkoutUrl += `&payer_email=${encodeURIComponent(currentUser.email)}`;
    }

    window.location.href = checkoutUrl;
    // No need to set isProcessingCheckout back to false here as the page will redirect.
    // If the redirect fails or is blocked, the user remains on the page, and isProcessingCheckout should be reset
    // or a more robust error handling for redirect failure should be implemented.
    // For now, assume redirect will happen. If it's an SPA-like behavior without full redirect, reset would be needed.
  };

   const handleConfirmPlanChange = async () => {
    if (!selectedPlanForConfirmation || !currentUser) return;

    if (selectedPlanForConfirmation.name === 'Gratuito') {
        try {
            const userDocRef = doc(db, 'usuarios', currentUser.uid);
            await updateDoc(userDocRef, {
                plano: 'Gratuito',
                mercadoPagoSubscriptionId: null,
                mercadoPagoPreapprovalPlanId: null,
                mercadoPagoSubscriptionStatus: 'cancelled_locally', // Indicates user action
                mercadoPagoNextPaymentDate: null,
            });
            onSelectPlan('Gratuito', null);
            toast({
                title: "Plano Alterado para Gratuito",
                description: `Seu plano foi alterado para Gratuito. Se você tinha uma assinatura ativa, gerencie-a na sua conta Mercado Pago.`,
                variant: "success",
            });
        } catch (error) {
            console.error("Error updating plan to Gratuito in Firestore:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar seu plano para Gratuito.", variant: "destructive" });
        }
    }
    setIsConfirmDialogOpen(false);
    setSelectedPlanForConfirmation(null);
    onOpenChange(false);
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
                        <strong className="text-destructive-foreground">Atenção:</strong> Ao fazer o downgrade para o plano Gratuito, você perderá acesso a funcionalidades pagas. Sua assinatura com o Mercado Pago <strong className="text-destructive-foreground">não</strong> será cancelada automaticamente por esta ação; você precisará gerenciá-la diretamente na sua conta do Mercado Pago.
                        <br />
                        Tem certeza que deseja continuar e atualizar seu plano em nosso sistema para Gratuito?
                        </>
                    ) : (
                        <>
                        Você está mudando para o plano <strong>{selectedPlanForConfirmation?.name}</strong>.
                        Tem certeza que deseja continuar?
                        </>
                    )}
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel onClick={handleCancelConfirmation}>Cancelar</AlertDialogCancel>
                 <AlertDialogAction onClick={handleConfirmPlanChange} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                   Confirmar e Ir para Gratuito
                 </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
     </>
  );
}
