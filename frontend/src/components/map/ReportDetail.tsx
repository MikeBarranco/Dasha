import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Navigation,
  Clock,
  MapPin,
  Maximize2,
  Radio,
  HeartHandshake,
  HelpCircle,
  Flag,
  Check,
  Bell,
  BellRing,
  HandHeart,
  Loader2,
} from 'lucide-react';
import { ShareButton } from '../ui/ShareButton';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { useSheetDismiss } from '../../lib/useSheetDismiss';
import { useAuth } from '../../lib/useAuth';
import {
  acceptReport,
  reportStreetReport,
  followReport,
  unfollowReport,
  getMyOrganization,
  postReportOffer,
  getReportDetail,
  type OfferResourceType,
  type ReportDetailData,
} from '../../lib/api';
import { cn } from '../../lib/cn';
import type { Report, Severity } from '../../data/mockReports';

// Tipos de recurso que un aliado puede ofrecer, con etiqueta en español.
const offerResourceOptions: { value: OfferResourceType; label: string }[] = [
  { value: 'medical_service', label: 'Consulta o servicio médico' },
  { value: 'money', label: 'Dinero' },
  { value: 'food', label: 'Alimento' },
  { value: 'transport', label: 'Transporte' },
  { value: 'foster', label: 'Hogar temporal' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'other', label: 'Otro' },
];

function resourceTypeLabel(value: string): string {
  return offerResourceOptions.find((option) => option.value === value)?.label ?? 'Ayuda';
}

