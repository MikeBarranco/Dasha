import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export function ComunidadPage() {
  return (
    <div>
      <PageHeader
        title="Comunidad"
        subtitle="Eventos de esterilización, vacunación y un foro con expertos."
      />
      <ComingSoon
        icon={CalendarDays}
        message="Aquí irán el calendario de eventos y el foro de la comunidad."
      />
    </div>
  );
}
