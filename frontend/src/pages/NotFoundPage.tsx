import { useNavigate } from 'react-router-dom';
import { Compass, MapPin } from 'lucide-react';

// Red de seguridad de las rutas: cualquier URL que no coincida con ninguna
// pantalla (por ejemplo /rescate/ sin id) cae aquí en vez de quedar en blanco.
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-lino px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="font-display text-xl font-bold text-cobalto">No encontramos esta página</h1>
      <p className="max-w-xs text-sm text-neutral-500">
        El enlace no existe o ya no está disponible. Volvamos a un lugar seguro.
      </p>
      <button
        type="button"
        onClick={() => navigate('/mapa')}
        className="mt-2 flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <MapPin className="h-4 w-4" /> Ir al mapa
      </button>
    </div>
  );
}
