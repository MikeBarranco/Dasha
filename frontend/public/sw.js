// Service Worker de Dasha.
// Su única tarea por ahora es recibir Web Push del backend y mostrar la
// notificación nativa en el celular/PC, y abrir la app al tocarla.

// Traduce el `link` lógico del backend a la ruta real de la app. DEBE ser igual
// que src/lib/notificationLink.ts (aquí no podemos importar ese módulo porque
// el service worker corre aparte). Si cambias una, cambia la otra.
function mapNotificationLink(link) {
  if (!link) return '/';
  var forum = link.match(/^\/forum\/posts\/(.+)$/);
  if (forum) return '/comunidad?tab=foro&post=' + forum[1];
  var report = link.match(/^\/reports\/(.+)$/);
  if (report) return '/mapa?reporte=' + report[1];
  if (link === '/admin/organizations') return '/admin/solicitudes-aliado';
  if (link === '/admin/volunteers') return '/admin/voluntarios';
  return link;
}

self.addEventListener('install', () => {
  // Activa esta versión sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El servidor de Dasha manda un Push: mostramos la notificación.
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Dasha';
  const options = {
    body: payload.body || 'Tienes una nueva notificación de Dasha.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // El backend manda `link` (no `url`); lo traducimos a nuestra ruta real para
    // que al tocar el push abra la pantalla correcta y no "página no encontrada".
    data: { url: mapNotificationLink(payload.link || payload.url) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// El usuario toca la notificación: enfocamos la app o abrimos la URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
