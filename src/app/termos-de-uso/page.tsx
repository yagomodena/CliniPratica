import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermosDeUsoPage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary">Termos de Uso</h1>
        <p className="text-lg text-muted-foreground mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      
      <article className="prose prose-lg max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold">1. Aceitação dos Termos</h2>
        <p>
          Ao acessar e usar o CliniPrática ("Serviço"), você concorda em cumprir e estar vinculado
          a estes Termos de Uso ("Termos"). Se você não concordar com estes Termos, não use o Serviço.
        </p>

        <h2 className="text-2xl font-semibold mt-6">2. Descrição do Serviço</h2>
        <p>
          CliniPrática é uma plataforma SaaS projetada para ajudar profissionais de saúde a gerenciar
          informações de pacientes, agendamentos e outros aspectos de seus consultórios.
        </p>

        <h2 className="text-2xl font-semibold mt-6">3. Contas de Usuário</h2>
        <p>
          Para usar certas funcionalidades do Serviço, você pode precisar criar uma conta. Você é
          responsável por manter a confidencialidade de sua senha e conta e por todas as
          atividades que ocorrem sob sua conta.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6">4. Uso Aceitável</h2>
        <p>
          Você concorda em não usar o Serviço para qualquer finalidade ilegal ou proibida por estes Termos.
          Você não pode usar o Serviço de qualquer maneira que possa danificar, desabilitar, sobrecarregar ou
          prejudicar o Serviço.
        </p>

        <h2 className="text-2xl font-semibold mt-6">5. Privacidade</h2>
        <p>
          Sua privacidade é importante para nós. Nossa Política de Privacidade, que é incorporada a estes Termos
          por referência, explica como coletamos, usamos e protegemos suas informações pessoais.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6">6. Modificações nos Termos</h2>
        <p>
          Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre quaisquer
          alterações publicando os novos Termos no Serviço. Seu uso continuado do Serviço após tais
          alterações constitui sua aceitação dos novos Termos.
        </p>

        <h2 className="text-2xl font-semibold mt-6">7. Limitação de Responsabilidade</h2>
        <p>
          Em nenhuma circunstância o CliniPrática será responsável por quaisquer danos indiretos, incidentais,
          especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados, uso,
          goodwill ou outras perdas intangíveis.
        </p>

        <h2 className="text-2xl font-semibold mt-6">8. Contato</h2>
        <p>
          Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em <a href="mailto:contato@clinipratica.com.br" className="text-primary hover:underline">contato@clinipratica.com.br</a>.
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
