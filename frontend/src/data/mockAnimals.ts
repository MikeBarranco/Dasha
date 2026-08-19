export type AnimalStatus =
  | 'En tratamiento'
  | 'Recuperándose'
  | 'Buscando hogar'
  | 'Adoptado'
  | 'Fallecido';

export type AnimalSize = 'Chico' | 'Mediano' | 'Grande';

export type TimelineEvent = {
  title: string;
  when: string;
};

export type MedicalEntryType =
  | 'vacuna'
  | 'desparasitacion'
  | 'tratamiento'
  | 'cirugia'
  | 'peso'
  | 'otro';

export type MedicalEntry = {
  id: string;
  type: MedicalEntryType;
  title: string;
  date: string;
  notes?: string;
};

// Cartilla médica del animal: si está esterilizado y su historial clínico
// (vacunas, tratamientos, cirugías, etc.). La llena el aliado desde su portal.
export type MedicalRecord = {
  sterilized: boolean;
  entries: MedicalEntry[];
};

export type Animal = {
  id: string;
  name: string;
  species: 'perro' | 'gato';
  // Sexo del animalito (si el aliado lo capturó). undefined = sin dato.
  gender?: 'macho' | 'hembra';
  size: AnimalSize;
  zone: string;
  photos: string[];
  story: string;
  diagnosis: string;
  vet: string;
  totalNeeded: number;
  totalRaised: number;
  status: AnimalStatus;
  timeline?: TimelineEvent[];
  medical?: MedicalRecord;
};

export const mockAnimals: Animal[] = [
  {
    id: 'b1',
    name: 'Bombon',
    species: 'perro',
    size: 'Chico',
    zone: 'Puebla',
    photos: ['/seed/perrito2.jpg'],
    story: 'Perrito rescatado con mucha energía.',
    diagnosis: 'Sano',
    vet: 'Veterinaria',
    totalNeeded: 1000,
    totalRaised: 1000,
    status: 'Buscando hogar',
  },
  {
    id: 'b2',
    name: 'LeBron',
    species: 'perro',
    size: 'Mediano',
    zone: 'Puebla',
    photos: ['/seed/perrito5.jpg'],
    story: 'Amigable y leal, listo para su hogar definitivo.',
    diagnosis: 'Sano',
    vet: 'Veterinaria',
    totalNeeded: 1000,
    totalRaised: 1000,
    status: 'Buscando hogar',
  },
  {
    id: 'b3',
    name: 'Storm',
    species: 'perro',
    size: 'Mediano',
    zone: 'Puebla',
    photos: ['/seed/perrito1.jpg'],
    story: 'Rescatado de las calles, ahora busca una familia amorosa.',
    diagnosis: 'Sano',
    vet: 'Veterinaria',
    totalNeeded: 1000,
    totalRaised: 1000,
    status: 'Buscando hogar',
  },
  {
    id: 'a1',
    name: 'Charlie',
    species: 'perro',
    size: 'Mediano',
    zone: 'San Manuel',
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
    medical: {
      sterilized: true,
      entries: [
        {
          id: 'm1',
          type: 'cirugia',
          title: 'Curación de la pata',
          date: 'Hace 3 semanas',
          notes: 'Herida limpiada y suturada.',
        },
        { id: 'm2', type: 'desparasitacion', title: 'Desparasitación interna', date: 'Hace 2 semanas' },
        {
          id: 'm3',
          type: 'vacuna',
          title: 'Vacuna antirrábica',
          date: 'Hace 2 semanas',
          notes: 'Aplicada por el veterinario aliado.',
        },
      ],
    },
  },
  {
    id: 'a2',
    name: 'Balú',
    species: 'perro',
    size: 'Grande',
    zone: 'San Manuel',
    photos: ['/seed/perrito1.jpg'],
    story:
      'Lo rescataron en San Manuel después de que un voluntario respondiera a un reporte. Llegó asustado, pero cada día está mejor.',
    diagnosis: 'Fractura en pata trasera, en recuperación',
    vet: 'Vet San Manuel',
    totalNeeded: 1500,
    totalRaised: 900,
    status: 'En tratamiento',
    medical: {
      sterilized: false,
      entries: [
        { id: 'm4', type: 'tratamiento', title: 'Inmovilización de la fractura', date: 'Hace 1 semana' },
        { id: 'm5', type: 'peso', title: 'Peso: 18 kg', date: 'Hoy' },
      ],
    },
  },
  {
    id: 'a3',
    name: 'Luna',
    species: 'gato',
    size: 'Chico',
    zone: 'Centro Histórico',
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
    size: 'Grande',
    zone: 'La Paz',
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
    size: 'Mediano',
    zone: 'La Hacienda',
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
    size: 'Chico',
    zone: 'La Hacienda',
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
    size: 'Chico',
    zone: 'Huexotitla',
    photos: ['/seed/gatitoherido10.jpg'],
    story: 'Llegó con una herida que un padrino ayudó a curar. Ya casi está listo para su hogar.',
    diagnosis: 'Herida en proceso de cicatrización',
    vet: 'Vet San Manuel',
    totalNeeded: 1000,
    totalRaised: 600,
    status: 'Recuperándose',
  },
];
