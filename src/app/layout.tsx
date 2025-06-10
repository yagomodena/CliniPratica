
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CliniPrática',
  description: 'Acompanhe seus pacientes com mais organização e praticidade.',
  icons: {
    icon: '/LOGO_MINIMALISTA.png', // Define o favicon principal
    // apple: '/apple-touch-icon.png', // Você pode adicionar outros ícones aqui se necessário
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased font-inter">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
