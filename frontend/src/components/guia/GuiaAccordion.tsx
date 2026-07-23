import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Check, X, Truck } from 'lucide-react';
import { guiaSituaciones } from '../../data/guiaSituaciones';

type GuiaAccordionProps = {
  // Situación abierta al montar. Si no se pasa, abre la primera.
  defaultOpenId?: string | null;
};

// Lista de situaciones de primeros auxilios (acordeón). Se comparte entre la
// página /guia y la hoja que se abre desde Reportar, para no duplicar contenido.
export function GuiaAccordion({ defaultOpenId }: GuiaAccordionProps) {
  const initialId =
    defaultOpenId && guiaSituaciones.some((item) => item.id === defaultOpenId)
      ? defaultOpenId
      : (guiaSituaciones[0]?.id ?? null);
  const [openId, setOpenId] = useState<string | null>(initialId);

  return (
    <div className="space-y-3">
      {guiaSituaciones.map((situacion) => {
        const open = openId === situacion.id;
        const Icon = situacion.icon;
        return (
          <div
            key={situacion.id}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : situacion.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold text-neutral-800">
                  {situacion.title}
                </span>
              </span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-4 pb-4">
                    <p className="text-sm italic text-neutral-500">{situacion.intro}</p>

                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-exito">
                        <Check className="h-3.5 w-3.5" /> Qué hacer
                      </p>
                      <ul className="space-y-1.5">
                        {situacion.hacer.map((paso) => (
                          <li key={paso} className="flex gap-2 text-sm text-neutral-700">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-exito" />
                            {paso}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-alerta">
                        <X className="h-3.5 w-3.5" /> Qué NO hacer
                      </p>
                      <ul className="space-y-1.5">
                        {situacion.evitar.map((paso) => (
                          <li key={paso} className="flex gap-2 text-sm text-neutral-700">
                            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-alerta" />
                            {paso}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 rounded-xl bg-neutral-50 p-3">
                      <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium">Cómo trasladarlo: </span>
                        {situacion.transportar}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
