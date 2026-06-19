export type CommunityEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  place: string;
  image: string;
  description: string;
  interested: number;
};

export type ForumPost = {
  id: string;
  author: string;
  role: string;
  timeAgo: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
};

export const communityEvents: CommunityEvent[] = [
  {
    id: 'e1',
    title: 'Jornada de esterilización gratuita',
    type: 'Esterilización',
    date: 'Sáb 21 jun · 9:00 am',
    place: 'Parque Juárez, La Paz',
    image: '/seed/esterilizacion.jpg',
    description:
      'Esterilización gratuita para perros y gatos. Cupo limitado, registra a tu mascota con anticipación.',
    interested: 48,
  },
  {
    id: 'e2',
    title: 'Feria de adopción',
    type: 'Adopción',
    date: 'Dom 22 jun · 11:00 am',
    place: 'Zócalo de Puebla',
    image: '/seed/adopcion.jpg',
    description:
      'Conoce a los animalitos rescatados que buscan hogar. Ven a conocer a Charlie y a muchos más.',
    interested: 132,
  },
  {
    id: 'e3',
    title: 'Campaña de vacunación antirrábica',
    type: 'Vacunación',
    date: 'Sáb 28 jun · 10:00 am',
    place: 'Clínica Huellitas, El Carmen',
    image: '/seed/antirrabica.jpg',
    description:
      'Vacuna antirrábica gratuita. Trae a tu mascota con correa o en transportadora.',
    interested: 27,
  },
];

export const forumPosts: ForumPost[] = [
  {
    id: 'p1',
    author: 'Laura Méndez',
    role: 'Voluntaria',
    timeAgo: 'hace 2 h',
    text: 'Encontré a este perrito cerca de San Manuel, ya está a salvo y en la veterinaria. ¡Gracias a quien lo reportó!',
    image: '/seed/perrito5.jpg',
    likes: 34,
    comments: 8,
  },
  {
    id: 'p2',
    author: 'Carlos Ruiz',
    role: 'Vecino',
    timeAgo: 'hace 5 h',
    text: '¿Alguien conoce una veterinaria de bajo costo por La Hacienda? Un gatito de la calle necesita revisión.',
    likes: 12,
    comments: 15,
  },
  {
    id: 'p3',
    author: 'Refugio Patitas',
    role: 'Aliado',
    timeAgo: 'ayer',
    text: 'Tenemos croquetas donadas para repartir entre quienes cuidan colonias de gatos. Escríbannos por aquí.',
    likes: 56,
    comments: 21,
  },
];