// "hace X" a partir de una fecha ISO, para saber cuánto lleva reportado / cuándo
// se vio por última vez.
function sinceLabel(iso: string): string {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

const REPORTED_STORAGE_KEY = 'dasha:reportes:reportados';

// Motivos para denunciar un reporte de calle (foto de internet, broma, etc.).
const reportReasons = [
  'Foto falsa o de internet',
  'No hay ningún animal ahí',
  'Contenido inapropiado',
  'Otro',
];

// Recuerda qué reportes denunció este usuario, para que el "Reportado" siga tras
// refrescar (el backend aún no expone si el usuario ya denunció un reporte).
function loadReportedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORTED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

const severityLabel: Record<Severity, string> = {
  critica: 'Urgencia crítica',
  media: 'Urgencia media',
  baja: 'Urgencia baja',
};

const severityClasses: Record<Severity, string> = {
  critica: 'bg-red-100 text-red-700',
  media: 'bg-orange-100 text-orange-700',
  baja: 'bg-blue-100 text-blue-700',
};

type ReportDetailProps = {
  report: Report;
  onClose: () => void;
};

export function ReportDetail({ report, onClose }: ReportDetailProps) {
  useLockBodyScroll();
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const [showPhoto, setShowPhoto] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [showVolInfo, setShowVolInfo] = useState(false);
  const { dragControls, scrollRef, onPointerDown, onPointerMove, onDragEnd } =
    useSheetDismiss(onClose);

  const isVolunteer = account?.role === 'volunteer' || account?.role === 'admin';

  // Detalle enriquecido (fotos originales + avistamientos + ofertas). Se pide al
  // abrir la ficha; el listado del mapa no trae estos campos.
  const [detail, setDetail] = useState<ReportDetailData | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let active = true;
    getReportDetail(report.id)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [report.id]);

  // Fotos del carrusel: las del detalle (originales + avistamientos); si el
  // detalle aún no carga, al menos la foto principal del listado.
  const detailPhotos = (detail?.photos ?? []).filter(
    (url) => url && url !== '/placeholder-animal.svg',
  );
  const galleryPhotos = detailPhotos.length > 0 ? detailPhotos : [report.photo];
  const heroPhoto = galleryPhotos[Math.min(heroIndex, galleryPhotos.length - 1)] ?? report.photo;

  // Cuánto lleva en la calle: del reporte al último avistamiento.
  const lastSightingAt = (detail?.sightings ?? [])
    .map((sighting) => sighting.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const reportedSince = detail?.createdAt ? sinceLabel(detail.createdAt) : '';
  const lastSeenSince = lastSightingAt ? sinceLabel(lastSightingAt) : '';
  const offers = detail?.offers ?? [];

  // Seguir el reporte: recibir push cuando cambie de estado. Optimista.
  const [following, setFollowing] = useState(Boolean(report.isFollowing));
  const toggleFollow = () => {
    if (!account) {
      navigate('/login');
      return;
    }
    const next = !following;
    setFollowing(next);
    const action = next ? followReport(report.id) : unfollowReport(report.id);
    action.catch(() => setFollowing(!next));
  };

  // Oferta del aliado: solo si el usuario en sesión pertenece a una organización.
  // Preguntamos al backend al abrir la ficha (una vez, solo con sesión).
  const [isAlly, setIsAlly] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerType, setOfferType] = useState<OfferResourceType>('medical_service');
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    let active = true;
    getMyOrganization()
      .then((ctx) => {
        if (active) setIsAlly(Boolean(ctx));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [account]);

  const offerReady = offerTitle.trim().length >= 3 && offerDescription.trim().length >= 5;

  const submitOffer = async () => {
    if (!offerReady || offerSaving) return;
    setOfferSaving(true);
    setOfferError(null);
    try {
      await postReportOffer(report.id, {
        title: offerTitle,
        description: offerDescription,
        resourceType: offerType,
      });
      setOfferSent(true);
      setOffering(false);
      // Refresca el detalle para que la oferta recién enviada salga en la lista.
      getReportDetail(report.id)
        .then((data) => setDetail(data))
        .catch(() => {});
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'No se pudo enviar la oferta.');
    } finally {
      setOfferSaving(false);
    }
  };

  // Denuncia del reporte (falso / foto de internet). POST /reports/:id/report.
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportDetail, setReportDetail] = useState('');
  const [reported, setReported] = useState(() => loadReportedIds().has(report.id));
  const reportNeedsDetail = reportReason === 'Otro';
  const reportReady = !reportNeedsDetail || reportDetail.trim().length >= 3;

  const openReport = () => {
    if (!account) {
      navigate('/login');
      return;
    }
    setReportReason(reportReasons[0]);
    setReportDetail('');
    setReporting(true);
  };

  const submitReport = () => {
    if (!reportReady) return;
    setReported(true);
    const next = new Set(loadReportedIds()).add(report.id);
    try {
      localStorage.setItem(REPORTED_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // sin acceso al almacenamiento: al menos queda marcado en esta sesión
    }
    reportStreetReport(
      report.id,
      reportReason,
      reportNeedsDetail ? reportDetail.trim() : undefined,
    ).catch(() => {});
    setReporting(false);
  };

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const assignment = await acceptReport(report.id);
      onClose();
      navigate(assignment?.id ? `/rescate/${assignment.id}` : '/mapa');
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'No se pudo aceptar el caso.');
      setAccepting(false);
    }
  };

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
              src={heroPhoto}
              alt={report.condition}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="h-56 w-full object-cover"
            />
          </button>
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${severityClasses[report.severity]}`}
          >
            {severityLabel[report.severity]}
          </span>
          <ShareButton
            title={`Reporte de rescate en ${report.colonia}`}
            text={`${report.species === 'perro' ? 'Perro' : 'Gato'} · ${report.condition}. Ayúdalo en Dasha.`}
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

        {/* Carrusel: fotos originales del reporte + las de los avistamientos. */}
        {galleryPhotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3">
            {galleryPhotos.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setHeroIndex(index)}
                className={cn(
                  'h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                  index === heroIndex ? 'border-cobalto' : 'border-transparent',
                )}
              >
                <img
                  src={url}
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
          <h2 className="font-display text-xl font-bold text-cobalto">
            {report.species === 'perro' ? 'Perro' : 'Gato'} · {report.condition}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Visto {report.reportedAgo}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {report.colonia}
            </span>
          </div>

          {/* Cuánto lleva en la calle: reportado + último avistamiento. */}
          {reportedSince && (
            <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              En seguimiento: reportado {reportedSince}
              {lastSeenSince && lastSeenSince !== reportedSince
                ? ` · visto por última vez ${lastSeenSince}`
                : ''}
              .
            </p>
          )}

          <p className="mt-3 text-sm text-neutral-600">{report.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              Estado: {report.status}
            </span>
            <button
              type="button"
              onClick={toggleFollow}
              aria-pressed={following}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                following
                  ? 'bg-cobalto/10 text-cobalto'
                  : 'border border-neutral-200 text-neutral-600 hover:border-cobalto/40 hover:text-cobalto',
              )}
            >
              {following ? (
                <>
                  <BellRing className="h-3.5 w-3.5" /> Siguiendo
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5" /> Seguir
                </>
              )}
            </button>
          </div>
          {following && (
            <p className="mt-1.5 text-xs text-neutral-400">
              Te avisaremos cuando este reporte cambie de estado.
            </p>
          )}

          <div className="mt-5">
            {report.activeAssignmentId ? (
              // Ya hay un traslado en curso: cualquiera puede seguirlo en vivo.
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/rescate/${report.activeAssignmentId}`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Radio className="h-5 w-5" /> Ver rescate en vivo
              </button>
            ) : isVolunteer ? (
              // Voluntario aprobado (o admin): puede tomar el caso.
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-naranja py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Navigation className="h-5 w-5" /> {accepting ? 'Aceptando…' : 'Voy en camino'}
                </button>
                {acceptError && <p className="mt-2 text-sm text-alerta">{acceptError}</p>}
              </>
            ) : (
              // Ciudadano o sin sesión: invitación a ser voluntario + ayuda.
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(account ? '/ser-voluntario' : '/login')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <HeartHandshake className="h-5 w-5" /> Conviértete en voluntario
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVolInfo((value) => !value)}
                    aria-label="¿Qué es ser voluntario?"
                    aria-expanded={showVolInfo}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                {showVolInfo && (
                  <p className="mt-2 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
                    Un voluntario valida su identidad y puede tomar casos como este: recoge al
                    animalito y lo lleva con un aliado (veterinaria o refugio). Tú decides cuándo
                    ayudar; cualquiera puede volverse voluntario.
                  </p>
                )}
              </>
            )}
          </div>

          {offers.length > 0 && (
            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-cobalto">
                <HandHeart className="h-4 w-4" /> Aliados que ofrecen ayuda
              </p>
              <ul className="mt-2 space-y-2">
                {offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="rounded-xl border border-cobalto/15 bg-cobalto/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-neutral-800">
                        {offer.title}
                      </p>
                      <span className="flex-shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-cobalto">
                        {resourceTypeLabel(offer.resourceType)}
                      </span>
                    </div>
                    {offer.description && (
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                        {offer.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] font-medium text-neutral-400">
                      {offer.organizationName}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAlly &&
            (offerSent ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-exito/5 py-2.5 text-sm font-medium text-exito">
                <Check className="h-4 w-4" /> Enviaste tu oferta de ayuda. ¡Gracias!
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setOffering(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cobalto/30 py-2.5 text-sm font-semibold text-cobalto transition-colors hover:bg-cobalto/5"
              >
                <HandHeart className="h-4 w-4" /> Ofrecer ayuda de mi aliado
              </button>
            ))}

          <div className="mt-4 border-t border-neutral-100 pt-3 text-center">
            {reported ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                <Flag className="h-3.5 w-3.5" /> Reporte denunciado
              </span>
            ) : (
              <button
                type="button"
                onClick={openReport}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-alerta"
              >
                <Flag className="h-3.5 w-3.5" /> Reportar este aviso
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {offering && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (offerSaving ? undefined : setOffering(false))}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-cobalto">Ofrecer ayuda</h3>
              <button
                type="button"
                onClick={() => setOffering(false)}
                disabled={offerSaving}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Desde tu aliado, ofrece algo para este animalito. El voluntario y el ciudadano lo
              verán en el reporte.
            </p>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Tipo de ayuda</span>
                <select
                  value={offerType}
                  onChange={(event) => setOfferType(event.target.value as OfferResourceType)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                >
                  {offerResourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Título</span>
                <input
                  value={offerTitle}
                  onChange={(event) => setOfferTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Ej. Cubrimos la revisión"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Detalle</span>
                <textarea
                  value={offerDescription}
                  onChange={(event) => setOfferDescription(event.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Si un voluntario lo trae a nuestra clínica, cubrimos la primera revisión."
                  className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                />
              </label>
            </div>
            {offerError && <p className="mt-2 text-sm text-alerta">{offerError}</p>}
            <button
              type="button"
              onClick={submitOffer}
              disabled={!offerReady || offerSaving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {offerSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                'Enviar oferta'
              )}
            </button>
          </div>
        </div>
      )}

      {reporting && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setReporting(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-cobalto">Reportar este aviso</h3>
              <button
                type="button"
                onClick={() => setReporting(false)}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Cuéntanos por qué. Un administrador lo revisará.
            </p>
            <div className="mt-3 space-y-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    reportReason === reason
                      ? 'border-cobalto bg-cobalto/5 font-medium text-cobalto'
                      : 'border-neutral-200 text-neutral-600 hover:border-cobalto/40',
                  )}
                >
                  {reason}
                  {reportReason === reason && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
            {reportNeedsDetail && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Cuéntanos brevemente el motivo
                </label>
                <textarea
                  value={reportDetail}
                  onChange={(event) => setReportDetail(event.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Describe por qué reportas este aviso…"
                  className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                />
              </div>
            )}
            <button
              type="button"
              onClick={submitReport}
              disabled={!reportReady}
              className="mt-4 w-full rounded-xl bg-alerta py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Enviar reporte
            </button>
          </div>
        </div>
      )}

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
              src={heroPhoto}
              alt={report.condition}
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
