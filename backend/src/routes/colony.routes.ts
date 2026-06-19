import { Router } from 'express';
import { ColonyController } from '../controllers/colony.controller';

const router = Router();

// GET /api/v1/colonies?cp=XXXXX
router.get('/', ColonyController.searchByPostalCode);

export default router;
