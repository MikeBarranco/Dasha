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
  Landmark,
  Copy,
  Check,
  HeartHandshake,
  HandHeart,
  AlertCircle,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { ShareButton } from '../components/ui/ShareButton';
import { Avatar } from '../components/ui/Avatar';
import { getAlly, getOrganizationNeeds } from '../lib/api';
import { mockAllies, allyTypeLabels, type Ally } from '../data/mockAllies';
import { needTypeLabels, type Need } from '../data/needs';
import { whatsappUrl } from '../lib/whatsapp';

export function AllyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // undefined = cargando; null = no encontrado; objeto = aliado.
  const [ally, setAlly] = useState<Ally | null | undefined>(() => (id ? undefined : null));
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [needs, setNeeds] = useState<Need[]>([]);

  const loadAlly = (isActive: () => boolean) => {
    if (!id) return;
    getAlly(id)
      .then((data) => {
        if (!isActive()) return;
        // La vista previa del portal (admin) usa un aliado de EJEMPLO por id: solo
        // para ese caso conservamos el mock. Para un aliado real, si no viene, es
        // "no encontrado" de verdad.
        setAlly(data ?? mockAllies.find((item) => item.id === id) ?? null);
      })
      .catch(() => {
        if (!isActive()) return;
        const preview = mockAllies.find((item) => item.id === id);
        if (preview) setAlly(preview);
        else setError(true);
      });
  };

  useEffect(() => {
    let active = true;
    loadAlly(() => active);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Necesidades activas del aliado (GET /organizations/:id/needs). Van aparte del
  // aliado en sí; si el endpoint no responde o no hay, la sección simplemente no
  // aparece (no rompe el perfil).
  useEffect(() => {
    if (!id) return;
    let active = true;
    getOrganizationNeeds(id)
      .then((data) => {
        if (active) setNeeds(data);
      })
      .catch(() => {
        if (active) setNeeds([]);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const retryLoad = () => {
    setError(false);
    setAlly(undefined);
    loadAlly(() => true);
  };

  if (error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-alerta" />
        <p className="mt-3 font-semibold text-neutral-700">No pudimos cargar este aliado</p>
        <p className="mt-1 text-sm text-neutral-500">Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  if (ally === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-44 animate-pulse rounded-3xl bg-neutral-100" />
        <div className="mt-4 h-6 w-2/3 animate-pulse rounded-full bg-neutral-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-neutral-100" />
      </div>
    );
  }

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
  const payment = ally.paymentInfo ?? null;
  const hasPayment = Boolean(payment && (payment.bank || payment.accountHolder || payment.clabe));
  const waLink = whatsappUrl(ally.whatsapp, `Hola ${ally.name}, los contacto desde la app Dasha.`);
  const openNeeds = needs.filter((need) => need.status === 'open');

  const copyClabe = async () => {
    if (!payment?.clabe) return;
    try {
      await navigator.clipboard.writeText(payment.clabe);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles; no es crítico.
    }
  };

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

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
        <div className="h-28 w-full sm:h-36">
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
        <div className="px-4 pb-4">
          <img
            src={ally.logoUrl ?? '/placeholder-logo.svg'}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/placeholder-logo.svg';
            }}
            className="-mt-9 h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-display text-2xl font-bold text-cobalto">{ally.name}</h1>
            {ally.isVerified && <BadgeCheck className="h-5 w-5 flex-shrink-0 text-info" />}
            <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
              {allyTypeLabels[ally.orgType]}
            </span>
          </div>
          {ally.slogan && (
            <p className="mt-1.5 text-sm font-medium text-naranja">{ally.slogan}</p>
          )}
        </div>
      </div>

      <div className="px-1">
        {ally.description && (
          <p className="mt-4 break-words text-sm leading-relaxed text-neutral-600">
            {ally.description}
          </p>
        )}

        {ally.promo && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-naranja/30 bg-naranja/5 p-3.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-naranja/10 text-naranja">
              <Tag className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-naranja">Promoción</p>
              <p className="mt-0.5 break-words text-sm leading-relaxed text-neutral-700">
                {ally.promo}
              </p>
            </div>
          </div>
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

        {hasPayment && payment && (
          <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-cobalto">
              <HeartHandshake className="h-4 w-4" /> Cómo donar
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Transfiere directo a la cuenta del aliado. Dasha no cobra comisiones.
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              {payment.bank && (
                <div className="flex items-center gap-2 text-neutral-700">
                  <Landmark className="h-4 w-4 flex-shrink-0 text-cobalto" />
                  <dt className="sr-only">Banco</dt>
                  <dd className="font-medium">{payment.bank}</dd>
                </div>
              )}
              {payment.accountHolder && (
                <div>
                  <dt className="text-xs text-neutral-400">Titular</dt>
                  <dd className="font-medium text-neutral-700">{payment.accountHolder}</dd>
                </div>
              )}
              {payment.clabe && (
                <div>
                  <dt className="text-xs text-neutral-400">CLABE</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono tracking-wide text-neutral-800">{payment.clabe}</span>
                    <button
                      type="button"
                      onClick={copyClabe}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-exito" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? 'Copiada' : 'Copiar'}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {openNeeds.length > 0 && (
          <section className="mt-4 rounded-2xl border border-naranja/20 bg-naranja/5 p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-cobalto">
              <HandHeart className="h-4 w-4" /> Necesidades actuales
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Apoyos concretos que este aliado necesita ahora. Contáctalos para ayudar.
            </p>
            <ul className="mt-3 space-y-2">
              {openNeeds.map((need) => (
                <li key={need.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
                      {needTypeLabels[need.type]}
                    </span>
                    {need.quantity && (
                      <span className="text-xs font-medium text-neutral-500">{need.quantity}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-800">{need.title}</p>
                  {need.description && (
                    <p className="mt-0.5 text-sm text-neutral-600">{need.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
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
