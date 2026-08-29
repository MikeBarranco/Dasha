import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Heart,
  Gift,
  Stethoscope,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Home,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import { ShareButton } from '../ui/ShareButton';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { useSheetDismiss } from '../../lib/useSheetDismiss';
import { useAuth } from '../../lib/useAuth';
import { useFollowAnimal } from '../../lib/useFollowAnimal';
import { DonationSheet } from './DonationSheet';
import { AdoptionSheet } from './AdoptionSheet';
import type { Animal } from '../../data/mockAnimals';

const medLabel: Record<string, string> = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  tratamiento: 'Tratamiento',
  cirugia: 'Cirugía',
  peso: 'Peso',
  otro: 'Otro',
};

type AnimalDetailProps = {
  animal: Animal;
  onClose: () => void;
};

export function AnimalDetail({ animal, onClose }: AnimalDetailProps) {
  useLockBodyScroll();
  const total = animal.photos.length;
  // La ficha abre en la PRIMERA foto (portada elegida por el aliado, orderIndex 0),
  // igual que la miniatura de la lista de rehabilitación.
  const [activePhoto, setActivePhoto] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [donationMode, setDonationMode] = useState<'money' | 'items' | null>(null);
  const [showAdoption, setShowAdoption] = useState(false);
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const { following, toggle: toggleFollow } = useFollowAnimal(animal.id);

  const onFollow = () => {
    if (!account) {
      navigate('/login');
      return;
    }
    toggleFollow();
  };

  const onAdopt = () => {
    if (!account) {
      navigate('/login');
      return;
    }
    setShowAdoption(true);
  };

  const onDonate = (mode: 'money' | 'items') => {
    if (!account) {
      navigate('/login');
      return;
    }
    setDonationMode(mode);
  };
  const touchStartX = useRef(0);
  const multiTouch = useRef(false);
  const photo = animal.photos[activePhoto];
  // "Momento" de la foto activa (En la calle / Avistamiento / En rehabilitación /
  // Con su familia) para el álbum estilo galería; puede no existir en fotos viejas.
  const moment = animal.album?.[activePhoto]?.moment;
  const { dragControls, scrollRef, onPointerDown, onPointerMove, onHandlePointerDown, onDragEnd } =
    useSheetDismiss(onClose);

  const goNext = () => setActivePhoto((index) => (index + 1) % total);
  const goPrev = () => setActivePhoto((index) => (index - 1 + total) % total);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        ref={scrollRef}
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto overscroll-none rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onDragEnd={onDragEnd}
      >
        {/* Tirador para cerrar arrastrando en celular. touch-none evita que el
            navegador haga scroll mientras se arrastra; el area es amplia para que
            sea facil de agarrar. En escritorio (sm:) se oculta. */}
        <div
          onPointerDown={onHandlePointerDown}
          className="absolute left-1/2 top-0 z-20 flex h-8 w-20 -translate-x-1/2 touch-none cursor-grab items-start justify-center pt-2.5 sm:hidden"
          aria-hidden="true"
        >
          <div className="h-1.5 w-10 rounded-full bg-white/90 shadow-sm" />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFull(true)}
            className="block w-full"
            aria-label="Ver foto completa"
          >
            <img
              src={photo}
              alt={animal.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="h-64 w-full object-cover"
            />
          </button>
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-cobalto">
            {animal.status}
          </span>
          {moment && (
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
              {moment}
            </span>
          )}
          <ShareButton
            title={`${animal.name} en Dasha`}
            text={`Conoce a ${animal.name}, ${animal.status.toLowerCase()}. Apóyalo en Dasha.`}
            className="absolute right-14 top-3 z-10"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto px-5 pt-4">
            {animal.photos.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setActivePhoto(index)}
                className={cn(
                  'h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2',
                  index === activePhoto ? 'border-cobalto' : 'border-transparent',
                )}
              >
                <img
                  src={item}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-cobalto">{animal.name}</h2>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {animal.gender && (
                <span className="rounded-full bg-cobalto/10 px-3 py-1 text-xs font-medium text-cobalto">
                  {animal.gender === 'macho' ? 'Macho' : 'Hembra'}
                </span>
              )}
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                {animal.species === 'perro' ? 'Perro' : 'Gato'}
              </span>
            </div>
          </div>

          {animal.story && <p className="mt-3 text-sm text-neutral-600">{animal.story}</p>}

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            <p className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-cobalto" /> {animal.diagnosis}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cobalto" /> {animal.vet}
            </p>
          </div>

          {/* La barra de apadrinamiento solo aparece si el aliado fijó un costo
              (totalNeeded > 0). Sin costo no se muestra (no un $0 de $0). */}
          {animal.totalNeeded > 0 && (
            <div className="mt-5">
              <ProgressBar raised={animal.totalRaised} needed={animal.totalNeeded} />
            </div>
          )}

          {animal.timeline && animal.timeline.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Seguimiento</p>
              <ol className="space-y-3">
                {animal.timeline.map((event, index) => (
                  <li key={`${index}-${event.title}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cobalto" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      {event.when && <p className="text-xs text-neutral-400">{event.when}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {animal.medical &&
            (animal.medical.sterilized || animal.medical.entries.length > 0) && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-cobalto">Cartilla médica</p>
                {animal.medical.sterilized && (
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-exito/10 px-3 py-1 text-xs font-medium text-exito">
                    <ShieldCheck className="h-3.5 w-3.5" /> Esterilizado
                  </span>
                )}
                {animal.medical.entries.length > 0 && (
                  <ul className="space-y-2">
                    {animal.medical.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 rounded-xl border border-neutral-200 p-3"
                      >
                        <span className="mt-0.5 flex-shrink-0 rounded-full bg-cobalto/10 px-2 py-0.5 text-[11px] font-medium text-cobalto">
                          {medLabel[entry.type] ?? 'Otro'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-700">{entry.title}</p>
                          {entry.date && <p className="text-xs text-neutral-400">{entry.date}</p>}
                          {entry.notes && (
                            <p className="mt-0.5 text-xs text-neutral-500">{entry.notes}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onFollow}
              aria-pressed={following}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors',
                following
                  ? 'border-cobalto bg-cobalto/10 text-cobalto'
                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
              )}
            >
              <Bell className={cn('h-5 w-5', following && 'fill-cobalto')} />
              {following ? 'Siguiendo · te avisaremos' : `Seguir a ${animal.name}`}
            </button>
            {animal.status === 'Buscando hogar' && (
              <button
                type="button"
                onClick={onAdopt}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-exito py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Home className="h-5 w-5" /> Quiero adoptar a {animal.name}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onDonate('money')}
                className="flex items-center justify-center gap-2 rounded-xl bg-purpura py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Heart className="h-5 w-5" /> Apadrinar
              </button>
              <button
                type="button"
                onClick={() => onDonate('items')}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Gift className="h-5 w-5" /> Donar cosas
              </button>
            </div>
            <p className="text-center text-xs text-neutral-400">
              Apadrina con la cantidad que quieras. También puedes donar croquetas, transporte u
              hogar temporal.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {donationMode && (
          <DonationSheet
            animal={animal}
            initialMode={donationMode}
            onClose={() => setDonationMode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdoption && (
          <AdoptionSheet animal={animal} onClose={() => setShowAdoption(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFull && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFull(false)}
          >
            <img
              src={photo}
              alt={animal.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              onClick={(event) => event.stopPropagation()}
              onTouchStart={(event) => {
                if (event.touches.length > 1) {
                  multiTouch.current = true;
                  return;
                }
                multiTouch.current = false;
                touchStartX.current = event.changedTouches[0].clientX;
              }}
              onTouchEnd={(event) => {
                // Si fue un pellizco (dos dedos para hacer zoom) o todavia hay
                // un dedo en la pantalla, no cambiamos de foto.
                if (multiTouch.current || event.touches.length > 0) {
                  if (event.touches.length === 0) multiTouch.current = false;
                  return;
                }
                if (total <= 1) return;
                const deltaX = event.changedTouches[0].clientX - touchStartX.current;
                if (deltaX > 50) goPrev();
                else if (deltaX < -50) goNext();
              }}
              className="max-h-full max-w-full rounded-xl object-contain"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {activePhoto + 1} / {total}
                </span>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowFull(false)}
              aria-label="Cerrar foto"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
