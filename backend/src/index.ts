import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import router from './routes';
import { errorHandler } from './middlewares/errorHandler';
import passport from './config/passport';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://staging.dashamx.me',
  'https://dashamx.me',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Límite por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' }
});

// Aplicar rate limiting a las rutas de API
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Routes
app.use(passport.initialize());
app.use('/api/v1', router);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Dasha API is running! 🐾' });
});

import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.set('io', io); // Make io accessible in controllers via req.app.get('io')

io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);
  
  // Join a specific rescue assignment room
  socket.on('join_rescue', (rescueId: string) => {
    socket.join(`rescue:${rescueId}`);
    console.log(`Socket ${socket.id} joined room rescue:${rescueId}`);
  });

  // Leave room
  socket.on('leave_rescue', (rescueId: string) => {
    socket.leave(`rescue:${rescueId}`);
  });

  socket.on('disconnect', () => {
    console.log('⚡ Socket disconnected:', socket.id);
  });
});

// Global Error Handler
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
