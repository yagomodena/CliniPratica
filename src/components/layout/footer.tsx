
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12 text-card-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" passHref className="mb-4 inline-block">
              <Logo textClassName="text-primary" dotClassName="text-foreground" />
            </Link>
            <p className="text-muted-foreground text-sm">
              Simplificando o acompanhamento de pacientes para profissionais da saúde.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Links Úteis</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/termos-de-uso" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/politica-de-privacidade" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/politica-de-cancelamento" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Cancelamento
                </Link>
              </li>
              <li>
                <Link href="/contato-suporte" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Siga-nos</h3>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/clinipratica/"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-6 w-6" />
              </a>

              <a
                href="https://www.youtube.com/@CliniPratica"
                aria-label="Youtube"
                className="text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CliniPrática. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
