// Onboarding por tipo (app / aliado / voluntario). Cada uno se muestra una sola
// vez por dispositivo (localStorage) y se puede reabrir con openOnboarding(kind).
export type OnboardingKind = 'app' | 'ally' | 'volunteer';

export const ONBOARDING_OPEN_EVENT = 'dasha:open-onboarding';

const KEYS: Record<OnboardingKind, string> = {
  app: 'dasha-onboarding-seen',
  ally: 'dasha-onboarding-ally-seen',
  volunteer: 'dasha-onboarding-volunteer-seen',
};

export function hasSeenOnboarding(kind: OnboardingKind = 'app'): boolean {
  try {
    return localStorage.getItem(KEYS[kind]) === '1';
  } catch {
    // Si no hay acceso a localStorage, no insistimos con el onboarding.
    return true;
  }
}

export function markOnboardingSeen(kind: OnboardingKind = 'app'): void {
  try {
    localStorage.setItem(KEYS[kind], '1');
  } catch {
    // Sin localStorage no pasa nada; solo no se recordará.
  }
}

// Reabrir un onboarding desde cualquier parte (ej. el perfil o el portal).
export function openOnboarding(kind: OnboardingKind = 'app'): void {
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_EVENT, { detail: kind }));
}
