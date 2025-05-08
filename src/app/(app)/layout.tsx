
import { AppHeader } from '@/components/layout/app-header';
import type React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      {/* You could add an AppFooter here if needed */}
    </div>
  );
}
