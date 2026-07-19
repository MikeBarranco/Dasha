import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { createReportSchema, getNearbyReportsSchema, updateReportStatusSchema } from '../schemas/report.schema';

const router = Router();

// GET /api/v1/reports/nearby (Pública, para ver el mapa)
router.get('/nearby', validate(getNearbyReportsSchema), ReportController.getNearby);

// GET /api/v1/reports (Lista de reportes activos para el mapa)
router.get('/', ReportController.getReports);

// GET /api/v1/reports/check (Prevención de duplicados A.4)
router.get('/check', ReportController.checkDuplicate);

// POST /api/v1/reports/analyze-photo (Llama a Gemini para pre-llenar reporte)
router.post('/analyze-photo', requireAuth, ReportController.analyzePhoto);

// GET /api/v1/reports/:id (Un solo reporte específico)
router.get('/:id', ReportController.getReportById);

// POST /api/v1/reports (Protegida, requiere sesión)
router.post('/', requireAuth, validate(createReportSchema), ReportController.createReport);

// PATCH /api/v1/reports/:id/status (Protegida, cambiar estado de reporte)
router.patch('/:id/status', requireAuth, validate(updateReportStatusSchema), ReportController.updateStatus);

// POST /api/v1/reports/:id/accept (Protegida, voluntario acepta un caso)
router.post('/:id/accept', requireAuth, ReportController.acceptCase);

// POST /api/v1/reports/:id/sighting (Agregar avistamiento a un reporte existente)
router.post('/:id/sighting', requireAuth, ReportController.addSighting);

export default router;
