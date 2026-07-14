import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();

// GET /api/v1/achievements (Pública, obtener todas las medallas con sus requisitos)
router.get('/', async (req, res, next) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { pointsReward: 'asc' }
    });
    res.status(200).json(achievements);
  } catch (error) {
    next(error);
  }
});

export default router;
