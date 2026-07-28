import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class ColonyController {
  
  static async searchByPostalCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { cp } = req.query;

      if (!cp || typeof cp !== 'string') {
        res.status(400).json({ error: 'Debes proveer un código postal válido (?cp=72000)' });
        return;
      }

      // Usar $queryRaw para extraer el centroide usando ST_Centroid
      const colonies: any[] = await prisma.$queryRaw`
        SELECT 
          id,
          name, 
          postal_code as "postalCode", 
          ST_X(ST_Centroid(geometry::geometry)) as lng, 
          ST_Y(ST_Centroid(geometry::geometry)) as lat 
        FROM colonies 
        WHERE postal_code = ${cp}
        ORDER BY name ASC;
      `;

      res.status(200).json(colonies);
    } catch (error) {
      next(error);
    }
  }

  static async searchByName(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.length < 3) {
        res.status(400).json({ error: 'Debes proveer un término de búsqueda válido (?q=texto, mín 3 caracteres)' });
        return;
      }

      const searchTerm = `%${q}%`;

      const colonies: any[] = await prisma.$queryRaw`
        SELECT 
          id,
          name, 
          postal_code as "postalCode", 
          ST_X(ST_Centroid(geometry::geometry)) as lng, 
          ST_Y(ST_Centroid(geometry::geometry)) as lat 
        FROM colonies 
        WHERE name ILIKE ${searchTerm}
        ORDER BY name ASC
        LIMIT 20;
      `;

      res.status(200).json(colonies);
    } catch (error) {
      next(error);
    }
  }
}
