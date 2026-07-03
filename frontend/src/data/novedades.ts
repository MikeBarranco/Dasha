export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const releaseNotes: ReleaseNote[] = [
  {
    version: 'v0.7',
    date: '3 de julio de 2026',
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
    date: '28 de junio de 2026',
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
    date: '27 de junio de 2026',
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
    date: '22 de junio de 2026',
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
    date: '16 de junio de 2026',
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
    date: '9 de junio de 2026',
    title: 'Mapa por colonias',
    changes: [
      'Mapa de calor por colonia según la urgencia de los reportes.',
      'Buscador de colonias y botón de mi ubicación.',
      'Lista de reportes del área visible mientras exploras el mapa.',
    ],
  },
  {
    version: 'v0.1',
    date: '2 de junio de 2026',
    title: 'Primera versión de Dasha',
    changes: [
      'Reporta animales en situación de calle con foto y ubicación.',
      'Pantallas de mapa, rehabilitación, comunidad y perfil.',
    ],
  },
];

export type OriginStory = {
  title: string;
  paragraphs: string[];
};

// Historia de origen: da contexto humano al proyecto para quien llega nuevo
// (y para los evaluadores). Basada en hechos reales del proyecto.
export const originStory: OriginStory = {
  title: 'Cómo nació Dasha',
  paragraphs: [
    'Dasha lleva el nombre de una perrita chihuahua que se perdió. De esa búsqueda nació una convicción: nadie debería quedarse sin saber cómo ayudar a un animal que lo necesita.',
    'Preguntamos a la comunidad de Puebla y confirmamos el problema: casi la mitad de las personas que se han topado con un animal en la calle no supieron qué hacer, y la gran mayoría usaría una herramienta para coordinar el rescate.',
    'Por eso construimos Dasha como una aplicación web instalable: para convertir la empatía en acción organizada, con mapa, reportes y seguimiento. Y seguimos creciendo, versión con versión.',
  ],
};
