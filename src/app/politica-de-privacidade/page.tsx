import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary">Política de Privacidade</h1>
        <p className="text-lg text-muted-foreground mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      
      <article className="prose prose-lg max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold">1. Introdução</h2>
        <p>
          Bem-vindo ao CliniPrática. Nós respeitamos sua privacidade e estamos comprometidos em proteger
          seus dados pessoais. Esta política de privacidade informará como cuidamos dos seus dados pessoais
          quando você visita nosso site (independentemente de onde você o visita) ou usa nossos serviços,
          e informa sobre seus direitos de privacidade e como a lei o protege.
        </p>

        <h2 className="text-2xl font-semibold mt-6">2. Dados que Coletamos Sobre Você</h2>
        <p>
          Podemos coletar, usar, armazenar e transferir diferentes tipos de dados pessoais sobre você,
          que agrupamos da seguinte forma:
        </p>
        <ul>
          <li><strong>Dados de Identidade:</strong> incluem nome, sobrenome, nome de usuário ou identificador similar.</li>
          <li><strong>Dados de Contato:</strong> incluem endereço de e-mail e números de telefone.</li>
          <li><strong>Dados Técnicos:</strong> incluem endereço de protocolo da Internet (IP), seus dados de login, tipo e versão do navegador, configuração e localização do fuso horário, tipos e versões de plug-in do navegador, sistema operacional e plataforma e outras tecnologias nos dispositivos que você usa para acessar este site.</li>
          <li><strong>Dados de Uso:</strong> incluem informações sobre como você usa nosso site e serviços.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">3. Como Usamos Seus Dados Pessoais</h2>
        <p>
          Usaremos seus dados pessoais apenas quando a lei nos permitir. Mais comumente, usaremos seus dados
          pessoais nas seguintes circunstâncias:
        </p>
        <ul>
          <li>Onde precisamos executar o contrato que estamos prestes a celebrar ou celebramos com você.</li>
          <li>Onde for necessário para nossos interesses legítimos (ou de terceiros) e seus interesses e direitos fundamentais não se sobrepuserem a esses interesses.</li>
          <li>Onde precisamos cumprir uma obrigação legal ou regulatória.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">4. Segurança dos Dados</h2>
        <p>
          Implementamos medidas de segurança apropriadas para evitar que seus dados pessoais sejam
          acidentalmente perdidos, usados ou acessados de forma não autorizada, alterados ou divulgados.
          Além disso, limitamos o acesso aos seus dados pessoais a funcionários, agentes, contratados e
          outros terceiros que tenham uma necessidade comercial de saber.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6">5. Seus Direitos Legais</h2>
        <p>
          Sob certas circunstâncias, você tem direitos sob as leis de proteção de dados em relação aos seus
          dados pessoais, incluindo o direito de solicitar acesso, correção, exclusão, restrição ou
          objeção ao processamento, bem como o direito à portabilidade dos dados.
        </p>

        <h2 className="text-2xl font-semibold mt-6">6. Contato</h2>
        <p>
          Se você tiver alguma dúvida sobre esta política de privacidade, entre em contato conosco em <a href="mailto:privacidade@clinipratica.com.br" className="text-primary hover:underline">privacidade@clinipratica.com.br</a>.
        </p>
      </article>

      <div className="text-center mt-12">
        <Button asChild>
          <Link href="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
