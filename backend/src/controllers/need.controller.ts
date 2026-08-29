import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class NeedController {
  // Lista CERRADA de unidades para las necesidades (no texto libre). El frontend
  // ofrece estas mismas y el backend valida contra ellas. "pesos" cubre el caso de
  // una necesidad monetaria dentro del mismo modelo de cantidad + unidad.
  static NEED_UNITS = [
    'kg',
    'bolsas',
    'latas',
    'piezas',
    'litros',
    'cobijas',
    'traslados',
    'noches',
    'pesos',
  ];

  static sanitizeUnit(value: unknown): string | null {
    const clean = String(value ?? '').trim().toLowerCase();
    return NeedController.NEED_UNITS.includes(clean) ? clean : null;
  }

  // GET /api/v1/needs - Listar todas las necesidades activas (público)
  static async getNeeds(req: Request, res: Response, next: NextFunction) {
    try {
        const needs = await prisma.need.findMany({
          where: { status: { in: ['active', 'fulfilled'] } },
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { id: true, name: true, logoUrl: true } },
            contributions: {
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } }
              },
              take: 1
            }
          }
        });
        
        // Map coveredBy for frontend
        const mappedNeeds = needs.map(need => ({
          ...need,
          coveredBy: need.contributions[0]?.user || null
        }));
        
        res.status(200).json(mappedNeeds);
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
          where: { organizationId: id, status: { in: ['active', 'fulfilled'] } },
          orderBy: { createdAt: 'desc' },
          include: {
            contributions: {
              orderBy: { createdAt: 'desc' },
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
              take: 1
            }
          }
        });
        
        // Map coveredBy for frontend
        const mappedNeeds = needs.map(need => ({
          ...need,
          coveredBy: need.contributions[0]?.user || null
        }));
        
        res.status(200).json(mappedNeeds);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/organizations/:id/needs - Crear necesidad (solo dueños/empleados)
  static async createNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { title, description, category, urgency, targetAmount, unit } = req.body;
      const userId = (req as any).user?.id;

      // La cantidad ahora es estructurada (número + unidad de lista cerrada); la
      // descripción es opcional. Solo título y categoría son obligatorios.
      if (!title || !category) {
        res.status(400).json({ error: 'Faltan campos obligatorios' });
        return;
      }

      const qty = Number(targetAmount);

      const newNeed = await prisma.need.create({
        data: {
          organizationId: id,
          title,
          description: description || '',
          category,
          urgency: urgency || 'medium',
          targetAmount: Number.isFinite(qty) && qty > 0 ? qty : 1,
          unit: NeedController.sanitizeUnit(unit)
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

      if (data.status === 'delivered' || data.status === 'covered') {
        data.status = 'fulfilled';
      }

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
      const userId = (req as any).user?.id;

      const need = await prisma.need.findUnique({ where: { id } });
      if (!need) {
        res.status(404).json({ error: 'Necesidad no encontrada' });
        return;
      }

      // Check if user is admin of this org
      const employee = await prisma.organizationEmployee.findFirst({
        where: { userId, organizationId: need.organizationId, roleInOrg: 'admin' }
      });
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!employee && user?.role !== 'admin') {
        res.status(403).json({ error: 'Solo los administradores de la organización pueden borrar necesidades' });
        return;
      }

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
      const { notes, message, amount } = req.body;
      const contributionAmount = amount ? Number(amount) : 1;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const need = await prisma.need.findUnique({ 
        where: { id },
        include: { organization: true }
      });
      if (!need) {
        res.status(404).json({ error: 'Necesidad no encontrada' });
        return;
      }

      // El aporte se crea como PENDIENTE: NO suma a lo reunido ni marca la necesidad
      // como cubierta hasta que el aliado lo confirme (confirmContribution). Así ya
      // no se "cubre al instante"; el aliado decide si lo acepta o lo rechaza.
      const contribution = await prisma.needContribution.create({
        data: {
          needId: id,
          userId,
          amount: contributionAmount,
          status: 'pending',
          notes: message || notes
        }
      });

      // Notificar a los administradores de la organización
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
        const orgAdmins = await prisma.organizationEmployee.findMany({
          where: { organizationId: need.organizationId, roleInOrg: 'admin' },
          select: { userId: true }
        });
        
        const userName = user?.name || 'Un usuario';
        const phoneInfo = user?.phone ? `, Tel: ${user.phone}` : '';
        
        const adminPushPromises = orgAdmins.map(admin => 
          NotificationService.sendNotification({
            userId: admin.userId,
            title: '¡Alguien quiere ayudar!',
            body: `${userName}${phoneInfo} quiere aportar ${contributionAmount} a la necesidad "${need.title}".`,
            type: 'system',
            link: '/portal'
          })
        );
        await Promise.allSettled(adminPushPromises);
      } catch (err) {
        console.error('Error enviando notificacion de aporte a necesidad', err);
      }

      res.status(201).json({
        message: 'Gracias por ofrecer tu ayuda. El aliado la confirmará y te avisaremos.',
        data: contribution
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/needs/contributions/:contributionId/confirm
  // El aliado CONFIRMA un aporte pendiente: recién ahí suma a lo reunido y, si se
  // alcanza la meta, marca la necesidad como cubierta. Avisa al usuario que aportó.
  static async confirmContribution(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const contributionId = req.params.contributionId as string;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const contribution = await prisma.needContribution.findUnique({
        where: { id: contributionId },
        include: { need: true }
      });
      if (!contribution) {
        res.status(404).json({ error: 'Aporte no encontrado' });
        return;
      }

      // Solo un admin/veterinario de la organización dueña de la necesidad puede confirmar.
      const employee = await prisma.organizationEmployee.findFirst({
        where: {
          userId,
          organizationId: contribution.need.organizationId,
          roleInOrg: { in: ['admin', 'veterinarian'] }
        }
      });
      const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!employee && actingUser?.role !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos para confirmar este aporte' });
        return;
      }

      if (contribution.status !== 'pending') {
        res.status(400).json({ error: 'Este aporte ya fue procesado' });
        return;
      }

      await prisma.needContribution.update({
        where: { id: contributionId },
        data: { status: 'confirmed' }
      });

      const newCoveredAmount = Number(contribution.need.coveredAmount) + Number(contribution.amount);
      const targetAmount = Number(contribution.need.targetAmount);
      await prisma.need.update({
        where: { id: contribution.needId },
        data: {
          coveredAmount: newCoveredAmount,
          status: newCoveredAmount >= targetAmount ? 'fulfilled' : 'active'
        }
      });

      // Avisar al usuario que su ayuda fue confirmada.
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        await NotificationService.sendNotification({
          userId: contribution.userId,
          title: '¡Tu ayuda fue confirmada!',
          body: `El aliado confirmó tu aporte para "${contribution.need.title}". ¡Gracias por apoyar!`,
          type: 'system',
          link: '/perfil'
        });
      } catch (err) {
        console.error('Error notificando confirmacion de aporte', err);
      }

      res.status(200).json({ message: 'Aporte confirmado' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/needs/contributions/:contributionId/reject
  // El aliado RECHAZA un aporte pendiente: no suma nada; la necesidad sigue abierta.
  static async rejectContribution(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const contributionId = req.params.contributionId as string;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const contribution = await prisma.needContribution.findUnique({
        where: { id: contributionId },
        include: { need: true }
      });
      if (!contribution) {
        res.status(404).json({ error: 'Aporte no encontrado' });
        return;
      }

      const employee = await prisma.organizationEmployee.findFirst({
        where: {
          userId,
          organizationId: contribution.need.organizationId,
          roleInOrg: { in: ['admin', 'veterinarian'] }
        }
      });
      const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!employee && actingUser?.role !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos para rechazar este aporte' });
        return;
      }

      if (contribution.status !== 'pending') {
        res.status(400).json({ error: 'Este aporte ya fue procesado' });
        return;
      }

      await prisma.needContribution.update({
        where: { id: contributionId },
        data: { status: 'rejected' }
      });

      res.status(200).json({ message: 'Aporte rechazado' });
    } catch (error) {
      next(error);
    }
  }
}
