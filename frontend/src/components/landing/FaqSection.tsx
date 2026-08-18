import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './Reveal';

// Sexta sección: preguntas frecuentes en formato acordeón.
const faqs = [
  {
    q: '¿Cuánto cuesta usar Dasha?',
    a: 'Nada. Dasha es una plataforma gratuita para la comunidad de Puebla que quiere ayudar a los animales de calle.',
  },
  {
    q: '¿Necesito una cuenta para reportar?',
    a: 'Sí, y la creas en segundos con tu cuenta de Google. Así podemos avisarte del avance del rescate, evitar reportes duplicados y que puedas dar seguimiento, ser voluntario y participar en la comunidad.',
  },
  {
    q: '¿Quién atiende los reportes?',
    a: 'Voluntarios y aliados de la zona. Al aparecer en el mapa, quien está cerca puede responder y coordinarse para evitar duplicar esfuerzos.',
  },
  {
    q: '¿Funciona fuera de Puebla?',
    a: 'Por ahora nos enfocamos en Puebla para hacerlo bien. La plataforma está pensada para crecer a más ciudades.',
  },
  {
    q: '¿Cómo ayudo si no puedo rescatar?',
    a: 'Puedes apadrinar la recuperación de un animal, difundir reportes o sumarte como aliado si tienes una veterinaria o refugio.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-naranja sm:text-base">
            Dudas
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cobalto sm:text-4xl lg:text-5xl">
            Preguntas frecuentes
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-white/70 px-5 backdrop-blur-sm sm:px-7">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-display text-lg font-semibold text-cobalto sm:text-xl">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
