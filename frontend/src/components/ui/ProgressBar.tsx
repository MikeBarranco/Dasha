type ProgressBarProps = {
  raised: number;
  needed: number;
};

export function ProgressBar({ raised, needed }: ProgressBarProps) {
  const percent = needed > 0 ? Math.min(100, Math.round((raised / needed) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-cobalto">${raised.toLocaleString('es-MX')}</span>
        <span className="text-neutral-400">de ${needed.toLocaleString('es-MX')}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-exito" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
