import { Heart } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export function RehabilitacionPage() {
  return (
    <div>
      <PageHeader
        title="En rehabilitación"
        subtitle="Conoce a los animales rescatados y apadrina su recuperación."
      />
      <ComingSoon
        icon={Heart}
        message="Aquí irán los animales en rehabilitación y la opción de apadrinar."
      />
    </div>
  );
}
