import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import { AnimalService } from './../services/animal.service';

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

  // ==========================================
  // PORTAL DE ALIADOS (ZONA PRIVADA)
  // ==========================================

  /**
   * Obtiene la organización a la que pertenece el usuario autenticado
   */
  static async getMyPortalProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const employee = await prisma.organizationEmployee.findFirst({
        where: { userId },
        include: { organization: true }
      });

      if (!employee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización aliada' });
        return;
      }

      res.status(200).json(employee.organization);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza el perfil de la organización del aliado (Fase 2)
   */
  static async updateMyPortalProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { logoBase64, lat, lng, ...data } = req.body;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos de administrador en esta organización' });
        return;
      }

      const updateData: any = { ...data };

      // Subir logo a Cloudinary si se proporciona
      if (logoBase64 && logoBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        updateData.logoUrl = uploadRes.secure_url;
        updateData.logoPublicId = uploadRes.public_id;
      }

      const updatedOrg = await prisma.organization.update({
        where: { id: myEmployee.organizationId },
        data: updateData
      });

      // Actualizar ubicación PostGIS si se proporcionan coordenadas
      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${updatedOrg.id}::uuid;
        `;
      }

      res.status(200).json({ message: 'Perfil actualizado exitosamente', organization: updatedOrg });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el equipo de la organización del usuario
   */
  static async getMyPortalTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización aliada' });
        return;
      }

      const team = await prisma.organizationEmployee.findMany({
        where: { organizationId: myEmployee.organizationId },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } }
        }
      });

      res.status(200).json(team);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invita/Agrega a un nuevo miembro al equipo por email
   */
  static async addTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.id;
      const { email, roleInOrg } = req.body;
      
      if (!email || !roleInOrg) {
        res.status(400).json({ error: 'El email y el rol son obligatorios' });
        return;
      }

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId: adminId }
      });

      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos de administrador en esta organización' });
        return;
      }

      // Buscar al usuario por email
      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        res.status(404).json({ error: 'Usuario no encontrado en la plataforma Dasha' });
        return;
      }

      // Verificar si ya pertenece a otra organización o a esta misma
      const existingEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId: targetUser.id }
      });

      if (existingEmployee) {
        res.status(400).json({ error: 'Este usuario ya es miembro de una organización' });
        return;
      }

      const newMember = await prisma.organizationEmployee.create({
        data: {
          organizationId: myEmployee.organizationId,
          userId: targetUser.id,
          roleInOrg: roleInOrg,
          isVerified: true,
          invitedEmail: email
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } }
        }
      });

      res.status(201).json({ message: 'Miembro agregado exitosamente', member: newMember });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina a un miembro del equipo
   */
  static async removeTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.id;
      const employeeIdToRemove = req.params.employeeId as string;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId: adminId }
      });

      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos de administrador en esta organización' });
        return;
      }

      // Buscar el empleado a eliminar
      const employeeToRemove = await prisma.organizationEmployee.findUnique({
        where: { id: employeeIdToRemove }
      });

      if (!employeeToRemove || employeeToRemove.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'El miembro no pertenece a tu organización' });
        return;
      }

      if (employeeToRemove.userId === adminId) {
        res.status(400).json({ error: 'No puedes eliminarte a ti mismo. Contacta a soporte.' });
        return;
      }

      await prisma.organizationEmployee.delete({
        where: { id: employeeIdToRemove }
      });

      res.status(200).json({ message: 'Miembro eliminado del equipo' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene reportes activos cercanos a la organización (Radar)
   */
  static async getNearbyReports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const radiusKm = Number(req.query.radius) || 10;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      // Obtener lat/lng de la org
      const locationRes: any[] = await prisma.$queryRaw`
        SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM organizations
        WHERE id = ${myEmployee.organizationId}::uuid AND location IS NOT NULL
      `;

      if (!locationRes || locationRes.length === 0) {
        res.status(400).json({ error: 'La organización no tiene ubicación configurada' });
        return;
      }

      const lat = locationRes[0].lat;
      const lng = locationRes[0].lng;

      // Buscar reportes a menos de radiusKm
      const radiusMeters = radiusKm * 1000;
      
      const nearbyReports: any[] = await prisma.$queryRaw`
        SELECT id, species, "primary_color", size, condition, urgency, description,
          ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat,
          created_at as "createdAt"
        FROM reports
        WHERE status = 'active'
          AND location IS NOT NULL
          AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
        ORDER BY created_at DESC;
      `;

      res.status(200).json(nearbyReports);
    } catch (error) {
      next(error);
    }
  }

  /**
   * La organización ofrece sus instalaciones para recibir al animal
   */
  static async offerResourceForReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const reportId = req.params.reportId as string;
      const { resourceType, description, estimatedValue } = req.body;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      // Crear oferta de recurso
      const resource = await prisma.resource.create({
        data: {
          providerId: userId,
          organizationId: myEmployee.organizationId,
          reportId,
          resourceType: resourceType || 'medical_service',
          title: 'Oferta de recepción/atención médica',
          description: description || 'La clínica está dispuesta a recibir al animalito.',
          estimatedValue: estimatedValue || 0,
          status: 'offered'
        }
      });

      res.status(201).json({ message: 'Oferta enviada exitosamente', resource });
    } catch (error) {
      next(error);
    }
  }

  /**
   * La organización despacha a un miembro de su equipo para el rescate
   */
  static async startRescueAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const reportId = req.params.reportId as string;
      const { volunteerId, etaMinutes } = req.body;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos de administrador en esta organización' });
        return;
      }

      // Validar que el voluntario asignado pertenezca a la org
      const volunteerEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId: volunteerId, organizationId: myEmployee.organizationId }
      });

      if (!volunteerEmployee) {
        res.status(400).json({ error: 'El voluntario asignado no pertenece a tu organización' });
        return;
      }

      // Crear asignación
      const assignment = await prisma.rescueAssignment.create({
        data: {
          reportId,
          volunteerId,
          etaMinutes: etaMinutes || 30,
          status: 'accepted'
        }
      });

      // Actualizar el estado del reporte a in_progress
      await prisma.report.update({
        where: { id: reportId },
        data: { 
          status: 'in_progress',
          volunteerId: volunteerId,
          destinationOrgId: myEmployee.organizationId
        }
      });

      res.status(201).json({ message: 'Rescate iniciado', assignment });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PORTAL DE ALIADOS (CARTILLA E INGRESO)
  // ==========================================

  /**
   * Ingresa un nuevo animal a la clínica y crea su perfil
   */
  static async createPortalAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { photosBase64, ...data } = req.body;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden ingresar animales' });
        return;
      }

      // Forzar que el animal pertenezca a esta organización
      data.organizationId = myEmployee.organizationId;
      data.status = data.status || 'in_treatment';

      const uploadedPhotos = [];
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (const base64Str of photosBase64) {
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'dasha_animals',
          });
          uploadedPhotos.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          });
        }
      }

      const animal = await AnimalService.createProfile(data, uploadedPhotos);

      res.status(201).json({
        status: 'success',
        message: 'Animal ingresado correctamente a la clínica',
        data: animal
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Añade una nota/expediente a la cartilla médica del animal
   */
  static async addPortalAnimalRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.animalId as string;
      const { photosBase64, ...data } = req.body;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden agregar expedientes médicos' });
        return;
      }

      // Verificar que el animal pertenezca a la misma organización
      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Este animal no se encuentra en tu organización' });
        return;
      }

      const uploadedPhotosData = [];
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (const base64Str of photosBase64) {
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'dasha_medical_records',
          });
          uploadedPhotosData.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          });
        }
      }

      const record = await AnimalService.addMedicalRecord(
        animalId,
        userId, // El ID del veterinario que hace la nota
        data,
        uploadedPhotosData
      );

      res.status(201).json({
        status: 'success',
        message: 'Nota médica agregada exitosamente',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PORTAL DE ALIADOS (DONACIONES)
  // ==========================================

  /**
   * Obtiene el historial de donaciones a la organización
   */
  static async getPortalDonations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      // Buscar donaciones de los animales de la organización
      const donations = await prisma.donation.findMany({
        where: {
          animal: { organizationId: myEmployee.organizationId }
        },
        include: {
          user: { select: { name: true, email: true } },
          animal: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' }
      });

      const donationIds = donations.map(d => d.id);
      
      const properProofs = await prisma.donationProof.findMany({
         where: { donationId: { in: donationIds } }
      });
      
      const proofsByDonationId = new Map();
      properProofs.forEach(p => proofsByDonationId.set(p.donationId, p));

      const enrichedDonations = donations.map(d => ({
        ...d,
        proof: proofsByDonationId.get(d.id) || null
      }));

      res.status(200).json(enrichedDonations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aprueba una donación confirmando recepción de fondos
   */
  static async approvePortalDonation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const donationId = req.params.donationId as string;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      // Se usa un simple chequeo. En el futuro se puede añadir rol 'accountant'
      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos de administrador para aprobar donaciones' });
        return;
      }

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: { animal: true }
      });

      if (!donation || donation.animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Donación no encontrada o no pertenece a tu organización' });
        return;
      }

      if (donation.status === 'approved') {
        res.status(400).json({ error: 'Esta donación ya fue aprobada' });
        return;
      }

      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          rejectReason: null
        }
      });

      res.status(200).json({ message: 'Donación aprobada', donation: updatedDonation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechaza una donación
   */
  static async rejectPortalDonation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const donationId = req.params.donationId as string;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'El motivo de rechazo es obligatorio' });
        return;
      }

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || myEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permisos para rechazar donaciones' });
        return;
      }

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: { animal: true }
      });

      if (!donation || donation.animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Donación no encontrada o no pertenece a tu organización' });
        return;
      }

      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'rejected',
          approvedBy: userId,
          rejectReason: reason
        }
      });

      res.status(200).json({ message: 'Donación rechazada', donation: updatedDonation });
    } catch (error) {
      next(error);
    }
  }
}
