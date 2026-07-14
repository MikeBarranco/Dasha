import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  'https://staging.dashamx.me',
  'https://dashamx.me',
  'http://localhost:5173',
];

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    
    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        res.status(403).json({ error: 'CSRF validation failed: Invalid Origin' });
        return;
      }
    } else {
      // Para peticiones web (navegadores) que deben tener Origin en POSTs cross-site/same-site (según navegador)
      // En modo híbrido (app + web), si no hay Origin, asumimos que es móvil, el cual no sufre de CSRF por cookies cross-site automáticas
    }
  }
  next();
};
