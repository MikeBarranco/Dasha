import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class NeedController {
  // GET /api/v1/needs - Listar todas las necesidades activas (público)
  static async getNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const needs = await prisma.need.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, logoUrl: true } }
        }
      });
      res.status(200).json(needs);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/organizations/portal/needs - Listar necesidades del portal
  static async getMyPortalNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      const needs = await prisma.need.findMany({
        where: { organizationId: myEmployee.organizationId },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(needs);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/organizations/:id/needs - Listar necesidades de una org específica
  static async getOrganizationNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const needs = await prisma.need.findMany({
        where: { organizationId: id, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(needs);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/organizations/:id/needs - Crear necesidad (solo dueños/empleados)
  static async createNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { title, description, category, urgency } = req.body;
      const userId = (req as any).user?.id;

      if (!title || !description || !category) {
        res.status(400).json({ error: 'Faltan campos obligatorios' });
        return;
      }
      
      const newNeed = await prisma.need.create({
        data: {
          organizationId: id,
          title,
          description,
          category,
          urgency: urgency || 'medium'
        }
      });

      res.status(201).json(newNeed);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/needs/:id - Actualizar necesidad
  static async updateNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      const updated = await prisma.need.update({
        where: { id },
        data
      });

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/needs/:id - Eliminar necesidad
  static async deleteNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      await prisma.need.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Necesidad eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/needs/:id/cover - Ofrecer ayuda con una necesidad
  static async coverNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;
      const { notes } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const need = await prisma.need.findUnique({ where: { id } });
      if (!need) {
        res.status(404).json({ error: 'Necesidad no encontrada' });
        return;
      }

      const contribution = await prisma.needContribution.create({
        data: {
          needId: id,
          userId,
          notes
        }
      });

      res.status(201).json({
        message: 'Gracias por ofrecer tu ayuda. La organización ha sido notificada.',
        data: contribution
      });
    } catch (error) {
      next(error);
    }
  }
}
