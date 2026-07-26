import { RefreshCw } from 'lucide-react';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  // Por defecto usa la ilustración "sin internet"; se puede cambiar.
  image?: string;
};

// Estado de error de carga reutilizable: ilustración + título + mensaje + botón
// de reintentar. Unifica los bloques de "No pudimos cargar…" de las pantallas.
export function ErrorState({
  title = 'No pudimos cargar esto',
  message = 'Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
  image = '/illustrations/error-sin-internet.webp',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
      <img src={image} alt="" aria-hidden="true" className="mb-3 h-28 w-28 object-contain" />
      <p className="font-semibold text-neutral-700">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      )}
    </div>
  );
}
