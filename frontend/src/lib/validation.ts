export const onlyLetters = (value: string) => /^[\p{L}\s]+$/u.test(value.trim());

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Deja SOLO dígitos y recorta al largo máximo. Se usa en el onChange de todos los
// campos numéricos (teléfono, WhatsApp) para que el usuario no pueda escribir
// letras, no solo para avisarle después de enviar.
export const onlyDigits = (value: string, max = 10) => value.replace(/\D/g, '').slice(0, max);

// Teléfono de México: exactamente 10 dígitos.
export const isValidPhone = (value: string) => /^\d{10}$/.test(value.replace(/\D/g, ''));

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
