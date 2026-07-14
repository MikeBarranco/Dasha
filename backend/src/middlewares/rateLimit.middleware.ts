import { rateLimit } from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { status: 'error', message: 'Demasiados intentos de autenticación, por favor intenta más tarde.' }
});

export const publicGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  message: { status: 'error', message: 'Demasiadas peticiones, por favor intenta más tarde.' }
});

export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: { status: 'error', message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' }
});
