import { describe, it, expect } from 'vitest';
import { mapNotificationLink } from './notificationLink';

describe('mapNotificationLink', () => {
  it('traduce /forum/posts/ID a la pestaña de foro con el post', () => {
    expect(mapNotificationLink('/forum/posts/abc123')).toBe('/comunidad?tab=foro&post=abc123');
  });

  it('traduce /reports/ID al mapa con el reporte', () => {
    expect(mapNotificationLink('/reports/r1')).toBe('/mapa?reporte=r1');
  });

  it('traduce las rutas de admin de solicitudes', () => {
    expect(mapNotificationLink('/admin/organizations')).toBe('/admin/solicitudes-aliado');
    expect(mapNotificationLink('/admin/volunteers')).toBe('/admin/voluntarios');
  });

  it('deja pasar tal cual las rutas que ya son nuestras (ej. /portal)', () => {
    expect(mapNotificationLink('/portal')).toBe('/portal');
    expect(mapNotificationLink('/perfil')).toBe('/perfil');
  });

  it('devuelve la raíz cuando el link es vacío, null o undefined', () => {
    expect(mapNotificationLink('')).toBe('/');
    expect(mapNotificationLink(null)).toBe('/');
    expect(mapNotificationLink(undefined)).toBe('/');
  });
});
