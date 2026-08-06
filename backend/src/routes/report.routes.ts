import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { createReportSchema, getNearbyReportsSchema, updateReportStatusSchema } from '../schemas/report.schema';

const router = Router();

// GET /api/v1/reports/nearby (Pública, para ver el mapa)
router.get('/nearby', optionalAuth, validate(getNearbyReportsSchema), ReportController.getNearby);

// GET /api/v1/reports (Lista de reportes activos para el mapa)
router.get('/', optionalAuth, ReportController.getReports);

// GET /api/v1/reports/check (Prevención de duplicados A.4)
router.get('/check', ReportController.checkDuplicate);

// POST /api/v1/reports/analyze-photo (Llama a Gemini para pre-llenar reporte)
router.post('/analyze-photo', requireAuth, ReportController.analyzePhoto);

// GET /api/v1/reports/:id (Un solo reporte específico)
router.get('/:id', optionalAuth, ReportController.getReportById);

// POST /api/v1/reports (Protegida, requiere sesión)
router.post('/', requireAuth, validate(createReportSchema), ReportController.createReport);

// PATCH /api/v1/reports/:id/status (Protegida, cambiar estado de reporte)
router.patch('/:id/status', requireAuth, validate(updateReportStatusSchema), ReportController.updateStatus);

// POST /api/v1/reports/:id/accept (Protegida, voluntario acepta un caso)
router.post('/:id/accept', requireAuth, ReportController.acceptCase);

// POST /api/v1/reports/:id/sighting (Agregar avistamiento a un reporte existente)
router.post('/:id/sighting', requireAuth, ReportController.addSighting);

// POST /api/v1/reports/:id/follow (Seguir reporte)
router.post('/:id/follow', requireAuth, ReportController.followReport);

// DELETE /api/v1/reports/:id/follow (Dejar de seguir reporte)
router.delete('/:id/follow', requireAuth, ReportController.unfollowReport);

// POST /api/v1/reports/:id/adopt-request (Solicitar adopción de mascota)
router.post('/:id/adopt-request', requireAuth, ReportController.adoptRequest);

// POST /api/v1/reports/:id/adopt-directly (Adopción directa por el ciudadano que reporta)
router.post('/:id/adopt-directly', requireAuth, ReportController.adoptDirectly);

// GET /api/v1/reports/:id/adoption-requests (Ver interesados en adopción)
router.get('/:id/adoption-requests', requireAuth, ReportController.getAdoptionRequests);

// POST /api/v1/reports/:id/report (Reportar/marcar un reporte de calle como falso/inapropiado)
router.post('/:id/report', requireAuth, ReportController.flagReport);

// POST /api/v1/reports/:id/offer (Aliado ofrece recurso/ayuda en un reporte)
router.post('/:id/offer', requireAuth, ReportController.offerResource);

export default router;
