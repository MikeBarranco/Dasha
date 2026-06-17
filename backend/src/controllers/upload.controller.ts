import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class UploadController {
  static async getSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = process.env.NODE_ENV === 'production' 
        ? 'dasha/prod/reports' 
        : 'dasha/staging/reports';

      // Parámetros a firmar (deben coincidir exactamente con los que mande el frontend al subir)
      const paramsToSign = {
        timestamp,
        folder
      };

      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET as string
      );

      res.status(200).json({
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder
      });
    } catch (error) {
      next(error);
    }
  }
}
