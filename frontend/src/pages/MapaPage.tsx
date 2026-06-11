import { MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

const stats = [
  { label: 'Reportes activos', value: '128' },
  { label: 'Rescates logrados', value: '342' },
  { label: 'Voluntarios', value: '57' },
];

export function MapaPage() {
  return (
    <div>
      <PageHeader
        title="Mapa de rescates"
        subtitle="Visualiza los animales que necesitan ayuda en Puebla, por colonia y por urgencia."
      />

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="font-display text-2xl font-bold text-cobalto">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-gradient-to-br from-cobalto/5 to-purpura/5 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalto text-white">
          <MapPin className="h-7 w-7" />
        </span>
        <p className="mt-4 max-w-sm text-sm text-neutral-500">
          Aquí vivirá el mapa interactivo de Puebla con los pines de cada rescate. Lo construimos en
          el siguiente paso.
        </p>
      </div>
    </div>
  );
}
