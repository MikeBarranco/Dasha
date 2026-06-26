import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/uploads/signature (Protegido, solo usuarios logueados pueden subir fotos)
router.post('/signature', requireAuth, UploadController.getSignature);

export default router;
