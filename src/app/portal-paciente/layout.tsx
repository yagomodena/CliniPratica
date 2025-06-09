
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

interface PatientPortalLayoutProps {
  children: ReactNode;
}

export default function PatientPortalLayout({ children }: PatientPortalLayoutProps) {
  const router = useRouter();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedPatientId = localStorage.getItem('patientPortalId');
    const storedPatientName = localStorage.getItem('patientName');
    if (!storedPatientId) {
      router.replace('/portal-paciente/login');
    } else {
      setPatientName(storedPatientName || 'Paciente');
      setIsLoading(false);
    }
  }, [router]);

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
