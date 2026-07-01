// Construye un enlace a WhatsApp (wa.me) con un mensaje opcional pre-escrito.
// Normaliza el número: quita todo lo que no sea dígito y antepone la lada de
// México (52) cuando viene a 10 dígitos. Devuelve null si el número no sirve,
// para no mostrar un botón roto.
export function whatsappUrl(rawPhone: string | null | undefined, message?: string): string | null {
  const digits = (rawPhone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `52${digits}` : digits;
  const base = `https://wa.me/${withCountry}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
