import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Públicas (cualquiera puede ver la cartelera de eventos)
router.get('/', EventController.getUpcomingEvents);
router.get('/:id', EventController.getEventDetails);

// Requieren sesión (para apuntarse a asistir)
router.post('/:id/reminders', requireAuth, EventController.rsvpEvent);
router.delete('/:id/reminders', requireAuth, EventController.cancelRsvp);

export default router;
