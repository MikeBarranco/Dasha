import { Router } from 'express';
import { RescueAssignmentController } from '../controllers/rescue-assignment.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:id', requireAuth, RescueAssignmentController.getAssignment);
router.patch('/:id', requireAuth, RescueAssignmentController.updateStatus);
router.post('/:id/location', requireAuth, RescueAssignmentController.updateLocation);
router.post('/:id/photos', requireAuth, RescueAssignmentController.addRescuePhoto);

export default router;
