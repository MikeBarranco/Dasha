import { useEffect, useState } from 'react';
import { Trash2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { getAdminForumPosts, deleteAdminForumPost, type AdminForumPost } from '../../lib/adminApi';

export function AdminForumPage() {
  const [posts, setPosts] = useState<AdminForumPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = (reset: boolean) => {
    if (reset) {
      setPosts(null);
      setError(null);
    }
    getAdminForumPosts()
      .then((data) => {
        setPosts(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las publicaciones');
        setPosts([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminForumPosts()
      .then((data) => {
        if (!active) return;
        setPosts(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las publicaciones');
        setPosts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminForumPost(id);
      setPosts((list) => (list ? list.filter((post) => post.id !== id) : list));
      setConfirmId(null);
    } catch {
      alert('No se pudo eliminar la publicación. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cobalto">Foro</h1>
        {posts !== null && posts.length > 0 && (
          <span className="text-sm text-neutral-400">{posts.length}</span>
        )}
      </div>

      {posts === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar las publicaciones</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchPosts(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {posts !== null && !error && posts.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">No hay publicaciones</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Las publicaciones de la comunidad aparecerán aquí para moderarlas.
          </p>
        </div>
      )}

      {posts !== null && posts.length > 0 && (
        <div className="mt-6 space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-neutral-800">{post.author}</p>
                <span className="flex-shrink-0 text-xs text-neutral-400">{post.createdAgo}</span>
              </div>

              {post.content && (
                <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-600">{post.content}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.repliesCount !== null ? `${post.repliesCount} respuestas` : 'Publicación'}
                </span>

                {confirmId === post.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(post.id)}
                      disabled={deletingId === post.id}
                      className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {deletingId === post.id ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(post.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-alerta transition-colors hover:bg-alerta/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
