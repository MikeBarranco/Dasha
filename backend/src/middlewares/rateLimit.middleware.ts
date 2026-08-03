import { rateLimit } from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100, // Incrementado
  message: { status: 'error', message: 'Demasiados intentos de autenticación, por favor intenta más tarde.' }
});

export const publicGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000, // Incrementado
  message: { status: 'error', message: 'Demasiadas peticiones, por favor intenta más tarde.' }
});

export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000, // Incrementado de 200 a 2000
  message: { status: 'error', message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' }
});
