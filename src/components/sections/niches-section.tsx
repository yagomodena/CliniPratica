
import { Card, CardContent } from '@/components/ui/card';

interface Niche {
  emoji: string;
  name: string;
  description?: string; // Optional: for more detail if needed in future
}

const niches: Niche[] = [
  { emoji: '👩‍⚕️', name: 'Psicologia' },
  { emoji: '🥗', name: 'Nutrição' },
  { emoji: '🏃‍♂️', name: 'Fisioterapia' },
  { emoji: '🦷', name: 'Odontologia' },
  { emoji: '🗣️', name: 'Fonoaudiologia' },
  { emoji: '💆', name: 'Estética e Terapias' },
  { emoji: '🧠', name: 'Terapia Ocupacional' },
  { emoji: '➕', name: 'E muitos outros!' },
];

export function NichesSection() {
  return (
    <section id="nichos" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Feito para profissionais de diversas áreas
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Nosso sistema é ideal para quem atende com hora marcada e precisa organizar agenda, pacientes e finanças de forma prática e eficiente.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {niches.map((niche, index) => (
            <Card
              key={index}
              className="bg-card shadow-lg hover:shadow-xl transition-shadow duration-300 group overflow-hidden"
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="text-5xl md:text-6xl mb-4 transition-transform duration-300 group-hover:scale-110">
                  {niche.emoji}
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-card-foreground">
                  {niche.name}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

