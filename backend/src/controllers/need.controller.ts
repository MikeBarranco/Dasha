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
}
