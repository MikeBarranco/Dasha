// Traduce el `link` que manda el backend en las notificaciones a la ruta real de
// la app. El backend usa rutas "lógicas" (por ejemplo /forum/posts/:id o
// /reports/:id) que NO coinciden con nuestras rutas de react-router; sin este
// mapeo, tocar una notificación llevaba a "página no encontrada".
//
// Formatos que manda Isabel (30 jul) -> nuestra ruta:
//   /forum/posts/ID        -> /comunidad?tab=foro&post=ID
//   /reports/ID            -> /mapa?reporte=ID   (rescate / emergencia / reporte)
//   /portal                -> /portal            (ya coincide)
//   /admin/organizations   -> /admin/solicitudes-aliado  (nueva solicitud de aliado)
//   /admin/volunteers      -> /admin/voluntarios          (nueva solicitud de voluntario)
//
// OJO: esta MISMA lógica está replicada en `public/sw.js` (para el push nativo,
// que es un service worker y no puede importar este módulo). Si cambias una,
// cambia la otra.
export function mapNotificationLink(link: string | null | undefined): string {
  if (!link) return '/';

  const forum = link.match(/^\/forum\/posts\/(.+)$/);
  if (forum) return `/comunidad?tab=foro&post=${forum[1]}`;

  const report = link.match(/^\/reports\/(.+)$/);
  if (report) return `/mapa?reporte=${report[1]}`;

  if (link === '/admin/organizations') return '/admin/solicitudes-aliado';
  if (link === '/admin/volunteers') return '/admin/voluntarios';

  // /portal y cualquier otro link que ya sea una ruta nuestra se usa tal cual.
  return link;
}
