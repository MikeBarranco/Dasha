export type MapMode = 'calle' | 'aliados' | 'perdidos';

export const mapModes: { value: MapMode; label: string }[] = [
  { value: 'calle', label: 'Calle' },
  { value: 'aliados', label: 'Aliados' },
  { value: 'perdidos', label: 'Perdidos' },
];
