import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Dog, Cat, ArrowLeft, Check } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { createReport, type CreateReportInput } from '../lib/api';
import { compressImage } from '../lib/image';
import { useAuth } from '../lib/useAuth';

const LocationPicker = lazy(() =>
  import('../components/map/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);

type Urgency = 'critica' | 'media' | 'baja';

const conditionOptions = ['Herido', 'Desnutrido', 'Enfermo', 'Asustado', 'Estable', 'Parece perdido'];
const sizes = ['Pequeño', 'Mediano', 'Grande'];
const colorOptions = ['Negro', 'Café', 'Blanco', 'Gris', 'Beige', 'Manchado'];

const conditionSeverity: Record<string, Urgency> = {
  Herido: 'critica',
  Desnutrido: 'media',
  Enfermo: 'media',
  Asustado: 'media',
  Estable: 'baja',
  'Parece perdido': 'baja',
};

const urgencyMeta: Record<Urgency, { label: string; chip: string }> = {
  critica: { label: 'Crítica', chip: 'bg-red-100 text-red-700' },
  media: { label: 'Media', chip: 'bg-orange-100 text-orange-700' },
  baja: { label: 'Baja', chip: 'bg-blue-100 text-blue-700' },
};

function computeUrgency(selected: string[]): Urgency | null {
  if (selected.length === 0) return null;
  if (selected.some((value) => conditionSeverity[value] === 'critica')) return 'critica';
  if (selected.some((value) => conditionSeverity[value] === 'media')) return 'media';
  return 'baja';
}

type SelectChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

function SelectChip({ label, selected, onClick }: SelectChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-cobalto bg-cobalto/10 text-cobalto'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
      )}
    >
      {label}
    </button>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'rounded-lg px-3 py-1 text-sm font-medium',
            value ? 'bg-cobalto text-white' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'rounded-lg px-3 py-1 text-sm font-medium',
            !value ? 'bg-cobalto text-white' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function ReportarPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [newReportId, setNewReportId] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [species, setSpecies] = useState<'perro' | 'gato' | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isAggressive, setIsAggressive] = useState(false);
  const [hasCollar, setHasCollar] = useState(false);

  const [lat, setLat] = useState(19.04);
  const [lng, setLng] = useState(-98.2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const urgency = computeUrgency(conditions);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  if (!account) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-naranja/10">
          <Camera className="h-9 w-9 text-naranja" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-cobalto">
          Inicia sesión para reportar
        </h2>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          Creamos tu cuenta en segundos para que tu reporte quede a tu nombre y le puedas dar
          seguimiento.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="rounded-xl bg-naranja py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-xl border border-neutral-200 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    );
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Preview original instantáneo
    setPhotoUrl(URL.createObjectURL(file));

    // Comprimir antes de enviar (peso ligero, evita el error 413).
    compressImage(file)
      .then(setPhotoBase64)
      .catch(() => setPhotoBase64(null));
  };

  const toggleCondition = (value: string) => {
    setConditions((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const resetForm = () => {
    setStep(1);
    setDone(false);
    setNewReportId(null);
    setPhotoUrl(null);
    setSpecies(null);
    setConditions([]);
    setSize(null);
    setColor(null);
    setDescription('');
    setIsAggressive(false);
    setHasCollar(false);
  };

  const handleSubmit = async () => {
    if (!photoBase64) {
      alert('Espera un momento a que la foto termine de procesarse.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateReportInput = {
        species: species === 'perro' ? 'dog' : 'cat',
        primaryColor: color || 'No especificado',
        size: size === 'Pequeño' ? 'small' : size === 'Grande' ? 'large' : 'medium',
        condition: conditions.includes('Herido')
          ? 'injured'
          : conditions.includes('Enfermo')
            ? 'sick'
            : 'lost',
        urgency: urgency === 'critica' ? 'critical' : urgency === 'media' ? 'medium' : 'low',
        description,
        lat,
        lng,
        photoBase64,
      };

      const created = await createReport(payload);
      setNewReportId(created?.id ?? null);
      setDone(true);
    } catch (error: any) {
      console.error('Failed to create report', error);
      alert('Error al publicar: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue =
    (step === 1 && photoUrl !== null) ||
    (step === 2 && species !== null && conditions.length > 0);

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 200 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-exito text-white"
        >
          <Check className="h-10 w-10" />
        </motion.div>
        <h2 className="mt-6 font-display text-2xl font-bold text-cobalto">¡Reporte publicado!</h2>
        <p className="mt-2 text-neutral-500">
          Avisamos a los voluntarios cercanos. Gracias por ayudar.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(newReportId ? `/mapa?reporte=${newReportId}` : '/mapa')}
            className="rounded-xl bg-cobalto px-5 py-3 font-medium text-white"
          >
            Ver mi reporte
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-neutral-200 px-5 py-3 text-neutral-600"
          >
            Reportar otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Reportar"
        subtitle="Toma una foto y comparte la ubicación de un animal que necesita ayuda."
      />

      <div className="mb-2 flex gap-2">
        {[1, 2, 3].map((value) => (
          <div
            key={value}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              value <= step ? 'bg-cobalto' : 'bg-neutral-200',
            )}
          />
        ))}
      </div>
      <p className="mb-5 text-sm font-medium text-neutral-400">Paso {step} de 3</p>

      {step === 1 && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoUrl ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <img src={photoUrl} alt="Foto del reporte" className="h-64 w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-cobalto hover:text-cobalto"
            >
              <Camera className="h-10 w-10" />
              <span className="text-sm font-medium">Tomar foto</span>
              <span className="text-xs text-neutral-400">
                Usa la cámara para reportar en el momento
              </span>
            </button>
          )}
          {photoUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-sm font-medium text-cobalto"
            >
              Retomar foto
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Especie</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSpecies('perro')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition-colors',
                  species === 'perro'
                    ? 'border-cobalto bg-cobalto/10 text-cobalto'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                <Dog className="h-5 w-5" /> Perro
              </button>
              <button
                type="button"
                onClick={() => setSpecies('gato')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition-colors',
                  species === 'gato'
                    ? 'border-cobalto bg-cobalto/10 text-cobalto'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                <Cat className="h-5 w-5" /> Gato
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              ¿Qué le ves? <span className="font-normal text-neutral-400">(toca las que apliquen)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((value) => (
                <SelectChip
                  key={value}
                  label={value}
                  selected={conditions.includes(value)}
                  onClick={() => toggleCondition(value)}
                />
              ))}
            </div>
            {urgency && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Urgencia estimada:</span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    urgencyMeta[urgency].chip,
                  )}
                >
                  {urgencyMeta[urgency].label}
                </span>
                <span className="text-xs text-neutral-400">(se calcula sola)</span>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Tamaño</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((value) => (
                <SelectChip
                  key={value}
                  label={value}
                  selected={size === value}
                  onClick={() => setSize(value)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Color principal <span className="font-normal text-neutral-400">(opcional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((value) => (
                <SelectChip
                  key={value}
                  label={value}
                  selected={color === value}
                  onClick={() => setColor(value)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <ToggleRow label="¿Es agresivo?" value={isAggressive} onChange={setIsAggressive} />
            <ToggleRow label="¿Lleva collar?" value={hasCollar} onChange={setHasCollar} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Descripción <span className="font-normal text-neutral-400">(opcional)</span>
            </p>
            <p className="mb-2 text-xs text-neutral-400">
              Entre más detalles, mejor: lugar exacto, comportamiento, si tiene dueño.
            </p>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Cuéntanos qué ves..."
              className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-cobalto focus:outline-none"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-3 text-sm text-neutral-600">
            Mueve el mapa para ubicar al animalito. El pin marca el lugar.
          </p>
          <Suspense
            fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-neutral-100" />}
          >
            <LocationPicker onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          </Suspense>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 rounded-xl border border-neutral-200 px-4 py-3 text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" /> Atrás
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canContinue}
            className={cn(
              'flex-1 rounded-xl py-3 font-semibold text-white transition-colors',
              canContinue ? 'bg-cobalto' : 'cursor-not-allowed bg-neutral-300',
            )}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "flex-1 rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90",
              isSubmitting ? 'bg-neutral-400 cursor-not-allowed' : 'bg-naranja'
            )}
          >
            {isSubmitting ? 'Publicando...' : 'Publicar reporte'}
          </button>
        )}
      </div>
    </div>
  );
}
