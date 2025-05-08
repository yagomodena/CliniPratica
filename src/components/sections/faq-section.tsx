import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento, sem taxas adicionais. Seu acesso continuará ativo até o final do período já pago.',
  },
  {
    question: 'Como funciona o plano gratuito?',
    answer:
      'O plano gratuito oferece funcionalidades básicas para você começar, como cadastro de até 10 pacientes e agenda. É uma ótima forma de conhecer o CliniPrática sem custos.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'A segurança dos seus dados é nossa prioridade. Utilizamos criptografia de ponta e seguimos as melhores práticas de segurança para proteger todas as informações no sistema.',
  },
  {
    question: 'Há período de teste para os planos pagos?',
    answer:
      'Sim, oferecemos um período de teste de 7 dias para todos os nossos planos pagos. Você pode experimentar todas as funcionalidades antes de decidir.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Perguntas Frequentes
        </h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-card shadow-md rounded-lg px-6">
                <AccordionTrigger className="text-lg font-medium text-left hover:no-underline text-card-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
