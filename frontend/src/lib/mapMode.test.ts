import { describe, it, expect } from 'vitest';
import { mapModes } from './mapMode';

describe('mapModes (modos del mapa)', () => {
  it('expone exactamente los tres modos en orden', () => {
    expect(mapModes.map((mode) => mode.value)).toEqual(['calle', 'aliados', 'perdidos']);
  });

  it('cada modo trae una etiqueta legible', () => {
    expect(mapModes.map((mode) => mode.label)).toEqual(['Calle', 'Aliados', 'Perdidos']);
  });
});
