import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import { AnimalService } from './../services/animal.service';
import { NotificationService } from '../services/notification.service';

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

  // ========================================================
  // INCOMING RESCUES
  // ========================================================
  static async getIncomingRescues(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const employee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });
      if (!employee) return res.status(403).json({ error: 'No perteneces a ninguna organización' });

      // Get reports assigned to this org that are currently in progress
      const incoming = await prisma.report.findMany({
        where: {
          destinationOrgId: employee.organizationId,
          status: 'in_progress'
        },
        include: {
          volunteer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
          photos: { select: { url: true } },
          rescues: {
            where: { status: 'on_the_way' },
            orderBy: { acceptedAt: 'desc' },
            take: 1
          }
        }
      });

      // Parse geometry if necessary (currently findMany returns unsupported as undefined, 
      // but usually the frontend relies on rescues.currentLocation for live tracking).
      res.status(200).json(incoming);
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
          slogan: true,
          logoUrl: true,
          coverUrl: true,
          address: true,
          phone: true,
          whatsapp: true,
          website: true,
          schedule: true,
          orgType: true,
          isVerified: true,
          bankName: true,
          clabe: true,
          holderName: true,
          // Empleados y sus perfiles de usuario
          employees: {
            where: { isVerified: true },
            select: {
              roleInOrg: true,
              bio: true,
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

      // Map data to match frontend expectations
      const { employees, bankName, clabe, holderName, ...rest } = ally;

      const team = employees.map(emp => ({
        name: emp.user.name,
        title: emp.roleInOrg === 'veterinarian' ? 'Veterinario' : (emp.roleInOrg === 'admin' ? 'Administrador' : 'Voluntario'),
        photoUrl: emp.user.avatarUrl,
        bio: emp.bio
      }));

      const paymentInfo = (bankName || clabe || holderName) ? {
        bankName,
        clabe,
        holderName
      } : null;

      // Formatear respuesta combinada
      res.status(200).json({
        ...rest,
        team,
        paymentInfo,
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
      const user = (req as any).user;
      const organizationIdParam = req.query.organizationId as string;

      let organization = null;
      let roleInOrg = 'volunteer';
      let orgType = null;

      if (user?.role === 'admin' && organizationIdParam) {
        // Si es admin global y pasa el query param, le damos acceso
        organization = await prisma.organization.findUnique({ where: { id: organizationIdParam } });
        roleInOrg = 'admin'; // Le damos rol de admin en la org
      } else {
        const employee = await prisma.organizationEmployee.findFirst({
          where: { userId: user?.id },
          include: { organization: true }
        });
        if (employee) {
          organization = employee.organization;
          roleInOrg = employee.roleInOrg;
        }
      }

      if (!organization) {
        res.status(403).json({ error: 'No perteneces a ninguna organización aliada' });
        return;
      }

      orgType = organization.orgType;

      res.status(200).json({
        organization,
        role: roleInOrg,
        orgType
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper para resolver la organización activa del portal.
   * Si es admin global y manda ?organizationId=, devuelve esa organización simulando ser admin local.
   */
  static async getPortalContext(req: Request, userId: string) {
    const user = (req as any).user;
    const organizationIdParam = req.query.organizationId as string;

    if (user?.role === 'admin' && organizationIdParam) {
      return { organizationId: organizationIdParam, roleInOrg: 'admin' };
    }

    return await prisma.organizationEmployee.findFirst({
      where: { userId }
    });
  }

  /**
   * Actualiza el perfil de la organización del aliado (Fase 2)
   */
  static async updateMyPortalProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { logoBase64, lat, lng, ...data } = req.body;
      
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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
      
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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

      // Alias 'role' para empatar con el frontend de Miguel
      const mappedTeam = team.map(member => ({
        ...member,
        role: member.roleInOrg
      }));

      res.status(200).json(mappedTeam);
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

      const myEmployee = await OrganizationController.getPortalContext(req, adminId);

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

      const myEmployee = await OrganizationController.getPortalContext(req, adminId);

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
      
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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

      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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

  // POST /me/organization/reports/:reportId/intake
  static async intakeReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const reportId = req.params.reportId as string;

      // Buscar org a la que pertenece el usuario
      const emp = await OrganizationController.getPortalContext(req, userId);

      if (!emp) {
        res.status(403).json({ error: 'No perteneces a una organización' });
        return;
      }

      // Validar reporte
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { photos: true }
      });

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // 1. Cambiar reporte a rescued
        await tx.report.update({
          where: { id: reportId },
          data: { status: 'rescued' }
        });

        // 2. Si no tiene perfil, crearlo
        const existingProfile = await tx.animalProfile.findUnique({ where: { reportId } });
        if (!existingProfile) {
          const profile = await tx.animalProfile.create({
            data: {
              reportId,
              organizationId: emp.organizationId,
              name: `Rescatado #${report.id.substring(0, 4)}`,
              species: report.species,
              status: 'in_treatment',
              // Copy first photo if exists
              photos: report.photos.length > 0 ? {
                create: {
                  url: report.photos[0].url,
                  publicId: report.photos[0].publicId,
                  orderIndex: 0
                }
              } : undefined
            }
          });

          // 3. Crear primer timeline event
          await tx.animalTimelineEvent.create({
            data: {
              animalId: profile.id,
              date: new Date(),
              type: 'admitted',
              title: 'Ingreso a Rehabilitación',
              description: 'El animal fue ingresado a la clínica para su evaluación y tratamiento.'
            }
          });
        }
        
        // Finalizar asignaciones activas y dar XP a los voluntarios
        const activeAssignments = await tx.rescueAssignment.findMany({
          where: { reportId, status: { in: ['accepted', 'on_the_way', 'arrived'] as any[] } }
        });

        for (const assignment of activeAssignments) {
          await tx.user.update({
            where: { id: assignment.volunteerId },
            data: { experiencePoints: { increment: 20 } } // 20 XP por rescate completado
          });
          
          await tx.reputationEvent.create({
            data: {
              userId: assignment.volunteerId,
              reason: 'rescue',
              points: 20
            }
          });
        }

        await tx.rescueAssignment.updateMany({
          where: { reportId, status: { in: ['accepted', 'on_the_way', 'arrived'] as any[] } },
          data: { status: 'completed', completedAt: new Date() }
        });
      });

      res.status(200).json({ message: 'Ingreso completado. Reporte marcado como rescatado y perfil creado.' });
    } catch (error) {
      next(error);
    }
  }

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

  /**
   * Actualiza expediente básico (nombre y diagnóstico)
   */
  static async updatePortalAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.animalId as string;
      const { name, diagnosis } = req.body;

      const myEmployee = await OrganizationController.getPortalContext(req, userId);

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden actualizar expedientes' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Este animal no se encuentra en tu organización' });
        return;
      }

      const updatedAnimal = await prisma.animalProfile.update({
        where: { id: animalId },
        data: { name, currentDiagnosis: diagnosis }
      });

      res.status(200).json(updatedAnimal);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agrega fotos a la galería del animal (progreso)
   */
  static async addPortalAnimalPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.animalId as string;
      const { photosBase64 } = req.body;

      const myEmployee = await OrganizationController.getPortalContext(req, userId);

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden agregar fotos' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Este animal no se encuentra en tu organización' });
        return;
      }

      if (!photosBase64 || !Array.isArray(photosBase64) || photosBase64.length === 0) {
        res.status(400).json({ error: 'Se requiere al menos una foto en base64' });
        return;
      }

      const uploadedPhotos = [];
      for (const base64Str of photosBase64) {
        const uploadResult = await cloudinary.uploader.upload(base64Str, {
          folder: 'dasha_animals',
        });
        const newPhoto = await prisma.animalPhoto.create({
          data: {
            animalId,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            isPrimary: false,
            orderIndex: 99
          }
        });
        uploadedPhotos.push(newPhoto);
      }

      res.status(201).json({ message: 'Fotos agregadas exitosamente', photos: uploadedPhotos });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Añade un evento a la línea de tiempo del animal y notifica a los seguidores
   */
  static async addPortalTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.animalId as string;
      const { title, description, type } = req.body;

      if (!title || !type) {
        res.status(400).json({ error: 'Título y tipo son obligatorios' });
        return;
      }

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden publicar avances' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({
        where: { id: animalId },
        include: { followers: true }
      });
      
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Este animal no se encuentra en tu organización' });
        return;
      }

      const timelineEvent = await prisma.animalTimelineEvent.create({
        data: {
          animalId,
          title,
          description,
          type,
          date: new Date()
        }
      });

      // Notificar a todos los seguidores
      if (animal.followers && animal.followers.length > 0) {
        for (const follower of animal.followers) {
          await NotificationService.sendNotification({
            userId: follower.userId,
            title: `🐾 ¡Nuevas noticias de ${animal.name}!`,
            body: title,
            type: 'system', // or define a new NotifType 'animal_update'
            referenceId: animalId,
            referenceType: 'animal_profile',
            link: `/animals/${animalId}`
          });
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'Avance publicado exitosamente',
        data: timelineEvent
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PORTAL DE ALIADOS (ADOPCIONES)
  // ==========================================

  static async getPortalAdoptions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      const applications = await prisma.adoptionApplication.findMany({
        where: {
          animal: { organizationId: myEmployee.organizationId }
        },
        include: {
          applicant: { select: { name: true, email: true, phone: true } },
          animal: { select: { id: true, name: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  }

  static async approvePortalAdoption(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const applicationId = req.params.applicationId as string;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'No tienes permisos para aprobar adopciones' });
        return;
      }

      const application = await prisma.adoptionApplication.findUnique({
        where: { id: applicationId },
        include: { animal: true }
      });

      if (!application || application.animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Solicitud no encontrada' });
        return;
      }

      if (application.status !== 'pending') {
        res.status(400).json({ error: 'Esta solicitud ya fue procesada' });
        return;
      }

      // Update application and animal in a transaction
      const updatedApplication = await prisma.$transaction(async (tx) => {
        // 1. Mark application as approved
        const app = await tx.adoptionApplication.update({
          where: { id: applicationId },
          data: {
            status: 'approved',
            reviewedBy: userId
          }
        });

        // 2. Mark animal as adopted and link to new owner
        await tx.animalProfile.update({
          where: { id: application.animalId },
          data: {
            status: 'adopted',
            adoptedByUserId: application.applicantId,
            adoptedAt: new Date()
          }
        });

        // 3. Mark all other pending applications for this animal as rejected
        await tx.adoptionApplication.updateMany({
          where: { 
            animalId: application.animalId,
            id: { not: applicationId },
            status: 'pending'
          },
          data: {
            status: 'rejected',
            reviewedBy: userId
          }
        });

        // 4. Send notification to the approved user
        await NotificationService.sendNotification({
          userId: application.applicantId,
          title: `🎉 ¡Solicitud Aprobada!`,
          body: `¡Felicidades! Tu solicitud de adopción para ${application.animal.name} ha sido aprobada. La clínica se pondrá en contacto contigo pronto.`,
          type: 'system',
          referenceId: application.animalId,
          referenceType: 'animal_profile',
          link: `/animals/${application.animalId}`
        });

        return app;
      });

      res.status(200).json({ message: 'Solicitud aprobada exitosamente', application: updatedApplication });
    } catch (error) {
      next(error);
    }
  }

  static async rejectPortalAdoption(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const applicationId = req.params.applicationId as string;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'No tienes permisos para rechazar adopciones' });
        return;
      }

      const application = await prisma.adoptionApplication.findUnique({
        where: { id: applicationId },
        include: { animal: true }
      });

      if (!application || application.animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Solicitud no encontrada' });
        return;
      }

      const updatedApplication = await prisma.adoptionApplication.update({
        where: { id: applicationId },
        data: {
          status: 'rejected',
          reviewedBy: userId
        }
      });

      res.status(200).json({ message: 'Solicitud rechazada', application: updatedApplication });
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

  // ==========================================
  // CARTILLA MEDICA (Rutas Frontend Específicas: /me/organization/animals)
  // ==========================================

  /**
   * Helper function: Maps frontend entry type to Prisma RecordType
   */
  private static mapToPrismaRecordType(type: string): 'vaccination' | 'surgery' | 'checkup' | 'other' {
    const t = type.toLowerCase();
    if (t === 'vacuna' || t === 'vaccine' || t === 'vaccination') return 'vaccination';
    if (t === 'cirugia' || t === 'surgery') return 'surgery';
    if (t === 'peso' || t === 'weight' || t === 'tratamiento' || t === 'treatment' || t === 'desparasitacion' || t === 'deworming' || t === 'checkup') return 'checkup';
    return 'other';
  }

  /**
   * GET /api/v1/me/organization/animals
   */
  static async getOrganizationAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const organizationIdParam = req.query.organizationId as string;
      
      let targetOrgId = '';

      if (user?.role === 'admin' && organizationIdParam) {
        targetOrgId = organizationIdParam;
      } else {
        const myEmployee = await prisma.organizationEmployee.findFirst({
          where: { userId: user?.id }
        });

        if (!myEmployee) {
          res.status(403).json({ error: 'No perteneces a ninguna organización' });
          return;
        }
        targetOrgId = myEmployee.organizationId;
      }

      const animals = await prisma.animalProfile.findMany({
        where: { organizationId: targetOrgId },
        include: {
          medicalRecords: { orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map to frontend expected structure
      const mappedAnimals = animals.map(animal => {
        return {
          ...animal,
          medicalRecord: {
            sterilized: animal.isNeutered,
            entries: animal.medicalRecords.map(r => ({
              id: r.id,
              type: r.recordType,
              title: r.description,
              date: r.createdAt,
              notes: r.prescription || r.diagnosis || ''
            }))
          }
        };
      });

      res.status(200).json(mappedAnimals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/me/organization/animals/:id
   */
  static async updateAnimalSterilized(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;
      const { sterilized } = req.body;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No tienes permisos' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Animal no encontrado en tu organización' });
        return;
      }

      if (typeof sterilized === 'boolean') {
        const updated = await prisma.animalProfile.update({
          where: { id: animalId },
          data: { isNeutered: sterilized }
        });
        res.status(200).json(updated);
      } else {
        res.status(400).json({ error: 'Valor inválido para sterilized' });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/me/organization/animals/:id/medical
   */
  static async addAnimalMedicalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;
      const { type, title, date, notes } = req.body;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No tienes permisos' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Animal no encontrado en tu organización' });
        return;
      }

      const mappedType = OrganizationController.mapToPrismaRecordType(type || 'other');

      const record = await prisma.medicalRecord.create({
        data: {
          animalId,
          veterinarianId: userId,
          recordType: mappedType as any,
          description: title || 'Sin título',
          prescription: notes || null,
          createdAt: date ? new Date(date) : new Date()
        }
      });

      res.status(201).json({
        id: record.id,
        type: record.recordType,
        title: record.description,
        date: record.createdAt,
        notes: record.prescription || ''
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/me/organization/animals/:id/medical/:entryId
   */
  static async deleteAnimalMedicalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;
      const entryId = req.params.entryId as string;

      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No tienes permisos' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal || animal.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Animal no encontrado en tu organización' });
        return;
      }

      const record = await prisma.medicalRecord.findUnique({ where: { id: entryId } });
      if (!record || record.animalId !== animalId) {
        res.status(404).json({ error: 'Registro médico no encontrado' });
        return;
      }

      await prisma.medicalRecord.delete({ where: { id: entryId } });

      res.status(200).json({ message: 'Registro médico eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}
