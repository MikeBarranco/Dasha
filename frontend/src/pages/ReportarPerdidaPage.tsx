import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Dog, Cat, ArrowLeft, Check, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { createLostPetReport, type LostPetInput } from '../lib/lostPets';
import { compressImage } from '../lib/image';
import { useAuth } from '../lib/useAuth';
import { onlyDigits } from '../lib/validation';

const LocationPicker = lazy(() =>
  import('../components/map/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);

const sizes = ['Pequeño', 'Mediano', 'Grande'];
const colorOptions = ['Negro', 'Café', 'Blanco', 'Gris', 'Beige', 'Manchado'];
// La columna search_radius_km del backend es INTEGER: solo enteros. Nada de
// medios kilómetros (0.5 reventaba el INSERT con error 22P02).
const radiusOptions = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
];

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
          ? 'border-purpura bg-purpura/10 text-purpura'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
      )}
    >
      {label}
    </button>
  );
}

export function ReportarPerdidaPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState<'perro' | 'gato' | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState(account?.name ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [reward, setReward] = useState('');

  const [lat, setLat] = useState(19.04);
  const [lng, setLng] = useState(-98.2);
  const [searchRadiusKm, setSearchRadiusKm] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  if (!account) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purpura/10">
          <Search className="h-9 w-9 text-purpura" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-cobalto">
          Inicia sesión para publicar
        </h2>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          Creamos tu cuenta en segundos para que tu mascota perdida quede a tu nombre y la gente
          pueda contactarte.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="rounded-xl bg-purpura py-3 font-semibold text-white transition-opacity hover:opacity-90"
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

    setPhotoUrl(URL.createObjectURL(file));

    // Comprimir antes de enviar (peso ligero, evita el error 413).
    compressImage(file)
      .then(setPhotoBase64)
      .catch(() => setPhotoBase64(null));
  };

  const handleSubmit = async () => {
    if (!photoBase64) {
      alert('Espera un momento a que la foto termine de procesarse.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: LostPetInput = {
        petName: petName.trim(),
        species: species ?? 'perro',
        size: size ?? 'Mediano',
        color: color ?? 'No especificado',
        lastSeenAt,
        lat,
        lng,
        searchRadiusKm,
        description: description.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        reward: reward.trim(),
        photoBase64,
      };
      await createLostPetReport(payload);
      setDone(true);
    } catch (error) {
      console.error('Failed to create lost pet report', error);
      // Mostramos el motivo real del backend (si lo hay) en vez de un genérico,
      // para poder diagnosticar en lugar de quedarnos a ciegas.
      alert(error instanceof Error ? error.message : 'No se pudo publicar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const phoneValid = /^\d{10}$/.test(contactPhone.trim());

  const canContinue =
    (step === 1 && photoUrl !== null && petName.trim().length > 1 && species !== null) ||
    (step === 2 && contactName.trim().length > 1 && phoneValid);

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
        <h2 className="mt-6 font-display text-2xl font-bold text-cobalto">¡Publicado!</h2>
        <p className="mt-2 max-w-xs text-neutral-500">
          Avisaremos a la comunidad cercana a la última ubicación de {petName.trim() || 'tu mascota'}.
          Ojalá pronto vuelva a casa.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/mapa')}
            className="rounded-xl bg-cobalto px-5 py-3 font-medium text-white"
          >
            Ir al mapa
          </button>
          <button
            type="button"
            onClick={() => navigate('/perfil')}
            className="rounded-xl border border-neutral-200 px-5 py-3 text-neutral-600"
          >
            Mi perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Mascota perdida"
        subtitle="Comparte los datos de tu compañero para que la comunidad te ayude a encontrarlo."
      />

      <div className="mb-2 flex gap-2">
        {[1, 2, 3].map((value) => (
          <div
            key={value}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              value <= step ? 'bg-purpura' : 'bg-neutral-200',
            )}
          />
        ))}
      </div>
      <p className="mb-5 text-sm font-medium text-neutral-400">Paso {step} de 3</p>

      {step === 1 && (
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoUrl ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <img src={photoUrl} alt="Foto de la mascota" className="h-64 w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-purpura hover:text-purpura"
            >
              <Camera className="h-10 w-10" />
              <span className="text-sm font-medium">Sube una foto</span>
              <span className="text-xs text-neutral-400">
                Una foto clara ayuda a que la reconozcan
              </span>
            </button>
          )}
          {photoUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-purpura"
            >
              Cambiar foto
            </button>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Nombre de tu mascota
            </label>
            <input
              type="text"
              value={petName}
              onChange={(event) => setPetName(event.target.value)}
              maxLength={40}
              placeholder="Ej. Firulais"
              className="w-full rounded-xl border border-neutral-200 p-3 text-base focus:border-purpura focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Especie</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSpecies('perro')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition-colors',
                  species === 'perro'
                    ? 'border-purpura bg-purpura/10 text-purpura'
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
                    ? 'border-purpura bg-purpura/10 text-purpura'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                <Cat className="h-5 w-5" /> Gato
              </button>
            </div>
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
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              ¿Cuándo se perdió? <span className="font-normal text-neutral-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={lastSeenAt}
              onChange={(event) => setLastSeenAt(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 p-3 text-base text-neutral-700 focus:border-purpura focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Detalles que ayuden a reconocerlo{' '}
              <span className="font-normal text-neutral-400">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Señas, collar, comportamiento, si responde a su nombre..."
              className="w-full rounded-xl border border-neutral-200 p-3 text-base focus:border-purpura focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Tu nombre</label>
            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              maxLength={60}
              placeholder="¿Con quién se contactan?"
              className="w-full rounded-xl border border-neutral-200 p-3 text-base focus:border-purpura focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Teléfono de contacto
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value.replace(/\D/g, ''))}
              maxLength={10}
              placeholder="10 dígitos"
              className="w-full rounded-xl border border-neutral-200 p-3 text-base focus:border-purpura focus:outline-none"
            />
            {contactPhone.length > 0 && !phoneValid && (
              <p className="mt-1 text-xs text-alerta">El teléfono debe tener 10 dígitos.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Recompensa <span className="font-normal text-neutral-400">(opcional)</span>
            </label>
            {/* Monto en pesos: la columna del backend es DECIMAL(10,2), así que
                solo números y máximo 8 dígitos enteros (hasta 99,999,999). */}
            <div className="flex items-center rounded-xl border border-neutral-200 focus-within:border-purpura">
              <span className="pl-3 text-base text-neutral-400">$</span>
              <input
                type="text"
                value={reward}
                onChange={(event) => setReward(onlyDigits(event.target.value, 8))}
                inputMode="numeric"
                placeholder="Ej. 500"
                className="w-full rounded-xl bg-transparent p-3 text-base outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-3 text-sm text-neutral-600">
            Marca dónde lo viste por última vez. Mueve el mapa para ajustar el pin.
          </p>
          <Suspense
            fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-neutral-100" />}
          >
            <LocationPicker
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </Suspense>

          <div className="mt-5">
            <p className="mb-1 text-sm font-medium text-neutral-700">Zona de búsqueda</p>
            <p className="mb-2 text-xs text-neutral-400">
              Qué tan lejos pudo haberse alejado del punto marcado.
            </p>
            <div className="flex flex-wrap gap-2">
              {radiusOptions.map((option) => (
                <SelectChip
                  key={option.value}
                  label={option.label}
                  selected={searchRadiusKm === option.value}
                  onClick={() => setSearchRadiusKm(option.value)}
                />
              ))}
            </div>
          </div>
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
              canContinue ? 'bg-purpura' : 'cursor-not-allowed bg-neutral-300',
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
              'flex-1 rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90',
              isSubmitting ? 'cursor-not-allowed bg-neutral-400' : 'bg-purpura',
            )}
          >
            {isSubmitting ? 'Publicando...' : 'Publicar'}
          </button>
        )}
      </div>
    </div>
  );
}
