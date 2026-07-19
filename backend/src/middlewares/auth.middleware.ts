import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL ERROR: JWT_SECRET must be defined in environment variables.');
}
const SECRET_TO_USE = JWT_SECRET;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
      role: string;
    }
  }
}

export type AuthRequest = Request;

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Intentar leer de cookies primero, luego del header Authorization para retrocompatibilidad temporal
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ status: 'error', message: 'No autorizado, se requiere token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_TO_USE) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Token inválido o expirado' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, SECRET_TO_USE) as { id: string; role: string };
    req.user = decoded;
  } catch (error) {
    // Ignoramos el error si el token es inválido en optionalAuth
  }
  next();
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // requireRole siempre debe ir después de requireAuth, así req.user ya existe
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'No autorizado' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ status: 'error', message: `Acceso denegado. Se requiere rol: ${role}` });
      return;
    }

    next();
  };
};
