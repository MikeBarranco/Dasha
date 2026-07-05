import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { releaseNotes, originStory } from '../data/novedades';
import { getNovedades } from '../lib/api';

export function NovedadesPage() {
  // Arranca con la lista estática (nunca en blanco) y, si Isabel ya expone
  // /novedades, la reemplaza con la versión administrada desde el panel.
  const [releases, setReleases] = useState(releaseNotes);

  useEffect(() => {
    let active = true;
    getNovedades()
      .then((data) => {
        if (active && data.length > 0) setReleases(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Novedades"
        subtitle="Todo lo que hemos construido en Dasha, versión por versión."
      />

      <div className="relative">
        {/* Línea del timeline: centrada bajo los puntos (16px = centro del punto). */}
        <span
          className="absolute bottom-6 left-4 top-3 w-px -translate-x-1/2 bg-neutral-200"
          aria-hidden="true"
        />

        <div className="space-y-5">
          {releases.map((release, index) => {
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
                    'absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-lino',
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

      {/* Historia de origen */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        className="mt-8 rounded-2xl border border-purpura/20 bg-purpura/5 p-6"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purpura/10 text-purpura">
            <Heart className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-bold text-purpura">{originStory.title}</h2>
        </div>
        <div className="mt-3 space-y-3">
          {originStory.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-neutral-600">
              {paragraph}
            </p>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
