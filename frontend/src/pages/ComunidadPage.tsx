import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  MapPin,
  Heart,
  MessageCircle,
  ImagePlus,
  Send,
  X,
  Check,
  Flag,
  LifeBuoy,
  ChevronRight,
  Loader2,
  CornerDownRight,
  Search,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ShareButton } from '../components/ui/ShareButton';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';
import { useAuth } from '../lib/useAuth';
import { compressImage } from '../lib/image';
import { containsBannedWord } from '../lib/textFilter';
import {
  getEvents,
  rsvpEvent,
  getForumPosts,
  createForumPost,
  likeForumPost,
  reportForumPost,
  reportForumReply,
  getForumReplies,
  createForumReply,
} from '../lib/api';
import type { CommunityEvent, ForumPost, ForumReply } from '../data/mockComunidad';

const REPORTED_STORAGE_KEY = 'dasha:foro:reportados';
const REPORTED_REPLIES_STORAGE_KEY = 'dasha:foro:reportados-comentarios';

// Recuerda qué publicaciones/comentarios reportó este usuario, para que el
// "Reportado" siga ahí tras refrescar (el backend aún no expone si el usuario ya
// reportó un comentario).
function loadReportedFrom(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

// Objetivo del modal de reporte: una publicación o un comentario.
type ReportTarget = { kind: 'post' | 'reply'; id: string };

type Tab = 'eventos' | 'foro';

const reportReasons = ['Contenido ofensivo', 'Spam o publicidad', 'Información falsa', 'Otro'];

export function ComunidadPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'foro' ? 'foro' : 'eventos');

  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  // Evento a resaltar cuando se llega con ?evento=id (desde el perfil del aliado).
  const [highlightEvent, setHighlightEvent] = useState<string | null>(null);
  // Buscador y filtro por tipo para la lista de eventos.
  const [eventQuery, setEventQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  // Avisos de moderación (lenguaje / anti-spam) del compositor y del comentario.
  const [postError, setPostError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportDetail, setReportDetail] = useState('');
  const [reportedIds, setReportedIds] = useState<Set<string>>(() =>
    loadReportedFrom(REPORTED_STORAGE_KEY),
  );
  const [reportedReplyIds, setReportedReplyIds] = useState<Set<string>>(() =>
    loadReportedFrom(REPORTED_REPLIES_STORAGE_KEY),
  );

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, ForumReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => {
        if (!active) return;
        setEvents(data);
        // "Me interesa" debe seguir marcado tras refrescar: iniciamos "interested"
        // con los eventos que el backend dice que este usuario ya marcó.
        const mine = data.filter((event) => event.isInterested).map((event) => event.id);
        if (mine.length) {
          setInterested((current) => new Set([...current, ...mine]));
        }
        // Deep link a un evento concreto (?evento=id), desde el perfil del aliado:
        // abre la pestaña de eventos, hace scroll a la tarjeta y la resalta un momento.
        const eventId = new URLSearchParams(window.location.search).get('evento');
        if (eventId && data.some((event) => event.id === eventId)) {
          setTab('eventos');
          setHighlightEvent(eventId);
          window.setTimeout(() => {
            document
              .getElementById(`event-${eventId}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
          window.setTimeout(() => setHighlightEvent(null), 2500);
        }
      })
      .catch(() => active && setEvents([]));
    getForumPosts()
      .then((data) => {
        if (!active) return;
        setPosts(data);
        // El backend marca en cada post si el usuario ya lo reportó; lo unimos a
        // lo que recordamos localmente para que "Reportado" sea consistente.
        const reported = data.filter((post) => post.hasReported).map((post) => post.id);
        if (reported.length) {
          setReportedIds((current) => new Set([...current, ...reported]));
        }
        // El corazón debe seguir encendido tras refrescar: iniciamos "liked" con
        // los posts que el backend dice que este usuario ya likeó.
        const likedByMe = data.filter((post) => post.likedByMe).map((post) => post.id);
        if (likedByMe.length) {
          setLiked((current) => new Set([...current, ...likedByMe]));
        }
        // Deep link a una publicación concreta (?post=id): abre el foro y sus
        // comentarios. Se hace aquí (no en un efecto) porque depende de que los
        // posts ya cargaron.
        const postId = new URLSearchParams(window.location.search).get('post');
        const target = postId ? data.find((p) => p.id === postId) : undefined;
        if (!target) return;
        setTab('foro');
        setOpenComments(target.id);
        setRepliesByPost((current) => ({ ...current, [target.id]: target.replies ?? [] }));
        setLoadingReplies(target.id);
        getForumReplies(target.id)
          .then((list) => {
            if (!active) return;
            setRepliesByPost((current) => ({
              ...current,
              [target.id]: list.length > 0 ? list : (target.replies ?? current[target.id] ?? []),
            }));
          })
          .finally(() => active && setLoadingReplies(null));
      })
      .catch(() => active && setPosts([]));
    return () => {
      active = false;
    };
  }, []);

  // Cambia de pestaña y refleja la elección en la URL, para que compartir/enlazar
  // el foro no lleve a eventos (deep links distintos por pestaña).
  const changeTab = (option: Tab) => {
    setTab(option);
    const next = new URLSearchParams(searchParams);
    next.set('tab', option);
    setSearchParams(next, { replace: true });
  };

  const onInterested = (id: string) => {
    if (!account) {
      navigate('/login');
      return;
    }
    if (interested.has(id)) return;
    setInterested((current) => new Set(current).add(id));
    setEvents((list) =>
      list ? list.map((e) => (e.id === id ? { ...e, interested: e.interested + 1 } : e)) : list,
    );
    rsvpEvent(id).catch(() => {});
  };

  const onLike = (id: string) => {
    if (!account) {
      navigate('/login');
      return;
    }
    // El like del backend es un toggle: si ya lo di, este llamado lo quita.
    const wasLiked = liked.has(id);
    setLiked((current) => {
      const next = new Set(current);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setPosts((list) =>
      list
        ? list.map((p) =>
            p.id === id ? { ...p, likes: Math.max(0, p.likes + (wasLiked ? -1 : 1)) } : p,
          )
        : list,
    );
    likeForumPost(id).catch(() => {});
  };

  const openReport = (target: ReportTarget) => {
    if (!account) {
      navigate('/login');
      return;
    }
    setReportReason(reportReasons[0]);
    setReportDetail('');
    setReportTarget(target);
  };

  const reportNeedsDetail = reportReason === 'Otro';
  const reportReady = !reportNeedsDetail || reportDetail.trim().length >= 3;

  // Marca el id como reportado en el set indicado y lo persiste, para que el
  // "Reportado" siga tras refrescar.
  const rememberReported = (
    setReported: React.Dispatch<React.SetStateAction<Set<string>>>,
    storageKey: string,
    id: string,
  ) => {
    setReported((current) => {
      const next = new Set(current).add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // sin acceso al almacenamiento: al menos queda marcado en esta sesión
      }
      return next;
    });
  };

  const submitReport = () => {
    const target = reportTarget;
    if (!target || !reportReady) return;
    const detail = reportNeedsDetail ? reportDetail.trim() : undefined;
    if (target.kind === 'post') {
      rememberReported(setReportedIds, REPORTED_STORAGE_KEY, target.id);
      reportForumPost(target.id, reportReason, detail).catch(() => {});
    } else {
      rememberReported(setReportedReplyIds, REPORTED_REPLIES_STORAGE_KEY, target.id);
      reportForumReply(target.id, reportReason, detail).catch(() => {});
    }
    setReportTarget(null);
    setReportDetail('');
  };

  // Trae las respuestas del backend; si el GET aún no existe (devuelve vacío),
  // conserva las embebidas en la publicación para no borrar lo que ya se veía.
  const loadReplies = async (post: ForumPost) => {
    setLoadingReplies(post.id);
    try {
      const list = await getForumReplies(post.id);
      setRepliesByPost((current) => ({
        ...current,
        [post.id]: list.length > 0 ? list : (post.replies ?? current[post.id] ?? []),
      }));
    } finally {
      setLoadingReplies(null);
    }
  };

  const toggleComments = (post: ForumPost) => {
    if (openComments === post.id) {
      setOpenComments(null);
      return;
    }
    setOpenComments(post.id);
    setReplyText('');
    setReplyError(null);
    // Muestra de inmediato las embebidas y refresca desde el backend.
    if (!repliesByPost[post.id]) {
      setRepliesByPost((current) => ({ ...current, [post.id]: post.replies ?? [] }));
    }
    void loadReplies(post);
  };

  const sendReply = async (postId: string) => {
    if (!account) {
      navigate('/login');
      return;
    }
    const clean = replyText.trim();
    if (clean.length < 1 || sendingReply) return;
    if (containsBannedWord(clean)) {
      setReplyError('Cuidemos el tono de la comunidad. Evita groserías o insultos.');
      return;
    }
    setReplyError(null);
    setSendingReply(true);
    const optimistic: ForumReply = {
      id: `local-${Date.now()}`,
      author: account.name ?? 'Tú',
      role: 'Vecino',
      timeAgo: 'hace un momento',
      text: clean,
    };
    setRepliesByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), optimistic],
    }));
    setPosts((list) =>
      list ? list.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p)) : list,
    );
    setReplyText('');
    try {
      await createForumReply(postId, clean);
    } catch (error) {
      // Rechazado (lenguaje o anti-spam): quitamos el comentario optimista, el
      // contador y avisamos el motivo.
      setRepliesByPost((current) => ({
        ...current,
        [postId]: (current[postId] ?? []).filter((r) => r.id !== optimistic.id),
      }));
      setPosts((list) =>
        list
          ? list.map((p) =>
              p.id === postId ? { ...p, comments: Math.max(0, p.comments - 1) } : p,
            )
          : list,
      );
      setReplyError(error instanceof Error ? error.message : 'No se pudo comentar. Intenta de nuevo.');
    } finally {
      setSendingReply(false);
    }
  };


  const pickPhoto = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      setPhoto(await compressImage(files[0]));
    } catch {
      setPhoto(null);
    }
  };

  const publish = async () => {
    const clean = text.trim();
    if (clean.length < 3 || posting) return;
    // Filtro de lenguaje del lado del cliente: avisa al instante sin llamar al
    // backend. El servidor revalida igual (por si alguien evita esta pantalla).
    if (containsBannedWord(clean)) {
      setPostError('Cuidemos el tono de la comunidad. Evita groserías o insultos.');
      return;
    }
    setPostError(null);
    setPosting(true);
    const optimistic: ForumPost = {
      id: `local-${Date.now()}`,
      author: account?.name ?? 'Tú',
      role: 'Vecino',
      timeAgo: 'hace un momento',
      text: clean,
      image: photo ?? undefined,
      likes: 0,
      comments: 0,
    };
    setPosts((list) => [optimistic, ...(list ?? [])]);
    try {
      await createForumPost({ text: clean, ...(photo ? { imageBase64: photo } : {}) });
      setText('');
      setPhoto(null);
    } catch (error) {
      // El backend rechazó (lenguaje o anti-spam): quitamos el optimista y
      // mostramos el motivo, dejando el texto para que el usuario lo corrija.
      setPosts((list) => (list ? list.filter((p) => p.id !== optimistic.id) : list));
      setPostError(error instanceof Error ? error.message : 'No se pudo publicar. Intenta de nuevo.');
    } finally {
      setPosting(false);
    }
  };

  // Tipos presentes (para los chips de filtro) y eventos ya filtrados por
  // tipo + búsqueda por nombre.
  const eventTypes = events ? Array.from(new Set(events.map((event) => event.type))) : [];
  const shownEvents = events
    ? events.filter(
        (event) =>
          (eventTypeFilter === '' || event.type === eventTypeFilter) &&
          (eventQuery.trim() === '' ||
            event.title.toLowerCase().includes(eventQuery.trim().toLowerCase())),
      )
    : null;

  return (
    <div>
      <PageHeader
        title="Comunidad"
        subtitle="Eventos de esterilización, vacunación y adopción, y un foro para ayudarnos entre todos."
      />

      <Link
        to="/guia"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-cobalto/20 bg-cobalto/5 px-4 py-3 transition-colors hover:bg-cobalto/10"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-cobalto">
            Guía: qué hacer mientras llega ayuda
          </span>
          <span className="block text-xs text-neutral-500">
            Pasos seguros para ayudar a un animalito herido o asustado.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-400" />
      </Link>

      <div className="mb-5 inline-flex rounded-xl bg-neutral-100 p-1">
        {(['eventos', 'foro'] as Tab[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => changeTab(option)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === option ? 'bg-white text-cobalto shadow-sm' : 'text-neutral-500',
            )}
          >
            {option === 'eventos' ? 'Eventos' : 'Foro'}
          </button>
        ))}
      </div>

      {tab === 'eventos' ? (
        <div className="space-y-4">
          {events !== null && events.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={eventQuery}
                  onChange={(event) => setEventQuery(event.target.value)}
                  placeholder="Buscar evento por nombre"
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                />
              </div>
              {eventTypes.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEventTypeFilter('')}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      eventTypeFilter === ''
                        ? 'border-cobalto bg-cobalto text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
                    )}
                  >
                    Todos
                  </button>
                  {eventTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventTypeFilter(type)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        eventTypeFilter === type
                          ? 'border-cobalto bg-cobalto text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {events === null &&
            [0, 1].map((index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-neutral-100" />
            ))}

          {events !== null && events.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center">
              <img
                src="/illustrations/vacio-eventos.webp"
                alt=""
                aria-hidden="true"
                className="mx-auto h-28 w-28 object-contain"
              />
              <p className="mt-2 font-semibold text-neutral-700">Aún no hay eventos</p>
              <p className="mt-1 text-sm text-neutral-500">
                Pronto habrá jornadas y ferias de la comunidad.
              </p>
            </div>
          )}

          {events !== null && events.length > 0 && shownEvents?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-8 text-center text-sm text-neutral-500">
              No hay eventos que coincidan con tu búsqueda.
            </p>
          )}

          {shownEvents?.map((event, index) => {
            const isInterested = interested.has(event.id);
            return (
              <motion.article
                key={event.id}
                id={`event-${event.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-white transition-shadow',
                  highlightEvent === event.id
                    ? 'border-cobalto ring-2 ring-cobalto/40'
                    : 'border-neutral-200',
                )}
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setZoomImage(event.image)}
                    aria-label="Ver la imagen completa"
                    className="block w-full"
                  >
                    <img
                      src={event.image}
                      alt={event.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder-animal.svg';
                      }}
                      className="h-40 w-full object-cover"
                    />
                  </button>
                  <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-cobalto">
                    {event.type}
                  </span>
                  {/* Compartir: copia/comparte el enlace directo a este evento. */}
                  <ShareButton
                    title={`${event.title} · Dasha`}
                    text={`Evento en Dasha: ${event.title}${event.date ? ` (${event.date})` : ''}`}
                    url={`/comunidad?tab=eventos&evento=${event.id}`}
                    className="absolute right-3 top-3"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold text-cobalto">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                    {event.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" /> {event.date}
                      </span>
                    )}
                    {event.place && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {event.place}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-2 text-sm text-neutral-600">{event.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">{event.interested} interesados</span>
                    <button
                      type="button"
                      onClick={() => onInterested(event.id)}
                      disabled={isInterested}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                        isInterested
                          ? 'bg-exito/10 text-exito'
                          : 'bg-cobalto text-white hover:opacity-90',
                      )}
                    >
                      {isInterested ? (
                        <>
                          <Check className="h-4 w-4" /> Te interesa
                        </>
                      ) : (
                        'Me interesa'
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {account ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <textarea
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  if (postError) setPostError(null);
                }}
                maxLength={500}
                rows={3}
                placeholder="Comparte algo con la comunidad…"
                className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
              {photo && (
                <div className="relative mt-2">
                  <img src={photo} alt="" className="h-40 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label="Quitar foto"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                  <ImagePlus className="h-4 w-4" /> Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => pickPhoto(event.target.files)}
                  />
                </label>
                <button
                  type="button"
                  onClick={publish}
                  disabled={text.trim().length < 3 || posting}
                  className="flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> {posting ? 'Publicando…' : 'Publicar'}
                </button>
              </div>
              {postError && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-alerta">
                  <Flag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {postError}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-6 text-center">
              <p className="text-sm text-neutral-600">Inicia sesión para publicar en el foro.</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-3 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Iniciar sesión
              </button>
            </div>
          )}

          {posts === null &&
            [0, 1].map((index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
            ))}

          {posts !== null && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 font-semibold text-neutral-700">El foro está en silencio</p>
              <p className="mt-1 text-sm text-neutral-500">Sé el primero en publicar algo.</p>
            </div>
          )}

          {posts?.map((post, index) => {
            const isLiked = liked.has(post.id);
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={post.author} className="h-10 w-10 text-sm" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">{post.author}</p>
                    <p className="text-xs text-neutral-400">
                      {post.role} · {post.timeAgo}
                    </p>
                  </div>
                </div>
                <p className="mt-3 break-words text-sm text-neutral-600">{post.text}</p>
                {post.image && (
                  <button
                    type="button"
                    onClick={() => setZoomImage(post.image ?? null)}
                    className="relative mt-3 block w-full overflow-hidden rounded-xl"
                    aria-label="Ver foto completa"
                  >
                    <img
                      src={post.image}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="h-48 w-full object-cover"
                    />
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                      Ver foto
                    </span>
                  </button>
                )}
                <div className="mt-3 flex items-center gap-5 text-sm text-neutral-500">
                  <button
                    type="button"
                    onClick={() => onLike(post.id)}
                    className={cn(
                      'flex items-center gap-1.5 transition-colors',
                      isLiked ? 'text-naranja' : 'hover:text-naranja',
                    )}
                  >
                    <Heart className={cn('h-4 w-4', isLiked && 'fill-naranja')} /> {post.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleComments(post)}
                    aria-expanded={openComments === post.id}
                    className={cn(
                      'flex items-center gap-1.5 transition-colors hover:text-cobalto',
                      openComments === post.id && 'text-cobalto',
                    )}
                  >
                    <MessageCircle className="h-4 w-4" /> {post.comments}
                  </button>
                  {reportedIds.has(post.id) ? (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-400">
                      <Flag className="h-4 w-4" /> Reportado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openReport({ kind: 'post', id: post.id })}
                      aria-label="Reportar publicación"
                      className="ml-auto text-neutral-400 transition-colors hover:text-alerta"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {openComments === post.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 border-t border-neutral-100 pt-3">
                        {loadingReplies === post.id && !(repliesByPost[post.id]?.length) ? (
                          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando comentarios…
                          </p>
                        ) : repliesByPost[post.id]?.length ? (
                          <ul className="space-y-3">
                            {repliesByPost[post.id].map((reply) => (
                              <li key={reply.id} className="flex gap-2">
                                <CornerDownRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-neutral-300" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-neutral-400">
                                    <span className="font-semibold text-neutral-600">
                                      {reply.author}
                                    </span>{' '}
                                    · {reply.role} · {reply.timeAgo}
                                  </p>
                                  <p className="mt-0.5 break-words text-sm text-neutral-600">
                                    {reply.text}
                                  </p>
                                </div>
                                {/* Los comentarios optimistas (id local-) aún no existen en
                                    el backend, no se pueden denunciar todavía. */}
                                {!reply.id.startsWith('local-') &&
                                  (reportedReplyIds.has(reply.id) ? (
                                    <Flag
                                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-300"
                                      aria-label="Comentario reportado"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openReport({ kind: 'reply', id: reply.id })}
                                      aria-label="Reportar comentario"
                                      className="mt-0.5 flex-shrink-0 text-neutral-300 transition-colors hover:text-alerta"
                                    >
                                      <Flag className="h-3.5 w-3.5" />
                                    </button>
                                  ))}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            Sé el primero en comentar esta publicación.
                          </p>
                        )}

                        {account ? (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(event) => {
                                setReplyText(event.target.value);
                                if (replyError) setReplyError(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') sendReply(post.id);
                              }}
                              maxLength={300}
                              placeholder="Escribe un comentario…"
                              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                            />
                            <button
                              type="button"
                              onClick={() => sendReply(post.id)}
                              disabled={replyText.trim().length < 1 || sendingReply}
                              aria-label="Enviar comentario"
                              className="flex flex-shrink-0 items-center justify-center rounded-xl bg-cobalto p-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {sendingReply ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : null}
                        {account && replyError && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-alerta">
                            <Flag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {replyError}
                          </p>
                        )}
                        {!account && (
                          <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="mt-3 text-xs font-medium text-cobalto"
                          >
                            Inicia sesión para comentar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}

      {reportTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setReportTarget(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-cobalto">
                {reportTarget.kind === 'reply' ? 'Reportar comentario' : 'Reportar publicación'}
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
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
                  placeholder={
                    reportTarget.kind === 'reply'
                      ? 'Describe por qué reportas este comentario…'
                      : 'Describe por qué reportas esta publicación…'
                  }
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
        {zoomImage && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
          >
            <img
              src={zoomImage}
              alt=""
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomImage(null)}
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
