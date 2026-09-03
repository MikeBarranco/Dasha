import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn (combinar clases)', () => {
  it('une clases separadas por espacio', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('ignora valores falsy (false, null, undefined)', () => {
    const hidden: boolean = false;
    expect(cn('a', hidden && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('acepta objetos condicionales y arreglos', () => {
    expect(cn('base', { activo: true, oculto: false })).toBe('base activo');
    expect(cn(['a', 'b'])).toBe('a b');
  });

  it('resuelve conflictos de Tailwind quedándose con la última clase', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
