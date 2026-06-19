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
}
