import { cn } from '../../lib/cn';

type AvatarProps = {
  name: string;
  className?: string;
};

export function Avatar({ name, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cobalto to-purpura font-semibold text-white',
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
