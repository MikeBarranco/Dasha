type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-cobalto sm:text-4xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 max-w-2xl text-base text-neutral-500">{subtitle}</p> : null}
    </div>
  );
}
