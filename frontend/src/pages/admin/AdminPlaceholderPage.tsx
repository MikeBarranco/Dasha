import { Hammer } from 'lucide-react';

type AdminPlaceholderPageProps = {
  title: string;
};

export function AdminPlaceholderPage({ title }: AdminPlaceholderPageProps) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">{title}</h1>

      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
          <Hammer className="h-6 w-6" />
        </span>
        <p className="mt-3 font-semibold text-neutral-700">Sección en construcción</p>
        <p className="mt-1 max-w-xs text-sm text-neutral-500">
          Estamos preparando esta parte del panel. Estará lista muy pronto.
        </p>
      </div>
    </div>
  );
}
