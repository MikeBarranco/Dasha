import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';
import { useAuth } from '../lib/useAuth';
import { compressImage } from '../lib/image';
import {
  getEvents,
  rsvpEvent,
  getForumPosts,
  createForumPost,
  likeForumPost,
  reportForumPost,
} from '../lib/api';
import type { CommunityEvent, ForumPost } from '../data/mockComunidad';

type Tab = 'eventos' | 'foro';

const reportReasons = ['Contenido ofensivo', 'Spam o publicidad', 'Información falsa', 'Otro'];

export function ComunidadPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const [tab, setTab] = useState<Tab>('eventos');

  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => active && setEvents(data))
      .catch(() => active && setEvents([]));
    getForumPosts()
      .then((data) => active && setPosts(data))
      .catch(() => active && setPosts([]));
    return () => {
      active = false;
    };
  }, []);

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
    if (liked.has(id)) return;
    setLiked((current) => new Set(current).add(id));
    setPosts((list) =>
      list ? list.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)) : list,
    );
    likeForumPost(id).catch(() => {});
  };

  const openReport = (id: string) => {
    if (!account) {
      navigate('/login');
      return;
    }
    setReportReason(reportReasons[0]);
    setReportingId(id);
  };

  const submitReport = () => {
    const id = reportingId;
    if (!id) return;
    setReportedIds((current) => new Set(current).add(id));
    reportForumPost(id, reportReason).catch(() => {});
    setReportingId(null);
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
    } catch {
      // Pendiente de backend: la publicación queda visible en local.
    } finally {
      setPosting(false);
      setText('');
      setPhoto(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Comunidad"
        subtitle="Eventos de esterilización, vacunación y adopción, y un foro para ayudarnos entre todos."
      />

      <div className="mb-5 inline-flex rounded-xl bg-neutral-100 p-1">
        {(['eventos', 'foro'] as Tab[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
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
          {events === null &&
            [0, 1].map((index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-neutral-100" />
            ))}

          {events !== null && events.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 font-semibold text-neutral-700">Aún no hay eventos</p>
              <p className="mt-1 text-sm text-neutral-500">
                Pronto habrá jornadas y ferias de la comunidad.
              </p>
            </div>
          )}

          {events?.map((event, index) => {
            const isInterested = interested.has(event.id);
            return (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                <div className="relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder-animal.svg';
                    }}
                    className="h-40 w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-cobalto">
                    {event.type}
                  </span>
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
                onChange={(event) => setText(event.target.value)}
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
                <p className="mt-3 text-sm text-neutral-600">{post.text}</p>
                {post.image && (
                  <img
                    src={post.image}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="mt-3 h-48 w-full rounded-xl object-cover"
                  />
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
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> {post.comments}
                  </span>
                  {reportedIds.has(post.id) ? (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-400">
                      <Flag className="h-4 w-4" /> Reportado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openReport(post.id)}
                      aria-label="Reportar publicación"
                      className="ml-auto text-neutral-400 transition-colors hover:text-alerta"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {reportingId && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setReportingId(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-cobalto">Reportar publicación</h3>
              <button
                type="button"
                onClick={() => setReportingId(null)}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Cuéntanos por qué. Un administrador la revisará.
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
            <button
              type="button"
              onClick={submitReport}
              className="mt-4 w-full rounded-xl bg-alerta py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Enviar reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
