
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

interface PatientPortalLayoutProps {
  children: ReactNode;
}

export default function PatientPortalLayout({ children }: PatientPortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const [patientName, setPatientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedPatientId = localStorage.getItem('patientPortalId');
    const storedPatientName = localStorage.getItem('patientName');

    if (storedPatientId) {
      // Se há um ID de paciente, estamos "logados".
      // Definimos o nome e paramos o carregamento para mostrar o conteúdo (dashboard).
      setPatientName(storedPatientName || 'Paciente');
      setIsLoading(false);
    } else {
      // Se NÃO há ID de paciente:
      if (pathname !== '/portal-paciente/login') {
        // E não estamos na página de login, então redirecionamos para lá.
        router.replace('/portal-paciente/login');
        // Neste caso, o redirecionamento tratará da próxima renderização.
      } else {
        // E ESTAMOS na página de login, então é o lugar certo. Paramos o carregamento.
        setIsLoading(false);
      }
    }
  }, [router, pathname]); // Dependencies: router and pathname

  const handleLogout = () => {
    localStorage.removeItem('patientPortalId');
    localStorage.removeItem('patientName');
    router.push('/portal-paciente/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Carregando portal do paciente...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <Link href="/portal-paciente/dashboard">
            <Logo textClassName="text-primary text-xl" dotClassName="text-foreground text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground hidden sm:inline">
              Olá, <span className="font-semibold">{patientName}</span>
            </span>
             <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sm">
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground border-t">
        &copy; {new Date().getFullYear()} CliniPrática - Portal do Paciente
      </footer>
    </div>
  );
}
