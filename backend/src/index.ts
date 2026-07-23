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

import { csrfProtection } from './middlewares/csrf.middleware';



app.use(csrfProtection);
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

import jwt from 'jsonwebtoken';
import { prisma } from './config/db';

const SECRET_TO_USE = process.env.JWT_SECRET as string;

io.use((socket, next) => {
  const cookieStr = socket.handshake.headers.cookie;
  if (!cookieStr) return next(new Error('Authentication error'));
  const tokenMatch = cookieStr.match(/(?:^|;\s*)token=([^;]*)/);
  if (!tokenMatch) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(tokenMatch[1], SECRET_TO_USE) as any;
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);
  
  // Join a specific rescue assignment room
  socket.on('join_rescue', async (rescueId: string) => {
    const user = (socket as any).user;
    
    if (user?.role === 'admin') {
      socket.join(`rescue:${rescueId}`);
      console.log(`Socket ${socket.id} joined room rescue:${rescueId} (admin)`);
      return;
    }

    try {
      const assignment = await prisma.rescueAssignment.findUnique({
        where: { id: rescueId },
        include: { report: true }
      });
      if (!assignment) {
        socket.emit('error', { message: 'Asignación no encontrada' });
        return;
      }
      
      const isVolunteer = assignment.volunteerId === user.id;
      const isReporter = assignment.report.userId === user.id;
      const isAlly = assignment.report.destinationOrgId === user.id;
      
      if (isVolunteer || isReporter || isAlly) {
        socket.join(`rescue:${rescueId}`);
        console.log(`Socket ${socket.id} joined room rescue:${rescueId}`);
      } else {
        socket.emit('error', { message: 'No tienes permiso para ver este rescate' });
        console.log(`Socket ${socket.id} denied access to rescue:${rescueId}`);
      }
    } catch(err) {
      console.error('Error verifying join_rescue permissions:', err);
      socket.emit('error', { message: 'Error interno del servidor' });
    }
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

import { seedChangelogsIfNeeded } from './seed-changelog';

server.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  
  // Sembrar novedades de forma automática si la tabla está vacía
  try {
    await seedChangelogsIfNeeded();
  } catch (err) {
    console.error('Error al intentar sembrar las novedades:', err);
  }
});
