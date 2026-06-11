import { User } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export function PerfilPage() {
  return (
    <div>
      <PageHeader title="Perfil" subtitle="Tu historial, tus medallas y tu nivel de voluntario." />
      <ComingSoon icon={User} message="Aquí irá tu perfil con medallas, niveles e historial." />
    </div>
  );
}
