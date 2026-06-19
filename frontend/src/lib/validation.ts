export const onlyLetters = (value: string) => /^[\p{L}\s]+$/u.test(value.trim());

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { id: 'lower', label: 'Una letra minúscula', test: (v) => /[a-záéíóúñ]/.test(v) },
  { id: 'number', label: 'Un número', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'Un símbolo (!@#$%…)', test: (v) => /[^\p{L}\d\s]/u.test(v) },
];

export const isStrongPassword = (value: string) => passwordRules.every((rule) => rule.test(value));
