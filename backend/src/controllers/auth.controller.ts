import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const result = await AuthService.register(data);

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

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

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

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

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      res.clearCookie('token', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
      });
      res.status(200).json({
        status: 'success',
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error: any) {
      next(error);
    }
  }
}
