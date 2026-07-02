import { Router } from 'express';
import { ChangelogController } from '../controllers/changelog.controller';

const router = Router();

// GET /api/v1/changelog (Pública, novedades)
router.get('/', ChangelogController.getPublicEntries);

export default router;
