import { describe, it, expect } from 'vitest';
import {
  onlyLetters,
  isValidEmail,
  onlyDigits,
  isValidPhone,
  isStrongPassword,
  passwordRules,
} from './validation';

describe('onlyLetters', () => {
  it('acepta letras y espacios (incluye acentos y ñ)', () => {
    expect(onlyLetters('Juan Pérez')).toBe(true);
    expect(onlyLetters('María José')).toBe(true);
    expect(onlyLetters('Ñoño')).toBe(true);
  });

  it('rechaza números y símbolos', () => {
    expect(onlyLetters('Juan2')).toBe(false);
    expect(onlyLetters('Juan!')).toBe(false);
    expect(onlyLetters('123')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('acepta correos con formato válido', () => {
    expect(isValidEmail('hola@gmail.com')).toBe(true);
    expect(isValidEmail('nombre.apellido@dominio.mx')).toBe(true);
  });

  it('rechaza formatos inválidos (los que marcó la ronda de pruebas)', () => {
    expect(isValidEmail('hola@')).toBe(false);
    expect(isValidEmail('hola')).toBe(false);
    expect(isValidEmail('hola@algo')).toBe(false); // sin punto/dominio
    expect(isValidEmail('hola @gmail.com')).toBe(false); // espacio
  });
});

describe('onlyDigits', () => {
  it('deja solo dígitos y recorta al máximo (10 por defecto)', () => {
    expect(onlyDigits('22a1b2c3456789')).toBe('2212345678');
    expect(onlyDigits('55-12-34-56-78')).toBe('5512345678');
  });

  it('respeta un máximo distinto (ej. CP de 5)', () => {
    expect(onlyDigits('72000abc', 5)).toBe('72000');
    expect(onlyDigits('7200012', 5)).toBe('72000');
  });

  it('con puros caracteres inválidos regresa vacío', () => {
    expect(onlyDigits('abc!@#')).toBe('');
  });
});

describe('isValidPhone', () => {
  it('acepta exactamente 10 dígitos', () => {
    expect(isValidPhone('2212345678')).toBe(true);
  });

  it('rechaza menos o más de 10 dígitos', () => {
    expect(isValidPhone('221234567')).toBe(false); // 9
    expect(isValidPhone('22123456789')).toBe(false); // 11
    expect(isValidPhone('5')).toBe(false); // un solo dígito
  });
});

describe('isStrongPassword / passwordRules', () => {
  it('acepta una contraseña que cumple las 5 reglas', () => {
    expect(isStrongPassword('Dasha123!')).toBe(true);
  });

  it('rechaza si falta cualquier requisito', () => {
    expect(isStrongPassword('dasha123!')).toBe(false); // sin mayúscula
    expect(isStrongPassword('DASHA123!')).toBe(false); // sin minúscula
    expect(isStrongPassword('DashaAbc!')).toBe(false); // sin número
    expect(isStrongPassword('Dasha1234')).toBe(false); // sin símbolo
    expect(isStrongPassword('Da1!')).toBe(false); // menos de 8
  });

  it('expone exactamente las 5 reglas del checklist visible', () => {
    expect(passwordRules.map((rule) => rule.id)).toEqual([
      'length',
      'upper',
      'lower',
      'number',
      'symbol',
    ]);
  });
});
