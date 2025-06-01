
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { plans as allPlansData, type Plan } from '@/lib/plans-data'; 
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase'; // Import auth and db
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
  : null;

export function PlansSection() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null); // Store priceId being processed
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
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

    if (!plan.stripePriceId) {
      toast({ title: "Erro", description: "ID de preço do Stripe não configurado para este plano.", variant: "destructive" });
      return;
    }

    if (!currentUser) {
      // If user is not logged in, redirect to cadastro with plan info.
      // Stripe checkout needs user context, so direct checkout isn't ideal here.
      // Let them sign up first.
      router.push(`/cadastro?plano=${encodeURIComponent(plan.name)}`);
      toast({ title: "Primeiro, crie sua conta!", description: "Você precisa estar cadastrado para selecionar um plano pago.", variant: "default" });
      return;
    }
     if (!currentUser.email) {
      toast({ title: "Erro", description: "Email do usuário não encontrado para iniciar o pagamento.", variant: "destructive" });
      return;
    }

    if (!stripePromise) {
      toast({ title: "Erro de Configuração", description: "Chave pública do Stripe não configurada.", variant: "destructive" });
      setIsProcessingCheckout(null);
      return;
    }

    setIsProcessingCheckout(plan.stripePriceId);
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
          userName: currentUserName,
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
      setIsProcessingCheckout(null);
    }
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
                  disabled={isProcessingCheckout === plan.stripePriceId}
                >
                  {isProcessingCheckout === plan.stripePriceId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isProcessingCheckout === plan.stripePriceId ? 'Processando...' : (plan.name === 'Gratuito' ? 'Começar Gratuitamente' : `Escolher ${plan.name}`)}
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
