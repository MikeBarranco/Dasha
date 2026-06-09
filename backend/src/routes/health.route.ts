import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'dasha-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
