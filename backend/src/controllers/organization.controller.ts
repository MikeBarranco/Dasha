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

  /**
   * Obtiene la ficha detallada de un aliado
   */
  static async getAllyById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      // Usamos Prisma para traer toda la jerarquía cómodamente
      const ally = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          address: true,
          phone: true,
          whatsapp: true,
          website: true,
          schedule: true,
          orgType: true,
          isVerified: true,
          // Empleados y sus perfiles de usuario
          employees: {
            where: { isVerified: true },
            select: {
              roleInOrg: true,
              user: {
                select: {
                  name: true,
                  avatarUrl: true
                }
              }
            }
          },
          // Eventos activos y futuros
          events: {
            where: {
              isActive: true,
              eventDate: { gte: new Date() }
            },
            orderBy: { eventDate: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              eventDate: true,
              address: true,
              imageUrl: true
            }
          },
          // Animales vinculados a esta organización (solo públicos)
          animals: {
            where: {
              isPublic: true,
              status: { in: ['looking_for_adoption', 'in_treatment', 'recovering', 'looking_for_foster'] }
            },
            select: {
              id: true,
              name: true,
              species: true,
              status: true,
              photos: {
                take: 1,
                orderBy: { orderIndex: 'asc' },
                select: { url: true }
              }
            }
          }
        }
      });

      if (!ally) {
        res.status(404).json({ error: 'Aliado no encontrado' });
        return;
      }

      // Para obtener la ubicación (PostGIS), hacemos una mini consulta Raw extra
      const locationRes: any[] = await prisma.$queryRaw`
        SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM organizations
        WHERE id = ${id}::uuid AND location IS NOT NULL
      `;

      let lat = null;
      let lng = null;
      if (locationRes && locationRes.length > 0) {
        lat = locationRes[0].lat;
        lng = locationRes[0].lng;
      }

      // Formatear respuesta combinada
      res.status(200).json({
        ...ally,
        lat,
        lng
      });
    } catch (error) {
      next(error);
    }
  }
}
