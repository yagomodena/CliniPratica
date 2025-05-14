
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export function Footer() {
  return (
    <footer className="bg-primary/80 border-t border-border py-12 text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" passHref className="mb-4 inline-block">
                <Logo textClassName="text-white" dotClassName="text-white/80"/>
            </Link>
            <p className="text-primary-foreground/90 text-sm">
              Simplificando o acompanhamento de pacientes para profissionais da saúde.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Links Úteis</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/termos-de-uso" className="text-sm text-primary-foreground/90 hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/politica-de-privacidade" className="text-sm text-primary-foreground/90 hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/contato-suporte" className="text-sm text-primary-foreground/90 hover:text-white transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Siga-nos</h3>
            <div className="flex space-x-4">
              <Link href="#" aria-label="Facebook" className="text-primary-foreground/90 hover:text-white transition-colors">
                <Facebook className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Instagram" className="text-primary-foreground/90 hover:text-white transition-colors">
                <Instagram className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="LinkedIn" className="text-primary-foreground/90 hover:text-white transition-colors">
                <Linkedin className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Twitter" className="text-primary-foreground/90 hover:text-white transition-colors">
                <Twitter className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/30 pt-8 text-center text-sm text-primary-foreground/90">
          <p>&copy; {new Date().getFullYear()} CliniPrática. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
