import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  openOnboarding,
  ONBOARDING_OPEN_EVENT,
} from './onboarding';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('hasSeenOnboarding / markOnboardingSeen', () => {
  it('por defecto (app) no se ha visto hasta marcarlo', () => {
    expect(hasSeenOnboarding()).toBe(false);
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('cada tipo (app/ally/volunteer) se recuerda por separado', () => {
    markOnboardingSeen('ally');
    expect(hasSeenOnboarding('ally')).toBe(true);
    expect(hasSeenOnboarding('volunteer')).toBe(false);
    expect(hasSeenOnboarding('app')).toBe(false);
  });
});

describe('openOnboarding', () => {
  it('dispara el evento con el tipo en detail', () => {
    let received: string | null = null;
    const handler = (e: Event) => {
      received = (e as CustomEvent).detail;
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    openOnboarding('volunteer');
    window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
    expect(received).toBe('volunteer');
  });
});
