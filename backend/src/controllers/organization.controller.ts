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
          org_type as "orgType", is_verified as "isVerified", promo,
          ST_X(location::geometry) as lng,
          ST_Y(location::geometry) as lat
        FROM organizations
        WHERE is_active = true
          AND is_verified = true
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
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const employee = await OrganizationController.getPortalContext(req, userId);
      if (!employee) return res.status(403).json({ error: 'No perteneces a ninguna organización' });

      // Get reports assigned to this org that are currently in progress
      const incoming = await prisma.report.findMany({
        where: {
          destinationOrgId: employee.organizationId,
          status: 'in_progress'
        },
        include: {
          volunteer: { select: { id: true, name: true, avatarUrl: true, phone: true } },
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
          promo: true,
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

      const orgSelect = {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        logoPublicId: true,
        coverUrl: true,
        coverPublicId: true,
        slogan: true,
        address: true,
        phone: true,
        whatsapp: true,
        website: true,
        schedule: true,
        promo: true,
        orgType: true,
        isVerified: true,
        bankName: true,
        clabe: true,
        holderName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true,
            animals: true
          }
        }
      };

      if (user?.role === 'admin' && organizationIdParam) {
        // Si es admin global y pasa el query param, le damos acceso
        organization = await prisma.organization.findUnique({ 
          where: { id: organizationIdParam },
          select: orgSelect 
        });
        roleInOrg = 'admin'; // Le damos rol de admin en la org
      } else {
        const employee = await prisma.organizationEmployee.findFirst({
          where: { userId: user?.id, isVerified: true },
          select: {
            roleInOrg: true,
            organization: {
              select: orgSelect
            }
          }
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

      // Calcular donaciones para los animales de la organización
      let totalDonations = 0;
      if (organization.id) {
        const donationsCount = await prisma.donation.count({
          where: { animal: { organizationId: organization.id } }
        });
        totalDonations = donationsCount;
      }

      res.status(200).json({
        organization,
        role: roleInOrg,
        orgType,
        stats: {
          teamMembers: organization._count?.employees || 0,
          rescuedAnimals: organization._count?.animals || 0,
          totalDonations
        }
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
      where: { userId, isVerified: true }
    });
  }

  /**
   * Actualiza el perfil de la organización del aliado (Fase 2)
   */
  static async updateMyPortalProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { logoBase64, coverBase64, lat, lng, isVerified, id, createdAt, updatedAt, ...data } = req.body;

      if (data.phone && data.phone.length > 10) {
        res.status(400).json({ error: 'El número de teléfono no puede tener más de 10 dígitos.' });
        return;
      }
      if (data.whatsapp && data.whatsapp.length > 10) {
        res.status(400).json({ error: 'El número de WhatsApp no puede tener más de 10 dígitos.' });
        return;
      }
      
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

      // Subir cover a Cloudinary si se proporciona
      if (coverBase64 && coverBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(coverBase64, {
          folder: 'dasha/orgs'
        });
        updateData.coverUrl = uploadRes.secure_url;
        updateData.coverPublicId = uploadRes.public_id;
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
      
      if (!email) {
        res.status(400).json({ error: 'El email es obligatorio' });
        return;
      }

      let finalRole = 'veterinarian';
      if (roleInOrg === 'admin' || roleInOrg === 'assistant') {
        finalRole = roleInOrg;
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
          roleInOrg: finalRole as any,
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

      // Buscar el empleado a eliminar (buscamos por userId porque el frontend manda el userId, no el employeeId)
      const employeeToRemove = await prisma.organizationEmployee.findFirst({
        where: { userId: employeeIdToRemove, organizationId: myEmployee.organizationId }
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
          reportId: reportId,
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
              report: { connect: { id: reportId } },
              organization: { connect: { id: emp.organizationId } },
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

  static async getPortalAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee) {
        res.status(403).json({ error: 'No autorizado' });
        return;
      }

      const animals = await prisma.animalProfile.findMany({
        where: { organizationId: myEmployee.organizationId },
        include: {
          photos: { orderBy: { orderIndex: 'asc' } },
          medicalRecords: { orderBy: { createdAt: 'desc' } },
          vaccinations: { orderBy: { appliedDate: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const mappedAnimals = animals.map(animal => ({
        ...animal,
        medicalRecord: {
          sterilized: animal.isNeutered,
          vaccinations: animal.vaccinations.map(v => ({
            id: v.id,
            name: v.vaccineName,
            date: v.appliedDate
          })),
          entries: animal.medicalRecords.map(r => ({
            id: r.id,
            type: r.recordType,
            title: r.description,
            date: r.createdAt,
            notes: r.prescription || r.diagnosis || ''
          }))
        }
      }));

      res.status(200).json(mappedAnimals);
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

  static async directIntakeAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { 
        name, species, gender, breed, ageEstimation, weightKg, color, 
        features, story, photosBase64, isPublic, size, condition, description 
      } = req.body;
      
      const myEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId }
      });

      if (!myEmployee || (myEmployee.roleInOrg !== 'admin' && myEmployee.roleInOrg !== 'veterinarian')) {
        res.status(403).json({ error: 'Solo veterinarios o administradores pueden ingresar animales' });
        return;
      }

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

      // Create dummy report
      const dummyReport = await prisma.report.create({
        data: {
          userId,
          species: species || 'dog',
          primaryColor: color || 'N/A',
          size: size || 'medium',
          condition: condition || 'stable',
          description: description || 'Ingreso directo al refugio',
          status: 'closed',
          address: 'Ingreso directo',
          photos: uploadedPhotos.length > 0 ? {
            create: uploadedPhotos.map((p, i) => ({
              url: p.url,
              publicId: p.publicId,
              orderIndex: i,
              uploadedBy: userId
            }))
          } : undefined
        }
      });

      const animalData = {
        reportId: dummyReport.id,
        organizationId: myEmployee.organizationId,
        name,
        species: species || 'dog',
        breed,
        ageEstimation,
        weightKg,
        color: color || '',
        gender: gender || 'male',
        story,
        status: 'in_treatment',
        isPublic: isPublic !== undefined ? isPublic : true
      };

      const animal = await AnimalService.createProfile(animalData, uploadedPhotos);

      res.status(201).json({
        status: 'success',
        message: 'Animal ingresado directamente',
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

      const mappedData = { ...data, recordType: OrganizationController.mapToPrismaRecordType(data.recordType || '') };
      
      const record = await AnimalService.addMedicalRecord(
        animalId,
        userId, // El ID del veterinario que hace la nota
        mappedData,
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
      const { name, diagnosis, totalCostNeeded } = req.body;

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

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
      if (totalCostNeeded !== undefined) updateData.totalCostNeeded = totalCostNeeded;

      const updatedAnimal = await prisma.animalProfile.update({
        where: { id: animalId },
        data: updateData
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
            orderIndex: 0
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

      const mappedApplications = applications.map(app => {
        let extraFields: any = {};
        if (app.message && app.message.trim().startsWith('{')) {
          try {
            extraFields = JSON.parse(app.message);
          } catch (e) {
            console.error('Failed to parse adoption message JSON', e);
          }
        } else if (app.message && app.message.includes('Tipo de vivienda:')) {
          const lines = app.message.split('\n');
          for (const line of lines) {
            if (line.startsWith('Nombre:')) extraFields.applicantName = line.replace('Nombre:', '').trim();
            if (line.startsWith('WhatsApp:')) extraFields.whatsapp = line.replace('WhatsApp:', '').trim();
            if (line.startsWith('Tipo de vivienda:')) {
              const val = line.replace('Tipo de vivienda:', '').trim();
              if (val === 'casa_patio' || val === 'Casa con patio') extraFields.housingType = 'casa_patio';
              else if (val === 'casa_sin_patio' || val === 'Casa sin patio') extraFields.housingType = 'casa_sin_patio';
              else if (val === 'departamento' || val === 'Departamento') extraFields.housingType = 'departamento';
              else extraFields.housingType = val;
            }
            if (line.startsWith('¿Ha tenido mascotas?:')) extraFields.hasHadPets = line.replace('¿Ha tenido mascotas?:', '').trim() === 'Sí';
            if (line.startsWith('Otras mascotas:')) extraFields.otherPets = line.replace('Otras mascotas:', '').trim();
            if (line.startsWith('Motivo:')) extraFields.reason = line.replace('Motivo:', '').trim();
          }
        }

        return {
          ...app,
          ...extraFields,
          message: extraFields.originalMessage || extraFields.message || app.message
        };
      });

      res.status(200).json(mappedApplications);
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
  // DONACIONES Y NECESIDADES
  // ==========================================

  /**
   * Obtiene el historial de necesidades de la organización
   */
  static async getPortalNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      const needs = await prisma.need.findMany({
        where: { organizationId: myEmployee.organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          contributions: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } } },
            take: 1
          }
        }
      });
      
      const mappedNeeds = needs.map(need => ({
        ...need,
        coveredBy: need.contributions[0]?.user || null
      }));
      
      res.status(200).json(mappedNeeds);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reabre una necesidad previamente cubierta (cuando el donante no responde)
   */
  static async reopenPortalNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const needId = req.params.needId as string;
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

      if (!myEmployee) {
        res.status(403).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      const need = await prisma.need.findUnique({
        where: { id: needId }
      });

      if (!need || need.organizationId !== myEmployee.organizationId) {
        res.status(404).json({ error: 'Necesidad no encontrada o sin acceso' });
        return;
      }

      if (need.status !== 'fulfilled') {
        res.status(400).json({ error: 'La necesidad no está cubierta' });
        return;
      }

      const updated = await prisma.need.update({
        where: { id: needId },
        data: { status: 'active' }
      });

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el historial de donaciones a la organización
   */
  static async getPortalDonations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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
          user: { select: { name: true, email: true, phone: true } },
          animal: { select: { id: true, name: true } },
          donationProof: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const enrichedDonations = donations.map(d => {
        const { user, donationProof, ...rest } = d;
        return {
          ...rest,
          donor: d.isAnonymous ? { name: 'Anónimo' } : user,
          donationProof: donationProof,
          proofUrl: donationProof ? donationProof.proofUrl : null,
          proof: donationProof || null
        };
      });

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
  private static mapToPrismaRecordType(type: string): 'vaccination' | 'surgery' | 'checkup' | 'medication' | 'lab' | 'other' {
    const t = type.toLowerCase();
    if (t === 'vacuna' || t === 'vaccine' || t === 'vaccination') return 'vaccination';
    if (t === 'cirugia' || t === 'surgery') return 'surgery';
    if (t === 'peso' || t === 'weight') return 'checkup';
    if (t === 'tratamiento' || t === 'treatment') return 'medication';
    if (t === 'desparasitacion' || t === 'deworming') return 'lab';
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
          medicalRecords: { orderBy: { createdAt: 'desc' } },
          vaccinations: { orderBy: { appliedDate: 'desc' } },
          photos: { orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }] },
          timeline: { orderBy: { date: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map to frontend expected structure
      const mappedAnimals = animals.map(animal => {
        return {
          ...animal,
          medicalRecord: {
            sterilized: animal.isNeutered,
            vaccinations: animal.vaccinations.map(v => ({
              id: v.id,
              name: v.vaccineName,
              date: v.appliedDate
            })),
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
      const { sterilized, status } = req.body;

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

      const updateData: any = {};
      if (typeof sterilized === 'boolean') {
        updateData.isNeutered = sterilized;
      }
      if (typeof status === 'string') {
        const validStatuses = ['in_treatment', 'recovering', 'looking_for_foster', 'in_foster', 'looking_for_adoption', 'adopted', 'deceased'];
        let mappedStatus = status;
        
        // Auto-map from spanish or frontend slugs
        const statusMap: any = {
          'en tratamiento': 'in_treatment',
          'recuperándose': 'recovering',
          'recuperandose': 'recovering',
          'buscando hogar temporal': 'looking_for_foster',
          'en hogar temporal': 'in_foster',
          'fostered': 'in_foster',
          'buscando adopción': 'looking_for_adoption',
          'buscando hogar': 'looking_for_adoption',
          'looking_for_home': 'looking_for_adoption',
          'adoptado': 'adopted',
          'fallecido': 'deceased'
        };
        
        if (statusMap[status.toLowerCase()]) {
          mappedStatus = statusMap[status.toLowerCase()];
        }
        
        if (!validStatuses.includes(mappedStatus)) {
          res.status(400).json({ error: `Estatus inválido. Valores aceptados: ${validStatuses.join(', ')}` });
          return;
        }
        updateData.status = mappedStatus;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'Debe enviar sterilized o status para actualizar' });
        return;
      }

      const updated = await prisma.animalProfile.update({
        where: { id: animalId },
        data: updateData
      });
      res.status(200).json(updated);
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
      const { type, title, date, notes, photoUrl, photoUrls } = req.body;

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
      
      const parsedPhotoUrls = photoUrls ? photoUrls : (photoUrl ? [photoUrl] : null);

      let record: any;
      
      const safeDateStr = (date && date !== 'Hoy') ? date : undefined;
      let validDate = new Date();
      if (safeDateStr) {
        const d = new Date(safeDateStr);
        if (!isNaN(d.getTime())) validDate = d;
      }

      if (type === 'vacuna' || type === 'vaccine') {
        record = await prisma.vaccination.create({
          data: {
            animalId,
            veterinarianId: userId,
            vaccineName: title || 'Vacuna',
            appliedDate: validDate,
            notes: notes || null
          }
        });
      } else {
        record = await prisma.medicalRecord.create({
          data: {
            animalId,
            veterinarianId: userId,
            recordType: mappedType as any,
            description: title || 'Sin título',
            prescription: notes || null,
            photoUrls: parsedPhotoUrls,
            createdAt: validDate
          }
        });
      }

      // Update animal flags
      if (type === 'spay_neuter') {
        await prisma.animalProfile.update({ where: { id: animalId }, data: { isNeutered: true } });
      } else if (type === 'vacuna' || type === 'vaccine') {
        await prisma.animalProfile.update({ where: { id: animalId }, data: { isVaccinated: true } });
      } else if (type === 'deworming') {
        await prisma.animalProfile.update({ where: { id: animalId }, data: { isDewormed: true } });
      }

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

      const myEmployee = await OrganizationController.getPortalContext(req, userId);

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
