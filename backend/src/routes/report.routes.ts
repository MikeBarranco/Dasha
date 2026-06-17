import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth.middleware';
import { createReportSchema, getNearbyReportsSchema } from '../schemas/report.schema';

const router = Router();

// GET /api/v1/reports/nearby (Pública, para ver el mapa)
router.get('/nearby', validate(getNearbyReportsSchema), ReportController.getNearby);

// GET /api/v1/reports (Lista de reportes activos para el mapa)
router.get('/', ReportController.getReports);

// GET /api/v1/reports/:id (Un solo reporte específico)
router.get('/:id', ReportController.getReportById);

// POST /api/v1/reports (Protegida, requiere sesión)
router.post('/', requireAuth, validate(createReportSchema), ReportController.createReport);

export default router;
