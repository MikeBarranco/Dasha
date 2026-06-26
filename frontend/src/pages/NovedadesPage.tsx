import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { releaseNotes } from '../data/novedades';

export function NovedadesPage() {
  return (
    <div>
      <PageHeader title="Novedades" subtitle="Lo nuevo en cada versión de Dasha." />

      <div className="space-y-4">
        {releaseNotes.map((release, index) => (
          <motion.div
            key={release.version}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
            className="rounded-2xl border border-neutral-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cobalto px-2.5 py-0.5 text-xs font-semibold text-white">
                    {release.version}
                  </span>
                  <span className="text-xs text-neutral-400">{release.date}</span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-cobalto">{release.title}</h2>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {release.changes.map((change) => (
                <li key={change} className="flex gap-2 text-sm text-neutral-600">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-naranja" />
                  {change}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
