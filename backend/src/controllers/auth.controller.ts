import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const result = await AuthService.register(data);

      res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'El correo ya está registrado') {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        next(error);
      }
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const result = await AuthService.login(data);

      res.status(200).json({
        status: 'success',
        message: 'Sesión iniciada exitosamente',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'Credenciales inválidas') {
        res.status(401).json({ status: 'error', message: error.message });
      } else {
        next(error);
      }
    }
  }
}
