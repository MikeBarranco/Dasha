import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  BadgeCheck,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Clock,
  CalendarDays,
  Award,
  PawPrint,
  Map as MapIcon,
} from 'lucide-react';
import { ShareButton } from '../components/ui/ShareButton';
import { Avatar } from '../components/ui/Avatar';
import { getAllies } from '../lib/api';
import { mockAllies, allyTypeLabels, type Ally } from '../data/mockAllies';
import { whatsappUrl } from '../lib/whatsapp';

export function AllyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [allies, setAllies] = useState<Ally[] | null>(null);

  useEffect(() => {
    let active = true;
    getAllies()
      .then((data) => {
        if (active) setAllies(data.length > 0 ? data : mockAllies);
      })
      .catch(() => {
        if (active) setAllies(mockAllies);
      });
    return () => {
      active = false;
    };
  }, []);

  if (allies === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-44 animate-pulse rounded-3xl bg-neutral-100" />
        <div className="mt-4 h-6 w-2/3 animate-pulse rounded-full bg-neutral-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-neutral-100" />
      </div>
    );
  }

  const ally = allies.find((item) => item.id === id) ?? null;

  if (!ally) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-semibold text-neutral-700">No encontramos este aliado</p>
        <p className="mt-1 text-sm text-neutral-500">Puede que ya no esté disponible.</p>
        <Link
          to="/aliados"
          className="mt-4 inline-block rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ver todos los aliados
        </Link>
      </div>
    );
  }

  const team = ally.team ?? [];
  const animals = ally.animals ?? [];
  const events = ally.events ?? [];
  const badges = ally.badges ?? [];
  const waLink = whatsappUrl(ally.whatsapp, `Hola ${ally.name}, los contacto desde la app Dasha.`);

  return (
    <motion.div
      className="mx-auto max-w-2xl pb-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-full py-1 pr-3 text-sm font-medium text-neutral-600 transition-colors hover:text-cobalto"
        >
          <ChevronLeft className="h-5 w-5" /> Volver
        </button>
        <ShareButton
          title={`${ally.name} en Dasha`}
          text={`Conoce a ${ally.name}, ${allyTypeLabels[ally.orgType].toLowerCase()} aliada de Dasha.`}
        />
      </div>

      <div className="relative h-40 overflow-hidden rounded-3xl sm:h-56">
        {ally.coverUrl ? (
          <img
            src={ally.coverUrl}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cobalto via-cobalto to-purpura" />
        )}
      </div>

      <div className="px-1">
        <div className="-mt-10 flex items-end gap-3">
          <img
            src={ally.logoUrl ?? '/placeholder-logo.svg'}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/placeholder-logo.svg';
            }}
            className="h-20 w-20 flex-shrink-0 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"
          />
          <span className="mb-1 inline-block rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
            {allyTypeLabels[ally.orgType]}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="font-display text-2xl font-bold text-cobalto">{ally.name}</h1>
          {ally.isVerified && <BadgeCheck className="h-5 w-5 flex-shrink-0 text-info" />}
        </div>
        {ally.slogan && <p className="mt-1 text-sm font-medium text-naranja">{ally.slogan}</p>}
        {ally.description && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{ally.description}</p>
        )}

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

        {(ally.schedule || ally.address) && (
          <div className="mt-4 space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
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
        )}

        {team.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-cobalto">Nuestro equipo</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
                >
                  <Avatar
                    name={member.name}
                    src={member.photoUrl ?? undefined}
                    className="h-12 w-12 text-base"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-800">{member.name}</p>
                    <p className="text-xs font-medium text-cobalto">{member.title}</p>
                    {member.bio && (
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{member.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {animals.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-cobalto">
              Animales que atienden
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {animals.map((animal) => (
                <Link
                  key={animal.id}
                  to="/rehabilitacion"
                  className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-cobalto/40"
                >
                  <div className="relative h-24 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={animal.photo}
                      alt={animal.name}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/placeholder-animal.svg';
                      }}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-neutral-800">{animal.name}</p>
                    <p className="flex items-center gap-1 text-xs text-neutral-500">
                      <PawPrint className="h-3 w-3 flex-shrink-0 text-cobalto" />
                      {animal.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-cobalto">Próximos eventos</h2>
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
          </section>
        )}

        {badges.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-cobalto">Reconocimientos</h2>
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
          </section>
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
  );
}
