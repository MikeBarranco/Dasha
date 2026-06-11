import type { LucideIcon } from 'lucide-react';

type ComingSoonProps = {
  icon: LucideIcon;
  message: string;
};

export function ComingSoon({ icon: Icon, message }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white/60 px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalto/10 text-cobalto">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 max-w-sm text-sm text-neutral-500">{message}</p>
    </div>
  );
}
