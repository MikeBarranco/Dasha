export type Severity = 'critica' | 'media' | 'baja';

export type Report = {
  id: string;
  lng: number;
  lat: number;
  colonia: string;
  species: 'perro' | 'gato';
  condition: string;
  severity: Severity;
  photo: string;
};

export const mockReports: Report[] = [
  { id: 'r1', lng: -98.227, lat: 19.0556, colonia: 'LA PAZ', species: 'perro', condition: 'Herido', severity: 'critica', photo: '/seed/seed-4.jpg' },
  { id: 'r2', lng: -98.2262, lat: 19.0548, colonia: 'LA PAZ', species: 'perro', condition: 'Desnutrido', severity: 'media', photo: '/seed/seed-1.jpg' },
  { id: 'r3', lng: -98.2258, lat: 19.0556, colonia: 'LA PAZ', species: 'perro', condition: 'Estable', severity: 'baja', photo: '/seed/seed-2.jpg' },
  { id: 'r4', lng: -98.2272, lat: 19.0547, colonia: 'LA PAZ', species: 'perro', condition: 'Enfermo', severity: 'media', photo: '/seed/seed-3.jpg' },
  { id: 'r5', lng: -98.2048, lat: 19.0303, colonia: 'CARMEN HUEXOTITLA', species: 'perro', condition: 'Herido', severity: 'critica', photo: '/seed/seed-4.jpg' },
  { id: 'r6', lng: -98.2041, lat: 19.0296, colonia: 'CARMEN HUEXOTITLA', species: 'perro', condition: 'Desnutrido', severity: 'media', photo: '/seed/seed-1.jpg' },
  { id: 'r7', lng: -98.2049, lat: 19.0294, colonia: 'CARMEN HUEXOTITLA', species: 'perro', condition: 'Estable', severity: 'baja', photo: '/seed/seed-3.jpg' },
  { id: 'r8', lng: -98.2012, lat: 19.0359, colonia: 'EL CARMEN', species: 'perro', condition: 'Enfermo', severity: 'media', photo: '/seed/seed-2.jpg' },
  { id: 'r9', lng: -98.2005, lat: 19.0353, colonia: 'EL CARMEN', species: 'perro', condition: 'Perdido', severity: 'baja', photo: '/seed/seed-1.jpg' },
  { id: 'r10', lng: -98.2131, lat: 19.0319, colonia: 'GABRIEL PASTOR PRIMERA SECCION', species: 'perro', condition: 'Herido', severity: 'critica', photo: '/seed/seed-4.jpg' },
  { id: 'r11', lng: -98.2126, lat: 19.0313, colonia: 'GABRIEL PASTOR PRIMERA SECCION', species: 'perro', condition: 'Desnutrido', severity: 'media', photo: '/seed/seed-3.jpg' },
  { id: 'r12', lng: -98.2066, lat: 19.0106, colonia: 'SAN BALTAZAR LINDA VISTA', species: 'perro', condition: 'Estable', severity: 'baja', photo: '/seed/seed-2.jpg' },
  { id: 'r13', lng: -98.1912, lat: 19.008, colonia: 'LA HACIENDA', species: 'perro', condition: 'Desnutrido', severity: 'media', photo: '/seed/seed-1.jpg' },
];
