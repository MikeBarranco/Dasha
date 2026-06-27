import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { releaseNotes } from '../data/novedades';

export function NovedadesPage() {
  return (
    <div>
      <PageHeader title="Novedades" subtitle="Lo nuevo en cada versión de Dasha." />

      <div className="relative">
        <span
          className="absolute bottom-4 left-[17px] top-4 w-px bg-neutral-200"
          aria-hidden="true"
        />

        <div className="space-y-5">
          {releaseNotes.map((release, index) => {
            const latest = index === 0;
            return (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
                className="relative pl-12"
              >
                <span
                  className={cn(
                    'absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-lino',
                    latest ? 'bg-cobalto text-white' : 'bg-cobalto/10 text-cobalto',
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </span>

                <div
                  className={cn(
                    'rounded-2xl border bg-white p-5',
                    latest ? 'border-cobalto/30 shadow-sm' : 'border-neutral-200',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cobalto px-2.5 py-0.5 text-xs font-semibold text-white">
                      {release.version}
                    </span>
                    {latest && (
                      <span className="rounded-full bg-naranja/10 px-2.5 py-0.5 text-xs font-semibold text-naranja">
                        Más reciente
                      </span>
                    )}
                    <span className="text-xs text-neutral-400">{release.date}</span>
                  </div>

                  <h2 className="mt-1.5 font-display text-lg font-bold text-cobalto">
                    {release.title}
                  </h2>

                  <ul className="mt-3 space-y-2">
                    {release.changes.map((change) => (
                      <li key={change} className="flex gap-2 text-sm text-neutral-600">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-naranja" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
