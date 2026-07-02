import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  X,
  BadgeCheck,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Clock,
  CalendarDays,
  Award,
  Map as MapIcon,
} from 'lucide-react';
import { ShareButton } from '../ui/ShareButton';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { useSheetDismiss } from '../../lib/useSheetDismiss';
import { allyTypeLabels, type Ally } from '../../data/mockAllies';
import { whatsappUrl } from '../../lib/whatsapp';

type AllyDetailProps = {
  ally: Ally;
  onClose: () => void;
};

export function AllyDetail({ ally, onClose }: AllyDetailProps) {
  useLockBodyScroll();
  const navigate = useNavigate();
  const { dragControls, scrollRef, onPointerDown, onPointerMove, onDragEnd } =
    useSheetDismiss(onClose);
  const gallery = ally.gallery ?? [];
  const events = ally.events ?? [];
  const badges = ally.badges ?? [];
  const waLink = whatsappUrl(ally.whatsapp, `Hola ${ally.name}, los contacto desde la app Dasha.`);

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
          className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-1.5 w-10 -translate-x-1/2 rounded-full bg-neutral-300 sm:hidden"
          aria-hidden="true"
        />

        <div className="flex items-start justify-end gap-2 px-5 pt-5">
          <ShareButton
            title={`${ally.name} en Dasha`}
            text={`Conoce a ${ally.name}, ${allyTypeLabels[ally.orgType].toLowerCase()} aliada de Dasha.`}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-1">
          <div className="flex items-start gap-3">
            <img
              src={ally.logoUrl ?? '/placeholder-logo.svg'}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-logo.svg';
              }}
              className="h-16 w-16 flex-shrink-0 rounded-2xl border border-neutral-100 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-xl font-bold text-cobalto">{ally.name}</h2>
                {ally.isVerified && <BadgeCheck className="h-5 w-5 flex-shrink-0 text-info" />}
              </div>
              <span className="mt-1 inline-block rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
                {allyTypeLabels[ally.orgType]}
              </span>
            </div>
          </div>

          {ally.description && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">{ally.description}</p>
          )}

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            {ally.schedule && (
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
                {ally.schedule}
              </p>
            )}
            {ally.address && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
                {ally.address}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ally.phone && (
              <a
                href={`tel:${ally.phone}`}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Phone className="h-4 w-4" /> Llamar
              </a>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-exito px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {ally.website && (
              <a
                href={ally.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Globe className="h-4 w-4" /> Sitio web
              </a>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-cobalto">Fotos</p>
              <div className="flex gap-2 overflow-x-auto">
                {gallery.map((photo) => (
                  <img
                    key={photo}
                    src={photo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-logo.svg';
                    }}
                    className="h-28 w-40 flex-shrink-0 rounded-xl border border-neutral-100 object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Próximos eventos</p>
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={`${event.title}-${event.date}`}
                    className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3"
                  >
                    <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-naranja" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      <p className="text-xs text-neutral-400">
                        {event.date}
                        {event.place ? ` · ${event.place}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {badges.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Reconocimientos</p>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className="flex items-center gap-1.5 rounded-full bg-purpura/10 px-3 py-1.5 text-xs font-medium text-purpura"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(`/mapa?aliado=${ally.id}`)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MapIcon className="h-5 w-5" /> Ver en el mapa
          </button>
        </div>
      </motion.div>
    </div>
  );
}
