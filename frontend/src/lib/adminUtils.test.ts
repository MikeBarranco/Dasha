import { describe, it, expect } from 'vitest';
import { timeAgo, humanizeSlug, isOrgResponsable } from './adminApi';

describe('timeAgo', () => {
  it('sin fecha devuelve "hace un momento"', () => {
    expect(timeAgo('')).toBe('hace un momento');
  });

  it('hace segundos (menos de 1 min) devuelve "hace un momento"', () => {
    expect(timeAgo(new Date().toISOString())).toBe('hace un momento');
  });

  it('muestra minutos, horas y días', () => {
    const min = new Date(Date.now() - 5 * 60000).toISOString();
    const hrs = new Date(Date.now() - 3 * 3600000).toISOString();
    const days = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(timeAgo(min)).toBe('hace 5 min');
    expect(timeAgo(hrs)).toBe('hace 3 h');
    expect(timeAgo(days)).toBe('hace 2 d');
  });

  it('con una fecha inválida devuelve cadena vacía', () => {
    expect(timeAgo('no-es-fecha')).toBe('');
  });
});

describe('humanizeSlug', () => {
  it('convierte guiones bajos y medios en espacios y capitaliza', () => {
    expect(humanizeSlug('looking_for_adoption')).toBe('Looking for adoption');
    expect(humanizeSlug('en-tratamiento')).toBe('En tratamiento');
  });

  it('normaliza mayúsculas a solo la inicial', () => {
    expect(humanizeSlug('HELLO_WORLD')).toBe('Hello world');
  });

  it('con vacío o solo separadores devuelve cadena vacía', () => {
    expect(humanizeSlug('')).toBe('');
    expect(humanizeSlug('___')).toBe('');
  });
});

describe('isOrgResponsable', () => {
  it('owner y admin son responsables', () => {
    expect(isOrgResponsable('owner')).toBe(true);
    expect(isOrgResponsable('admin')).toBe(true);
  });

  it('cualquier otro rol no lo es', () => {
    expect(isOrgResponsable('veterinarian')).toBe(false);
    expect(isOrgResponsable('assistant')).toBe(false);
    expect(isOrgResponsable('')).toBe(false);
  });
});
