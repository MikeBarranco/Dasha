import { prisma } from './config/db.js';

const releaseNotes = [
  {
    version: 'v0.8',
    date: '2026-07-14T12:00:00Z',
    title: 'Rescate de punta a punta, voluntarios e impacto',
    changes: [
      'Modo Activo para voluntarios: actívate con un radio y recibe las emergencias más cercanas para ir por ellas.',
      'Sigue el rescate completo: el voluntario toma foto al recoger y al entregar, y ves la historia del caso paso a paso.',
      'Tablero de necesidades: los aliados publican lo que necesitan (alimento, transporte, hogar temporal) y tú puedes cubrirlo.',
      'Al reportar te avisamos si ya hay un reporte del mismo animalito cerca, para no duplicar.',
      'Nueva guía "qué hacer mientras llega la ayuda", con pasos seguros según la situación.',
      'Página de Impacto: mira en números los rescates, adopciones y el aporte de la comunidad.',
    ],
  },
  {
    version: 'v0.7',
    date: '2026-07-03T12:00:00Z',
    title: 'Portada, notificaciones y perfil',
    changes: [
      'Nueva portada que presenta Dasha con historias reales de rescate.',
      'Notificaciones push: recibe avisos aunque tengas la app cerrada (actívalas en tu perfil).',
      'Los contadores del mapa cambian según el modo: calle, perdidos o aliados.',
      'Perfil renovado: medallas con vista de logros, tus reportes en galería y ajustes de cuenta.',
    ],
  },
  {
    version: 'v0.6',
    date: '2026-06-28T12:00:00Z',
    title: 'Panel de administración y contacto',
    changes: [
      'Panel de administración para gestionar reportes, animales, aliados, usuarios y voluntarios.',
      'Busca en el mapa por código postal, además de por colonia.',
      'Botones de WhatsApp para contactar en mascotas perdidas y aliados.',
      'Campanita de notificaciones y tarjeta de detalle para mascotas perdidas.',
    ],
  },
  {
    version: 'v0.5',
    date: '2026-06-27T12:00:00Z',
    title: 'Aliados, mascotas perdidas y experiencia móvil',
    changes: [
      'Reporta una mascota perdida y mira las zonas de búsqueda en el mapa.',
      'Aliados en el mapa: veterinarias, refugios y asociaciones con su perfil.',
      'Cambia el mapa entre Calle, Aliados y Perdidos con un solo toque.',
      'Experiencia móvil más fluida, con gestos y navegación estilo app.',
      'El encabezado del mapa y las fotos a pantalla completa se sienten mejor.',
    ],
  },
  {
    version: 'v0.4',
    date: '2026-06-22T12:00:00Z',
    title: 'Rehabilitación real y fotos más confiables',
    changes: [
      'Rehabilitación ahora muestra animales reales con su avance.',
      'Si una foto no carga, aparece una imagen de respaldo en vez de una rota.',
      'Al publicar un reporte, el botón te lleva directo a tu reporte en el mapa.',
      'El detalle de rehabilitación se cierra deslizando hacia abajo.',
    ],
  },
  {
    version: 'v0.3',
    date: '2026-06-16T12:00:00Z',
    title: 'Inicio de sesión y filtros del mapa',
    changes: [
      'Inicia sesión con tu cuenta de Google.',
      'Filtra el mapa por especie, urgencia y condición.',
      'Tu avatar se guarda por cuenta y regresa al iniciar sesión.',
      'Enlaces a las redes sociales de Dasha.',
    ],
  },
  {
    version: 'v0.2',
    date: '2026-06-09T12:00:00Z',
    title: 'Mapa por colonias',
    changes: [
      'Mapa de calor por colonia según la urgencia de los reportes.',
      'Buscador de colonias y botón de mi ubicación.',
      'Lista de reportes del área visible mientras exploras el mapa.',
    ],
  },
  {
    version: 'v0.1',
    date: '2026-06-02T12:00:00Z',
    title: 'Primera versión de Dasha',
    changes: [
      'Reporta animales en situación de calle con foto y ubicación.',
      'Pantallas de mapa, rehabilitación, comunidad y perfil.',
    ],
  },
];

export async function seedChangelogsIfNeeded() {
  const count = await prisma.changelogEntry.count();
  if (count > 0) {
    return; // Ya está sembrado
  }

  console.log('Sembrando changelog inicial...');
  for (const note of releaseNotes) {
    await prisma.changelogEntry.create({
      data: {
        version: note.version,
        title: note.title,
        date: new Date(note.date),
        changes: note.changes,
        isPublished: true,
      }
    });
  }
  
  console.log('Sembrado de changelog completado con éxito.');
}
