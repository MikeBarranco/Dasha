import { Share2, Check } from 'lucide-react';
import { useShare } from '../../lib/useShare';
import { cn } from '../../lib/cn';

type ShareButtonProps = {
  title: string;
  text: string;
  className?: string;
};

export function ShareButton({ title, text, className }: ShareButtonProps) {
  const { share, copied } = useShare(title, text);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={share}
        aria-label="Compartir"
        className="rounded-full bg-white/90 p-2 text-neutral-700 shadow transition-colors hover:bg-white"
      >
        {copied ? <Check className="h-5 w-5 text-exito" /> : <Share2 className="h-5 w-5" />}
      </button>
      {copied && (
        <span className="absolute right-0 top-12 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white shadow">
          Enlace copiado
        </span>
      )}
    </div>
  );
}
