
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
import { Menu, LayoutDashboard, Users, Calendar, MessageSquare, BarChart, Settings, User, CreditCard, LogOut, Landmark } from 'lucide-react'; // Added Landmark
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark }, // Added Financeiro link
  { href: '/relatorios', label: 'Relatórios', icon: BarChart },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    console.log("Simulating logout...");
    router.push('/login');
  };

  const handleNavigation = (href: string) => {
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
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground font-semibold" : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
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
                  {/* Placeholder image, replace with actual user avatar if available */}
                  <AvatarImage src="https://picsum.photos/100/100" alt="User Avatar" data-ai-hint="user avatar"/>
                  <AvatarFallback>CP</AvatarFallback> {/* Initials as fallback */}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Usuário Exemplo</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    usuario@clinipratica.com
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
