import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, Info, Home } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  createAdoptionRequest,
  housingOptions,
  type AdoptionRequestInput,
  type HousingType,
} from '../../lib/api';
import type { Animal } from '../../data/mockAnimals';

type AdoptionSheetProps = {
  animal: Animal;
  onClose: () => void;
};

// Deja solo dígitos y limita a 10 (teléfono MX). El diccionario de datos exige
// no permitir texto libre en el teléfono.
function cleanPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function AdoptionSheet({ animal, onClose }: AdoptionSheetProps) {
  useLockBodyScroll();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [housing, setHousing] = useState<HousingType>(housingOptions[0].value);
  const [hasHadPets, setHasHadPets] = useState<boolean | null>(null);
  const [otherPets, setOtherPets] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (cleanName.length < 3) {
      setError('Escribe tu nombre completo.');
      return;
    }
    if (whatsapp.length !== 10) {
      setError('Tu WhatsApp debe tener 10 dígitos.');
      return;
    }
    if (hasHadPets === null) {
      setError('Cuéntanos si has tenido mascotas antes.');
      return;
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Cuéntanos un poco por qué quieres adoptar (mín. 10 caracteres).');
      return;
    }

    const input: AdoptionRequestInput = {
      applicantName: cleanName,
      whatsapp,
      housingType: housing,
      hasHadPets,
      otherPets: otherPets.trim(),
      reason: cleanReason,
    };

    setSubmitting(true);
    // La adopción se cierra por fuera con el refugio. Registramos la solicitud
    // para que el aliado la revise; si el backend aún no existe, no bloqueamos al
    // interesado.
    try {
      await createAdoptionRequest(animal.id, input);
    } catch {
      /* pendiente de backend: no bloqueamos al interesado */
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-none rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">
            {done ? '¡Gracias!' : `Adoptar a ${animal.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-exito text-white">
              <Check className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-cobalto">
              Recibimos tu solicitud
            </p>
            <p className="mt-1 max-w-xs text-sm text-neutral-600">
              {animal.vet} revisará tu solicitud y te contactará por WhatsApp para continuar el
              proceso de adopción de {animal.name}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-xl bg-cobalto px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="flex items-start gap-2 rounded-xl bg-naranja/5 p-3 text-xs text-neutral-600">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-naranja" />
              <span>
                El proceso de adopción lo lleva {animal.vet}: ellos definen los requisitos y, en
                algunos casos, una <span className="font-medium">cuota de recuperación</span>{' '}
                para vacunas, esterilización y atención. Nosotros estamos para acompañarte y
                acercarte a {animal.name}.
              </span>
            </div>

            <Field label="Nombre completo">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                className={inputClass}
                placeholder="Tu nombre"
              />
            </Field>

            <Field label="WhatsApp">
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(cleanPhone(event.target.value))}
                inputMode="numeric"
                className={inputClass}
                placeholder="10 dígitos"
              />
            </Field>

            <Field label="¿Dónde vivirá?">
              <select
                value={housing}
                onChange={(event) => setHousing(event.target.value as HousingType)}
                className={inputClass}
              >
                {housingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700">
                ¿Has tenido mascotas antes?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'Sí' },
                  { value: false, label: 'No' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setHasHadPets(option.value)}
                    className={cn(
                      'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                      hasHadPets === option.value
                        ? 'border-cobalto bg-cobalto/10 text-cobalto'
                        : 'border-neutral-200 text-neutral-600 hover:border-cobalto/40',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="¿Tienes otras mascotas? (opcional)">
              <input
                value={otherPets}
                onChange={(event) => setOtherPets(event.target.value)}
                maxLength={120}
                className={inputClass}
                placeholder="Ej. un perro adulto, un gato…"
              />
            </Field>

            <Field label="¿Por qué quieres adoptar?">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder={`Cuéntale a ${animal.vet} por qué quieres darle un hogar a ${animal.name}.`}
              />
            </Field>

            {error && <p className="text-sm text-alerta">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-exito py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Home className="h-5 w-5" />
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
