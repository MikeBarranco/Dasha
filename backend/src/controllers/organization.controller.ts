import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class OrganizationController {
  /**
   * B.1: Obtiene las organizaciones aliadas (veterinarias, refugios, ONGs)
   */
  static async getAllies(req: Request, res: Response, next: NextFunction) {
    try {
      // Usamos $queryRaw para extraer lat y lng fácilmente de PostGIS
      const allies: any[] = await prisma.$queryRaw`
        SELECT 
          id, name, description, logo_url as "logoUrl", address, phone, whatsapp, 
          org_type as "orgType", is_verified as "isVerified",
          ST_X(location::geometry) as lng,
          ST_Y(location::geometry) as lat
        FROM organizations
        WHERE is_active = true
          AND location IS NOT NULL
        ORDER BY created_at DESC;
      `;

      res.status(200).json(allies);
    } catch (error) {
      next(error);
    }
  }
}
