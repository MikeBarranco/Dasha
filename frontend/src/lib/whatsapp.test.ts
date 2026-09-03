import { describe, it, expect } from 'vitest';
import { whatsappUrl } from './whatsapp';

describe('whatsappUrl', () => {
  it('antepone la lada de México (52) cuando el número trae 10 dígitos', () => {
    expect(whatsappUrl('2212345678')).toBe('https://wa.me/522212345678');
  });

  it('ignora guiones, espacios y paréntesis del número', () => {
    expect(whatsappUrl('(221) 234-5678')).toBe('https://wa.me/522212345678');
  });

  it('respeta un número que ya trae lada (12 dígitos)', () => {
    expect(whatsappUrl('522212345678')).toBe('https://wa.me/522212345678');
  });

  it('devuelve null si el número tiene menos de 10 dígitos', () => {
    expect(whatsappUrl('12345')).toBeNull();
  });

  it('devuelve null con null, undefined o cadena vacía', () => {
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl(undefined)).toBeNull();
    expect(whatsappUrl('')).toBeNull();
  });

  it('agrega el mensaje codificado en el parámetro text', () => {
    expect(whatsappUrl('2212345678', 'Hola, vi tu reporte')).toBe(
      'https://wa.me/522212345678?text=Hola%2C%20vi%20tu%20reporte',
    );
  });
});
