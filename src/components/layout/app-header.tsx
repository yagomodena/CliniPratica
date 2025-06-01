
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
import { getDoc, doc, onSnapshot, Unsubscribe } from "firebase/firestore"; // Added onSnapshot and Unsubscribe
import { useToast } from '@/hooks/use-toast';
import type { UserPermissions } from '@/components/forms/user-form';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissionKey: 'dashboard' as const },
  { href: '/pacientes', label: 'Pacientes', icon: Users, permissionKey: 'pacientes' as const },
  { href: '/agenda', label: 'Agenda', icon: Calendar, permissionKey: 'agenda' as const },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark, permissionKey: 'financeiro' as const },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart, permissionKey: 'relatorios' as const },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, permissionKey: 'configuracoes' as const },
];

type MenuItemId = typeof navLinks[number]['permissionKey'];

const freePlanAllowed = ['/dashboard', '/pacientes', '/agenda', '/configuracoes'];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);

      // Clean up previous Firestore listener if user changes or logs out
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        // Set up real-time listener for user document
        unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUserData({ ...data, uid: user.uid }); // Ensure uid is part of currentUserData
            setUserPermissions(data.permissoes || {});
          } else {
            console.warn(`User document not found for UID: ${user.uid}. Defaulting plan.`);
            setCurrentUserData({ plano: "Gratuito", uid: user.uid });
            setUserPermissions({});
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          // Handle error, e.g., by setting default data or showing a toast
          setCurrentUserData({ plano: "Gratuito", uid: user.uid });
          setUserPermissions({});
          toast({ title: "Erro ao Carregar Perfil", description: "Não foi possível carregar os dados do seu perfil em tempo real.", variant: "destructive" });
        });
      } else {
        setCurrentUserData(null);
        setUserPermissions(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [toast]); // Added toast to dependency array

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({ title: "Erro", description: "Falha ao sair.", variant: "destructive" });
    }
  };

  const isAccessible = (href: string, permissionKey?: MenuItemId) => {
    if (currentUserData?.cargo === 'Administrador') {
      if (currentUserData?.plano === 'Gratuito') {
        return freePlanAllowed.includes(href);
      }
      return true;
    }

    if (currentUserData?.plano === 'Clínica' && currentUserData?.cargo !== 'Administrador') {
      if (permissionKey && userPermissions) {
        if (userPermissions[permissionKey] === false) {
          return false;
        }
        if (userPermissions[permissionKey] === undefined && permissionKey !== 'dashboard') {
            return false;
        }
        if (userPermissions[permissionKey] === undefined && permissionKey === 'dashboard') {
            return true;
        }
        if (userPermissions[permissionKey] === true) {
            return true;
        }
      } else if (permissionKey && !userPermissions) {
          return false; 
      }
    }
    
    if (currentUserData?.plano === 'Gratuito') {
      return freePlanAllowed.includes(href);
    }
    return true;
  };

  const handleNavigation = (href: string, permissionKey?: MenuItemId) => {
    if (!isAccessible(href, permissionKey)) {
      toast({
        title: "Acesso Negado",
        description: (currentUserData?.plano === 'Gratuito' && !freePlanAllowed.includes(href)) || (currentUserData?.plano === 'Clínica' && currentUserData?.cargo !== 'Administrador' && (!userPermissions || userPermissions[permissionKey!] === false || userPermissions[permissionKey!] === undefined && permissionKey !== 'dashboard'))
          ? "Você não tem permissão para acessar esta área."
          : "Essa funcionalidade está disponível apenas para planos pagos.",
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
                onClick={() => handleNavigation(link.href, link.permissionKey)}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground font-semibold" : "text-foreground/60",
                  !isAccessible(link.href, link.permissionKey) ? "text-muted-foreground cursor-not-allowed opacity-60" : ""
                )}
                 disabled={!isAccessible(link.href, link.permissionKey)}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

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
                  onClick={() => handleNavigation(link.href, link.permissionKey)}
                  disabled={!isAccessible(link.href, link.permissionKey)}
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
                      : currentUserData?.nomeCompleto?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CP'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUserData?.nomeCompleto || usuario?.displayName || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {usuario?.email || 'email@exemplo.com'}
                  </p>
                   {currentUserData?.plano && (
                    <p className="text-xs leading-none text-muted-foreground">
                      Plano: {currentUserData.plano} {currentUserData?.cargo && currentUserData.cargo !== 'Administrador' ? `(${currentUserData.cargo})` : ''}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/configuracoes?tab=perfil')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              { (currentUserData?.cargo === 'Administrador' || (currentUserData?.plano === 'Clínica' && currentUserData?.permissoes?.configuracoes_acesso_plano_assinatura) || (currentUserData?.plano !== 'Clínica' && currentUserData?.cargo !== 'Administrador')) && (
                 <DropdownMenuItem onClick={() => router.push('/configuracoes?tab=plano')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Plano e Assinatura</span>
                </DropdownMenuItem>
              )}
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
