import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { validate } from '../middlewares/validate';
import { createReportSchema, getNearbyReportsSchema } from '../schemas/report.schema';

const router = Router();

// GET /api/v1/reports/nearby
router.get('/nearby', validate(getNearbyReportsSchema), ReportController.getNearby);

// POST /api/v1/reports
router.post('/', validate(createReportSchema), ReportController.createReport);

export default router;
