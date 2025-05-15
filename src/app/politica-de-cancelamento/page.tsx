
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PoliticaDeCancelamentoPage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary">Política de Cancelamento</h1>
        <p className="text-lg text-muted-foreground mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      
      <article className="prose prose-lg max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-lg text-card-foreground">
        <p className="lead">
          Nosso objetivo é oferecer uma experiência prática e transparente para todos os nossos assinantes. 
          Por isso, disponibilizamos um período de teste gratuito de 30 dias para que você possa conhecer 
          todas as funcionalidades do CliniPrática antes de iniciar sua assinatura paga.
        </p>

        <h2 className="text-2xl font-semibold mt-8">Cancelamento após o período de teste</h2>
        <p>
          Ao final dos 30 dias de teste, a cobrança será feita automaticamente utilizando os dados do 
          cartão fornecido no momento da inscrição.
        </p>
        <p>
          Caso opte pelo cancelamento após o início da assinatura paga:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>O valor já pago não será reembolsado.</li>
          <li>O plano continuará ativo até o fim do ciclo vigente (30 dias após a cobrança).</li>
          <li>Após esse período, nenhuma nova cobrança será realizada, desde que o cancelamento tenha sido solicitado.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">Como cancelar</h2>
        <p>
          Você pode cancelar a qualquer momento diretamente no seu painel do CliniPrática ou entrar em 
          contato com nosso suporte.
        </p>
      </article>

      <div className="text-center mt-12">
        <Button asChild>
          <Link href="/">Voltar à Página Inicial</Link>
        </Button>
      </div>
    </div>
  );
}
