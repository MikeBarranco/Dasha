import { useEffect, useState } from 'react';
import { Send, Megaphone, CheckCircle2, AlertCircle, Link2, Trash2 } from 'lucide-react';
import {
  getAdminNotifications,
  sendAdminNotification,
  deleteAdminNotification,
  notificationAudienceOptions,
  type AdminNotification,
} from '../../lib/adminApi';

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30';

export function AdminAvisosPage() {
  const [audience, setAudience] = useState(notificationAudienceOptions[0].value);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [history, setHistory] = useState<AdminNotification[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeNotification = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminNotification(id);
      setHistory((list) => (list ? list.filter((item) => item.id !== id) : list));
      setConfirmDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo borrar el aviso. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  const loadHistory = () => {
    getAdminNotifications()
      .then((data) => setHistory(data))
      .catch(() => setHistory([]));
  };

  useEffect(() => {
    let active = true;
    getAdminNotifications()
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const audienceLabel =
    notificationAudienceOptions.find((option) => option.value === audience)?.label ?? '';

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    setSent(false);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }
    const cleanBody = body.trim();
    if (cleanBody.length < 5) {
      setError('El mensaje debe tener al menos 5 caracteres.');
      return;
    }
    const cleanLink = link.trim();
    if (cleanLink && !cleanLink.startsWith('/') && !/^https?:\/\//.test(cleanLink)) {
      setError('El enlace debe empezar con “/” (dentro de la app) o con “http”.');
      return;
    }

    if (
      !window.confirm(
        `Se enviará el aviso “${cleanTitle}” a: ${audienceLabel}. ¿Enviar ahora?`,
      )
    ) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendAdminNotification({
        audience,
        title: cleanTitle,
        body: cleanBody,
        ...(cleanLink ? { link: cleanLink } : {}),
      });
      setSent(true);
      setTitle('');
      setBody('');
      setLink('');
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el aviso. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">Avisos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Envía una notificación a la comunidad. Aparece en su campanita y llega como notificación
        push a quienes la tengan activada.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Enviar a</span>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className={inputClass}
          >
            {notificationAudienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Título</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSent(false);
            }}
            maxLength={80}
            className={inputClass}
            placeholder="Ej. ¡Nuevo aliado en Dasha!"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Mensaje</span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSent(false);
            }}
            maxLength={280}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Escribe el aviso que verá la comunidad…"
          />
          <span className="mt-1 block text-right text-xs text-neutral-400">{body.length}/280</span>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            <Link2 className="h-4 w-4 text-neutral-400" />
            Enlace (opcional)
          </span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            maxLength={200}
            className={inputClass}
            placeholder="Ej. /novedades"
          />
          <span className="mt-1 block text-xs text-neutral-400">
            A dónde va el usuario al tocar el aviso. Deja vacío si no aplica.
          </span>
        </label>

        {error && (
          <p className="flex items-center gap-2 text-sm text-alerta">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {sent && (
          <p className="flex items-center gap-2 text-sm font-medium text-exito">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Aviso enviado a {audienceLabel}.
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Enviando…' : 'Enviar aviso'}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-display text-sm font-bold text-cobalto">Avisos enviados</h2>

        {history === null && (
          <div className="mt-3 space-y-2">
            {[0, 1].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {history !== null && history.length === 0 && (
          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
            <Megaphone className="h-7 w-7 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">
              Aún no has enviado avisos. Los que envíes aparecerán aquí.
            </p>
          </div>
        )}

        {history !== null && history.length > 0 && (
          <ul className="mt-3 space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 font-medium text-neutral-800">{item.title}</p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="rounded-full bg-cobalto/10 px-2 py-0.5 text-xs font-medium text-cobalto">
                      {item.audienceLabel}
                    </span>
                    {confirmDeleteId !== item.id && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        aria-label="Borrar aviso"
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-alerta/5 hover:text-alerta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {item.body && <p className="mt-1 text-sm text-neutral-600">{item.body}</p>}
                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                  {item.sentAgo && <span>{item.sentAgo}</span>}
                  {item.sentCount != null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.sentCount} destinatarios</span>
                    </>
                  )}
                </div>
                {confirmDeleteId === item.id && (
                  <div className="mt-3 rounded-xl border border-alerta/20 bg-alerta/5 p-3">
                    <p className="text-xs text-neutral-600">
                      Se borrará de tu historial y de la campanita de todos los usuarios que lo
                      recibieron. Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeNotification(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-lg bg-alerta px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {deletingId === item.id ? 'Borrando…' : 'Sí, borrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === item.id}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
