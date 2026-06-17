import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';

const router = Router();

// GET /api/v1/stats (Pública, para pintar los contadores del mapa)
router.get('/', StatsController.getStats);

export default router;
