import { prisma } from '../src/config/db';

const novedades = [
  {
    version: '1.2.0',
    date: new Date('2026-07-14'),
    title: 'Actualización de Seguridad y Live Tracking',
    changes: [
      'Integración de Web Sockets para el Live Tracking del voluntario en tiempo real.',
      'Mejoras de seguridad en la sesión (CSRF protection, cookies SameSite).',
      'Nueva vista del perfil público de aliado.',
      'Secciones de donaciones mejoradas.'
    ],
    type: 'feature',
    isPublished: true
  },
  {
    version: '1.1.0',
    date: new Date('2026-06-15'),
    title: 'Lanzamiento Inicial de Dasha',
    changes: [
      'Funcionalidad de reporte de calle básico.',
      'Módulo de adopciones inicial.',
      'Sistema de cuentas y recompensas (Medallas y Experiencia).'
    ],
    type: 'release',
    isPublished: true
  }
];

async function main() {
  console.log('🌱 Seeding changelog/novedades...');
  for (const n of novedades) {
    await prisma.changelogEntry.create({ data: n });
  }
  console.log('✅ Novedades seedeadas.');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
