import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStoredUser,
  setSession,
  clearSession,
  setStoredUserAvatar,
  syncStoredUserRole,
  handleUnauthorized,
  AUTH_CHANGE_EVENT,
  type AuthUser,
} from './api';

const user: AuthUser = { id: 'u1', name: 'Ana', email: 'ana@dasha.mx', role: 'citizen' };

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('setSession / getStoredUser / clearSession', () => {
  it('guarda y recupera al usuario en sesión', () => {
    expect(getStoredUser()).toBeNull();
    setSession(user);
    expect(getStoredUser()).toEqual(user);
  });

  it('clearSession borra la sesión', () => {
    setSession(user);
    clearSession();
    expect(getStoredUser()).toBeNull();
  });
});

describe('setStoredUserAvatar', () => {
  it('actualiza solo el avatar sin tocar el resto del perfil', () => {
    setSession(user);
    setStoredUserAvatar('https://cdn/x.jpg');
    expect(getStoredUser()).toEqual({ ...user, avatarUrl: 'https://cdn/x.jpg' });
  });

  it('no hace nada si no hay sesión', () => {
    setStoredUserAvatar('https://cdn/x.jpg');
    expect(getStoredUser()).toBeNull();
  });
});

describe('syncStoredUserRole', () => {
  it('actualiza el rol y avisa con un evento cuando cambia', () => {
    setSession(user);
    const spy = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, spy);
    syncStoredUserRole('volunteer');
    window.removeEventListener(AUTH_CHANGE_EVENT, spy);
    expect(getStoredUser()?.role).toBe('volunteer');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no hace nada (ni avisa) si el rol es el mismo', () => {
    setSession(user);
    const spy = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, spy);
    syncStoredUserRole('citizen');
    window.removeEventListener(AUTH_CHANGE_EVENT, spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay sesión', () => {
    syncStoredUserRole('admin');
    expect(getStoredUser()).toBeNull();
  });
});

describe('handleUnauthorized', () => {
  it('con sesión: la limpia y avisa con un evento', () => {
    setSession(user);
    const spy = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, spy);
    handleUnauthorized();
    window.removeEventListener(AUTH_CHANGE_EVENT, spy);
    expect(getStoredUser()).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sin sesión: no avisa', () => {
    const spy = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, spy);
    handleUnauthorized();
    window.removeEventListener(AUTH_CHANGE_EVENT, spy);
    expect(spy).not.toHaveBeenCalled();
  });
});
