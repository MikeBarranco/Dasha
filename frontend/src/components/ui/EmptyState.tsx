type EmptyStateProps = {
  image?: string;
  title: string;
  message?: string;
  children?: React.ReactNode;
};

// Estado vacío reutilizable: ilustración opcional + título + mensaje.
export function EmptyState({ image, title, message, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
      {image && (
        <img src={image} alt="" className="mb-3 h-28 w-28 object-contain" aria-hidden="true" />
      )}
      <p className="font-semibold text-neutral-700">{title}</p>
      {message && <p className="mt-1 max-w-xs text-sm text-neutral-500">{message}</p>}
      {children}
    </div>
  );
}
