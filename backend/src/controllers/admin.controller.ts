import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class AdminController {
  // ==========================================
  // USUARIOS
  // ==========================================
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      // Cascade delete relies on schema referential actions. Prisma usually requires manual cascade if not defined in schema.
      // We will try deleting the user. If Prisma throws a foreign key error, we'd need to manually delete relations.
      // But for this MVP, we use Prisma's delete.
      await prisma.user.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // REPORTES
  // ==========================================
  static async getAllReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          photos: true
        }
      });
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async updateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;
      const updated = await prisma.report.update({
        where: { id },
        data
      });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.report.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Reporte eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ORGANIZACIONES / ALIADOS
  // ==========================================
  static async getAllOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(orgs);
    } catch (error) {
      next(error);
    }
  }

  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { logoBase64, lat, lng, ...data } = req.body;
      
      let logoUrl = null;
      let logoPublicId = null;

      if (logoBase64) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        logoUrl = uploadRes.secure_url;
        logoPublicId = uploadRes.public_id;
      }

      // We cannot set PostGIS location via Prisma directly in `create` if it's Unsupported.
      // So we first create the org, then update location with raw SQL.
      const org = await prisma.organization.create({
        data: {
          ...data,
          logoUrl,
          logoPublicId
        }
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${org.id}::uuid;
        `;
      }

      res.status(201).json(org);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { logoBase64, lat, lng, ...data } = req.body;
      
      const updateData: any = { ...data };

      if (logoBase64 && logoBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        updateData.logoUrl = uploadRes.secure_url;
        updateData.logoPublicId = uploadRes.public_id;
      }

      const updated = await prisma.organization.update({
        where: { id },
        data: updateData
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${updated.id}::uuid;
        `;
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.organization.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Organización eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ANIMALES EN REHABILITACIÓN
  // ==========================================
  static async getAllAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const animals = await prisma.animalProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          photos: true,
          organization: { select: { name: true } }
        }
      });
      res.status(200).json(animals);
    } catch (error) {
      next(error);
    }
  }

  static async createAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const { photosBase64, ...data } = req.body; // photosBase64 is an array of strings
      
      const animal = await prisma.animalProfile.create({
        data
      });

      if (photosBase64 && Array.isArray(photosBase64)) {
        for (let i = 0; i < photosBase64.length; i++) {
          const b64 = photosBase64[i];
          const uploadRes = await cloudinary.uploader.upload(b64, {
            folder: 'dasha/animals'
          });
          await prisma.animalPhoto.create({
            data: {
              animalId: animal.id,
              url: uploadRes.secure_url,
              publicId: uploadRes.public_id,
              orderIndex: i
            }
          });
        }
      }

      res.status(201).json(animal);
    } catch (error) {
      next(error);
    }
  }

  static async updateAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { photosBase64, ...data } = req.body;
      
      const updated = await prisma.animalProfile.update({
        where: { id },
        data
      });

      // If new photos are provided, we could append them or replace them.
      // We will append them here.
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (let i = 0; i < photosBase64.length; i++) {
          const b64 = photosBase64[i];
          if (b64.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(b64, {
              folder: 'dasha/animals'
            });
            await prisma.animalPhoto.create({
              data: {
                animalId: updated.id,
                url: uploadRes.secure_url,
                publicId: uploadRes.public_id,
                orderIndex: 99 // simplistic order append
              }
            });
          }
        }
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.animalProfile.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Animal eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FORO
  // ==========================================
  static async getAllForumPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const posts = await prisma.forumPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { replies: true } }
        }
      });
      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumPost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.forumPost.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Post del foro eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumReply(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.forumReply.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Respuesta del foro eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // SOLICITUDES DE VOLUNTARIADO
  // ==========================================
  static async getVolunteerApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const applications = await prisma.user.findMany({
        where: {
          volunteerStatus: { not: null }
        },
        select: {
          id: true,
          name: true,
          email: true,
          volunteerStatus: true,
          ineFrontUrl: true,
          ineBackUrl: true,
          selfieUrl: true,
          isFoster: true,
          fosterCapacity: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  }

  static async updateVolunteerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body; // 'approved' o 'rejected'

      if (status !== 'approved' && status !== 'rejected') {
        res.status(400).json({ error: 'El estado debe ser approved o rejected' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      // Actualizar estado (y rol si es aprobado)
      const dataToUpdate: any = { volunteerStatus: status };
      if (status === 'approved') {
        dataToUpdate.role = 'volunteer';
      }

      // Si aprueban o rechazan, por privacidad destruimos el INE y selfie (tal como pidió Isabel)
      // Nota: Si queremos destruir en Cloudinary necesitamos extraer el public_id de la URL.
      // Como guardamos las URLs directas (y no el publicId para los usuarios), 
      // extraer el public_id de una URL de Cloudinary estándar:
      const extractPublicId = (url: string) => {
        const parts = url.split('/');
        const fileWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const id = fileWithExt.split('.')[0];
        return `${folder}/${id}`; // dasha/volunteers/xxx
      };

      if (user.ineFrontUrl) await cloudinary.uploader.destroy(extractPublicId(user.ineFrontUrl)).catch(() => {});
      if (user.ineBackUrl) await cloudinary.uploader.destroy(extractPublicId(user.ineBackUrl)).catch(() => {});
      if (user.selfieUrl) await cloudinary.uploader.destroy(extractPublicId(user.selfieUrl)).catch(() => {});

      // Limpiamos las URLs de la BD para ahorrar espacio visual y por seguridad
      dataToUpdate.ineFrontUrl = null;
      dataToUpdate.ineBackUrl = null;
      dataToUpdate.selfieUrl = null;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          volunteerStatus: true,
          role: true
        }
      });

      res.status(200).json({ message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`, user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
}
