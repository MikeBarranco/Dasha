import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Clock, Maximize2, MessageCircle, Phone, Search, Gift } from 'lucide-react';
import { ShareButton } from '../ui/ShareButton';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { useSheetDismiss } from '../../lib/useSheetDismiss';
import { whatsappUrl } from '../../lib/whatsapp';
import { type LostPet, daysLost, lostColor } from '../../data/mockLostPets';

type LostPetDetailProps = {
  pet: LostPet;
  onClose: () => void;
};

export function LostPetDetail({ pet, onClose }: LostPetDetailProps) {
  useLockBodyScroll();
  const [showPhoto, setShowPhoto] = useState(false);
  const { dragControls, scrollRef, onPointerDown, onPointerMove, onDragEnd } =
    useSheetDismiss(onClose);

  const days = daysLost(pet.lostAt);
  const species = pet.species === 'perro' ? 'Perro' : 'Gato';
  const waLink = whatsappUrl(
    pet.contactPhone,
    `Hola, vi el reporte de ${pet.petName} en Dasha. ¿Puedo ayudar?`,
  );

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
        <div
          className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/90 shadow-sm sm:hidden"
          aria-hidden="true"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPhoto(true)}
            className="block w-full"
            aria-label="Ver foto completa"
          >
            <img
              src={pet.photo}
              alt={pet.petName}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="h-56 w-full object-cover"
            />
          </button>
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-neutral-900"
            style={{ backgroundColor: lostColor(pet.lostAt) }}
          >
            Perdido hace {days} {days === 1 ? 'día' : 'días'}
          </span>
          <ShareButton
            title={`${pet.petName} está perdido`}
            text={`Ayuda a encontrar a ${pet.petName} (${species}) en Dasha.`}
            url={`/mapa?perdido=${pet.id}`}
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
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
            <Maximize2 className="h-3.5 w-3.5" /> Ver foto
          </span>
        </div>

        <div className="p-5">
          <h2 className="font-display text-xl font-bold text-cobalto">{pet.petName}</h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Perdido hace {days} {days === 1 ? 'día' : 'días'}
            </span>
            <span className="flex items-center gap-1">
              {/* Capado a 1 km para ser consistente con el circulo del mapa (datos viejos podian traer 3-5 km) */}
              <Search className="h-4 w-4" /> Zona de búsqueda de {Math.min(pet.searchRadiusKm || 1, 1)} km
            </span>
          </div>

          <div className="mt-2 inline-flex rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            {species}
          </div>

          {pet.reward && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-naranja/10 px-3 py-2 text-sm font-medium text-naranja">
              <Gift className="h-4 w-4 flex-shrink-0" />
              <span>Recompensa: {pet.reward}</span>
            </div>
          )}

          {pet.description && (
            <p className="mt-3 text-sm text-neutral-600">{pet.description}</p>
          )}

          {(waLink || pet.contactPhone) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-exito py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              )}
              {pet.contactPhone && (
                <a
                  href={`tel:${pet.contactPhone}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <Phone className="h-5 w-5" /> Llamar
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showPhoto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPhoto(false)}
          >
            <img
              src={pet.photo}
              alt={pet.petName}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setShowPhoto(false)}
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
