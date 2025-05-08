import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, History, FileUp, CalendarClock, Send, CheckCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    icon: UserPlus,
    title: 'Cadastro de Pacientes',
    description: 'Organize as informações dos seus pacientes de forma simples e segura.',
  },
  {
    icon: History,
    title: 'Histórico de Atendimentos',
    description: 'Acesse facilmente todo o histórico de consultas e evoluções.',
  },
  {
    icon: FileUp,
    title: 'Upload de Exames',
    description: 'Anexe exames e documentos importantes ao prontuário do paciente.',
  },
  {
    icon: CalendarClock,
    title: 'Agenda Inteligente',
    description: 'Gerencie seus horários e receba alertas para não perder compromissos.',
  },
  {
    icon: Send,
    title: 'Envio Automático de Mensagens',
    description: 'Configure lembretes e mensagens automáticas para seus pacientes.',
  },
  {
    icon: CheckCircle,
    title: 'Personalização Flexível',
    description: 'Adapte o sistema às necessidades específicas do seu consultório.',
  }
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Transforme a gestão do seu consultório
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          Descubra como o CliniPrática pode otimizar seu dia a dia e melhorar o atendimento aos seus pacientes.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <benefit.icon className="h-10 w-10 text-primary" />
                <CardTitle className="text-xl font-semibold text-card-foreground">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
