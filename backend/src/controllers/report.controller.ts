import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { ReportService } from '../services/report.service';

// Configurar Cloudinary (toma las credenciales de process.env automáticamente)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ReportController {
  
  static async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoBase64, photos, ...restData } = req.body;
      const userId = (req as any).user?.id; // Inyectado por el auth.middleware
      
      let finalPhotos = photos || [];

      // Si aún mandan photoBase64 (flujo antiguo), lo subimos desde el backend
      if (photoBase64) {
        const uploadResult = await cloudinary.uploader.upload(photoBase64, {
          folder: 'dasha_reports',
        });
        finalPhotos.push({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      }

      // Asegurar regla estricta de BD.txt (guardar url y public_id obligatoriamente)
      const data = {
        ...restData,
        userId: userId || restData.userId, // Prioriza el del JWT
        photos: finalPhotos
      };

      const report = await ReportService.createReport(data);
      
      res.status(201).json({
        status: 'success',
        message: 'Reporte creado correctamente con coordenadas.',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat, lng, radius_km, species, status } = req.query as any;
      
      const reports = await ReportService.getNearbyReports(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius_km),
        species,
        status
      );

      res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await ReportService.getAllActiveReports();
      // El contrato de Miguel pide regresar el arreglo directamente, sin envolverlo en "data"
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async getReportById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const report = await ReportService.getReportById(id);
      
      if (!report) {
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }
}
