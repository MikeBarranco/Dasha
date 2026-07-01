import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/useAuth';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../lib/api';

export function NotificationsBell() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    getNotifications()
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  };

  // Carga inicial cuando hay sesión.
  useEffect(() => {
    if (!account) return;
    let active = true;
    getNotifications()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [account]);

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = account && items ? items.filter((item) => !item.read).length : 0;

  const toggle = () => {
    if (!account) {
      navigate('/login');
      return;
    }
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const openItem = (item: AppNotification) => {
    if (!item.read) {
      setItems((list) =>
        list ? list.map((n) => (n.id === item.id ? { ...n, read: true } : n)) : list,
      );
      markNotificationRead(item.id).catch(() => {});
    }
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  const markAll = () => {
    setItems((list) => (list ? list.map((n) => ({ ...n, read: true })) : list));
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alerta px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && account && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <p className="font-display text-sm font-bold text-cobalto">Notificaciones</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="flex items-center gap-1 text-xs font-medium text-cobalto transition-opacity hover:opacity-80"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todo
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items === null ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">No tienes notificaciones.</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50',
                          !item.read && 'bg-cobalto/5',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                            item.read ? 'bg-transparent' : 'bg-cobalto',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-neutral-800">
                            {item.title}
                          </span>
                          {item.body && (
                            <span className="mt-0.5 block text-xs text-neutral-500">{item.body}</span>
                          )}
                          {item.createdAgo && (
                            <span className="mt-1 block text-[11px] text-neutral-400">
                              {item.createdAgo}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
