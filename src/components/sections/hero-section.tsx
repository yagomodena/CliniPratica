'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import nutriImage from '@/images/nutri.jpg';

export function HeroSection() {
  const handleCTAClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    const contactSection = document.getElementById('contato');
    if (contactSection) {
      const headerOffset = 80; 
      const elementPosition = contactSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section 
      id="inicio" 
      className="relative bg-gradient-to-br from-primary to-accent text-primary-foreground pt-32 pb-20 md:pt-40 md:pb-28 min-h-[calc(100vh-0px)] flex items-center"
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Acompanhe seus pacientes com mais <span className="text-white drop-shadow-md">organização</span> e <span className="text-white drop-shadow-md">praticidade</span>.
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-xl mx-auto md:mx-0">
              Agenda, prontuário, lembretes e muito mais — tudo em um só lugar.
            </p>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 shadow-lg group text-lg px-8 py-7"
              onClick={handleCTAClick}
              aria-label="Quero testar gratuitamente"
            >
              Quero testar gratuitamente
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          <div className="flex justify-center">
            <Image
              src={nutriImage}
              alt="Mockup do sistema CliniPrática"
              width={600}
              height={450}
              className="rounded-xl shadow-2xl object-cover"
              data-ai-hint="saas dashboard health"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
