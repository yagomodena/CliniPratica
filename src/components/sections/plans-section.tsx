
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { plans as allPlansData, type Plan } from '@/lib/plans-data';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';

export function PlansSection() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  // currentUserName is not strictly needed here if we only pass UID and Email to MP,
  // but keeping it for consistency if MP API might use it in the future or for logs.
  const [currentUserName, setCurrentUserName] = useState<string>('');


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserName(userDocSnap.data()?.nomeCompleto || user.displayName || user.email || '');
        } else {
          setCurrentUserName(user.displayName || user.email || '');
        }
      } else {
        setCurrentUserName('');
      }
    });
    return () => unsubscribe();
  }, []);


  const handlePlanCTAClick = async (plan: Plan) => {
    if (plan.name === 'Gratuito') {
      router.push(`/cadastro?plano=${encodeURIComponent(plan.name)}`);
      return;
    }

    if (!plan.mercadoPagoPreapprovalPlanId) {
      toast({ title: "Erro", description: "ID do plano de pré-aprovação do Mercado Pago não configurado.", variant: "destructive" });
      return;
    }

    if (!currentUser) {
      router.push(`/cadastro?plano=${encodeURIComponent(plan.name)}`);
      toast({ title: "Crie sua conta primeiro!", description: `Você será redirecionado para o cadastro do plano ${plan.name}.`, variant: "default" });
      return;
    }

    if (!currentUser.email) {
        toast({ title: "Erro de Autenticação", description: "Email do usuário não encontrado. Por favor, tente fazer login novamente.", variant: "destructive" });
        return;
    }

    setIsProcessingCheckout(plan.mercadoPagoPreapprovalPlanId);

    let checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${plan.mercadoPagoPreapprovalPlanId}`;
    checkoutUrl += `&external_reference=${encodeURIComponent(currentUser.uid)}`;
    checkoutUrl += `&payer_email=${encodeURIComponent(currentUser.email)}`;

    window.location.href = checkoutUrl;
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
                  onClick={() => handlePlanCTAClick(plan)}
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  aria-label={plan.name === 'Gratuito' ? 'Começar Gratuitamente' : `Escolher o plano ${plan.name}`}
                  disabled={!!isProcessingCheckout}
                >
                  {plan.name !== 'Gratuito' && isProcessingCheckout && isProcessingCheckout === plan.mercadoPagoPreapprovalPlanId ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {plan.name === 'Gratuito'
                    ? 'Começar Gratuitamente'
                    : (isProcessingCheckout && isProcessingCheckout === plan.mercadoPagoPreapprovalPlanId
                      ? 'Processando...'
                      : `Escolher ${plan.name}`)}
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
