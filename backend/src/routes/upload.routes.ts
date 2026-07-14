import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint que devuelve la firma y los parámetros para subir a Cloudinary
router.post('/signature', requireAuth, UploadController.getSignature);

// Proxy para agregar marca de agua
router.get('/proxy', UploadController.proxyImage);

export default router;
