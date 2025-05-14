
import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/sections/hero-section';
import { BenefitsSection } from '@/components/sections/benefits-section';
import { NichesSection } from '@/components/sections/niches-section';
import { PlansSection } from '@/components/sections/plans-section';
import { FaqSection } from '@/components/sections/faq-section';
// import { ContactSection } from '@/components/sections/contact-section'; // Removed ContactSection
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <BenefitsSection />
        <NichesSection />
        <PlansSection />
        <FaqSection />
        {/* <ContactSection /> */} {/* ContactSection removed from here */}
      </main>
      <Footer />
    </div>
  );
}
