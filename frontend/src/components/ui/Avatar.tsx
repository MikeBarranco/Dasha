import { cn } from '../../lib/cn';

type AvatarProps = {
  name: string;
  src?: string;
  className?: string;
};

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('flex-shrink-0 rounded-full bg-neutral-100 object-cover', className)}
      />
    );
  }

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
