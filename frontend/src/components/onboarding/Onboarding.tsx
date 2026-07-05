import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { cn } from '../../lib/cn';
import { appSteps, type OnboardingStep } from './onboardingSteps';

const accentPanel: Record<OnboardingStep['accent'], string> = {
  cobalto: 'bg-cobalto/5',
  naranja: 'bg-naranja/5',
  purpura: 'bg-purpura/5',
};

const accentText: Record<OnboardingStep['accent'], string> = {
  cobalto: 'text-cobalto',
  naranja: 'text-naranja',
  purpura: 'text-purpura',
};

type OnboardingProps = {
  onClose: () => void;
  steps?: OnboardingStep[];
};

export function Onboarding({ onClose, steps = appSteps }: OnboardingProps) {
  useLockBodyScroll();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const next = () => {
    if (isLast) onClose();
    else setIndex((value) => value + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Saltar
          </button>
        </div>

        <div className="px-1 pt-1 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div
                className={cn(
                  'flex h-48 items-center justify-center rounded-3xl',
                  accentPanel[step.accent],
                )}
              >
                {step.image ? (
                  <img
                    src={step.image}
                    alt=""
                    className="h-40 w-40 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                ) : step.icon ? (
                  <step.icon className={cn('h-16 w-16', accentText[step.accent])} />
                ) : null}
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-cobalto">{step.title}</h2>
              <p className="mx-auto mt-2 max-w-xs text-base leading-relaxed text-neutral-600">
                {step.text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {steps.map((item, dotIndex) => (
            <span
              key={item.title}
              className={cn(
                'h-2 rounded-full transition-all',
                dotIndex === index ? 'w-6 bg-cobalto' : 'w-2 bg-neutral-200',
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          {isLast ? 'Empezar' : 'Siguiente'}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </motion.div>
    </div>
  );
}
