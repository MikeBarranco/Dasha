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
      const { photoBase64, ...restData } = req.body;
      const userId = (req as any).user?.id; // Inyectado por el auth.middleware
      
      // Subir la imagen a Cloudinary (Base64)
      const uploadResult = await cloudinary.uploader.upload(photoBase64, {
        folder: 'dasha_reports',
      });

      // Asegurar regla estricta de BD.txt (guardar url y public_id obligatoriamente)
      const data = {
        ...restData,
        userId: userId || restData.userId, // Prioriza el del JWT
        photos: [
          {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
          }
        ]
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
}
