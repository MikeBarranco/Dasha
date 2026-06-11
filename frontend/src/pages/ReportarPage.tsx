import { Camera } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export function ReportarPage() {
  return (
    <div>
      <PageHeader
        title="Reportar"
        subtitle="Toma una foto y comparte la ubicación de un animal que necesita ayuda."
      />
      <ComingSoon
        icon={Camera}
        message="Aquí irá el formulario para reportar con cámara y ubicación."
      />
    </div>
  );
}
