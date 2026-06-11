export type AnimalStatus = 'En tratamiento' | 'Recuperándose' | 'Buscando hogar';

export type TimelineEvent = {
  title: string;
  when: string;
};

export type Animal = {
  id: string;
  name: string;
  species: 'perro' | 'gato';
  photos: string[];
  story: string;
  diagnosis: string;
  vet: string;
  totalNeeded: number;
  totalRaised: number;
  status: AnimalStatus;
  timeline?: TimelineEvent[];
};

export const mockAnimals: Animal[] = [
  {
    id: 'a1',
    name: 'Charlie',
    species: 'perro',
    photos: [
      '/seed/charlie-calle.jpg',
      '/seed/charlie-rescatado.jpg',
      '/seed/charlie-tratamiento.jpg',
      '/seed/charlie-recuperado.jpg',
    ],
    story:
      'Charlie estaba en la calle con una pata herida. Un voluntario respondió al reporte, una veterinaria aliada lo atendió y, gracias a sus padrinos, hoy está sano y busca un hogar para siempre.',
    diagnosis: 'Herida en la pata, ya curada',
    vet: 'Vet San Manuel',
    totalNeeded: 1800,
    totalRaised: 1800,
    status: 'Buscando hogar',
    timeline: [
      { title: 'En situación de calle, con la pata herida', when: 'Hace 3 semanas' },
      { title: 'Rescatado, camino a la veterinaria', when: 'Hace 3 semanas' },
      { title: 'En tratamiento veterinario', when: 'Hace 2 semanas' },
      { title: 'Recuperado, esperando adopción', when: 'Hoy' },
    ],
  },
  {
    id: 'a2',
    name: 'Balú',
    species: 'perro',
    photos: ['/seed/perrito1.jpg'],
    story:
      'Lo rescataron en San Manuel después de que un voluntario respondiera a un reporte. Llegó asustado, pero cada día está mejor.',
    diagnosis: 'Fractura en pata trasera, en recuperación',
    vet: 'Vet San Manuel',
    totalNeeded: 1500,
    totalRaised: 900,
    status: 'En tratamiento',
  },
  {
    id: 'a3',
    name: 'Luna',
    species: 'gato',
    photos: ['/seed/gatito9.jpg'],
    story:
      'Gatita encontrada cerca del parque, sola y con hambre. Ya recuperó su peso y ahora busca una familia.',
    diagnosis: 'Desnutrición leve, ya superada',
    vet: 'Clínica Huellitas',
    totalNeeded: 800,
    totalRaised: 800,
    status: 'Buscando hogar',
  },
  {
    id: 'a4',
    name: 'Rocky',
    species: 'perro',
    photos: ['/seed/perrito5.jpg'],
    story: 'Andaba entre los coches en La Paz. Un voluntario lo aseguró justo a tiempo.',
    diagnosis: 'Infección en la piel, en tratamiento',
    vet: 'Vet San Manuel',
    totalNeeded: 1200,
    totalRaised: 400,
    status: 'En tratamiento',
  },
  {
    id: 'a5',
    name: 'Canela',
    species: 'perro',
    photos: ['/seed/perrito2.jpg'],
    story: 'Reportada como perdida y nadie la reclamó. Es muy cariñosa y está sana.',
    diagnosis: 'Esterilización y vacunas al día',
    vet: 'CAETO',
    totalNeeded: 600,
    totalRaised: 350,
    status: 'Buscando hogar',
  },
  {
    id: 'a6',
    name: 'Milo',
    species: 'perro',
    photos: ['/seed/cachorrito16.jpg'],
    story: 'Cachorro abandonado en una esquina de La Hacienda. Pequeño, juguetón y con muchas ganas.',
    diagnosis: 'Revisión general y primeras vacunas',
    vet: 'Clínica Huellitas',
    totalNeeded: 500,
    totalRaised: 150,
    status: 'En tratamiento',
  },
  {
    id: 'a7',
    name: 'Nube',
    species: 'gato',
    photos: ['/seed/gatitoherido10.jpg'],
    story: 'Llegó con una herida que un padrino ayudó a curar. Ya casi está listo para su hogar.',
    diagnosis: 'Herida en proceso de cicatrización',
    vet: 'Vet San Manuel',
    totalNeeded: 1000,
    totalRaised: 600,
    status: 'Recuperándose',
  },
];
