// Estado del onboarding (primera entrada a la app). Se guarda por dispositivo
// en localStorage para mostrarlo una sola vez; se puede reabrir desde el perfil.
const KEY = 'dasha-onboarding-seen';
export const ONBOARDING_OPEN_EVENT = 'dasha:open-onboarding';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Si no hay acceso a localStorage, no insistimos con el onboarding.
    return true;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Sin localStorage no pasa nada; solo no se recordará.
  }
}

// Reabrir el onboarding desde cualquier parte (ej. el perfil).
export function openOnboarding(): void {
  window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
}
