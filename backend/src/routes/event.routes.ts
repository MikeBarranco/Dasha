import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Públicas (con auth opcional para calcular isInterested)
router.get('/', optionalAuth, EventController.getUpcomingEvents);
router.get('/:id', optionalAuth, EventController.getEventDetails);

// Requieren sesión (para apuntarse a asistir)
router.post('/:id/reminders', requireAuth, EventController.rsvpEvent);
router.delete('/:id/reminders', requireAuth, EventController.cancelRsvp);

// Alias: el frontend llama a /interested en vez de /reminders
router.post('/:id/interested', requireAuth, EventController.rsvpEvent);
router.delete('/:id/interested', requireAuth, EventController.cancelRsvp);

export default router;
