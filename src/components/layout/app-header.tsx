
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { Menu, LayoutDashboard, Users, Calendar, BarChart, Settings, User, CreditCard, LogOut, Landmark } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, setDoc, getDoc, doc } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

const freePlanAllowed = ['/dashboard', '/pacientes', '/agenda', '/configuracoes'];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState<FirebaseUser | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentUserPlan(data.plano || "Gratuito");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Você pode exibir um toast de erro aqui, se quiser
    }
  };

  const isAccessible = (href: string) => {
    if (currentUserPlan === 'Gratuito') {
      return freePlanAllowed.includes(href);
    }
    return true;
  };


  const handleNavigation = (href: string) => {
    if (currentUserPlan === "Gratuito" && !freePlanAllowed.includes(href)) {
      toast({
        title: "Plano necessário",
        description: "Essa funcionalidade está disponível apenas para planos Essencial, Profissional ou Clínica.",
        variant: "destructive",
      });
      return;
    }

    router.push(href);
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Logo textClassName="text-primary" dotClassName="text-foreground" />
          </Link>
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => {
                  if (!isAccessible(link.href)) {
                    toast({
                      title: "Plano necessário",
                      description: "Essa funcionalidade está disponível apenas para planos Essencial, Profissional ou Clínica.",
                      variant: "destructive",
                    });
                    return;
                  }
                  router.push(link.href);
                }}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground font-semibold" : "text-foreground/60"
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <div className="md:hidden flex-1 flex justify-center">
            <Link href="/dashboard" className="flex items-center">
              <Logo textClassName="text-primary text-xl" dotClassName="text-foreground text-xl" />
            </Link>
          </div>
          <SheetContent side="left" className="pr-0 sm:max-w-xs">
            <nav className="grid gap-y-4 pt-6">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant={pathname === link.href ? "secondary" : "ghost"}
                  className="w-full justify-start h-10 px-4 text-base"
                  onClick={() => handleNavigation(link.href)}
                >
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={usuario?.photoURL || undefined}
                    alt="User Avatar"
                    data-ai-hint="user avatar"
                  />
                  <AvatarFallback>
                    {usuario?.displayName
                      ? usuario?.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                      : 'CP'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {usuario?.displayName || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {usuario?.email || 'email@exemplo.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/configuracoes?tab=perfil')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/configuracoes?tab=plano')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Plano</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
