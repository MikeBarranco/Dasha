export type AnimalStatus = 'En tratamiento' | 'Recuperándose' | 'Buscando hogar';

export type Animal = {
  id: string;
  name: string;
  species: 'perro' | 'gato';
  photo: string;
  story: string;
  diagnosis: string;
  vet: string;
  totalNeeded: number;
  totalRaised: number;
  status: AnimalStatus;
};

export const mockAnimals: Animal[] = [
  {
    id: 'a1',
    name: 'Balú',
    species: 'perro',
    photo: '/seed/perrito1.jpg',
    story:
      'Lo rescataron en San Manuel después de que un voluntario respondiera a un reporte. Llegó asustado, pero cada día está mejor.',
    diagnosis: 'Fractura en pata trasera, en recuperación',
    vet: 'Vet San Manuel',
    totalNeeded: 1500,
    totalRaised: 900,
    status: 'En tratamiento',
  },
  {
    id: 'a2',
    name: 'Luna',
    species: 'gato',
    photo: '/seed/gatito9.jpg',
    story:
      'Gatita encontrada cerca del parque, sola y con hambre. Ya recuperó su peso y ahora busca una familia.',
    diagnosis: 'Desnutrición leve, ya superada',
    vet: 'Clínica Huellitas',
    totalNeeded: 800,
    totalRaised: 800,
    status: 'Buscando hogar',
  },
  {
    id: 'a3',
    name: 'Rocky',
    species: 'perro',
    photo: '/seed/perrito5.jpg',
    story: 'Andaba entre los coches en La Paz. Un voluntario lo aseguró justo a tiempo.',
    diagnosis: 'Infección en la piel, en tratamiento',
    vet: 'Vet San Manuel',
    totalNeeded: 1200,
    totalRaised: 400,
    status: 'En tratamiento',
  },
  {
    id: 'a4',
    name: 'Canela',
    species: 'perro',
    photo: '/seed/perrito2.jpg',
    story: 'Reportada como perdida y nadie la reclamó. Es muy cariñosa y está sana.',
    diagnosis: 'Esterilización y vacunas al día',
    vet: 'CAETO',
    totalNeeded: 600,
    totalRaised: 350,
    status: 'Buscando hogar',
  },
  {
    id: 'a5',
    name: 'Milo',
    species: 'perro',
    photo: '/seed/cachorrito16.jpg',
    story: 'Cachorro abandonado en una esquina de La Hacienda. Pequeño, juguetón y con muchas ganas.',
    diagnosis: 'Revisión general y primeras vacunas',
    vet: 'Clínica Huellitas',
    totalNeeded: 500,
    totalRaised: 150,
    status: 'En tratamiento',
  },
  {
    id: 'a6',
    name: 'Nube',
    species: 'gato',
    photo: '/seed/gatitoherido10.jpg',
    story: 'Llegó con una herida que un padrino ayudó a curar. Ya casi está listo para su hogar.',
    diagnosis: 'Herida en proceso de cicatrización',
    vet: 'Vet San Manuel',
    totalNeeded: 1000,
    totalRaised: 600,
    status: 'Recuperándose',
  },
];
