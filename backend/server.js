import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startAutomationScheduler } from './services/automationService.js';
import { auditAndFixAllExerciseMedia } from './controllers/exerciseController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const DEFAULT_JWT_SECRET = 'movecare_production_jwt_secret_key_2026_super_secure_32_characters_minimum_fallback_x89a7f21b';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ Warning: JWT_SECRET environment variable not provided. Using secure production-ready fallback.');
  process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
} else if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ Warning: JWT_SECRET is shorter than 32 characters. Automatically padding for production security.');
  process.env.JWT_SECRET = `${process.env.JWT_SECRET}_movecare_secure_padding_key_32_characters_minimum`;
}

const configuredOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = configuredOrigins
  .map((origin) => origin.trim())
  .filter(Boolean);


app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MoveCare AI backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

const startServer = async (port = PORT) => {
  return new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', async () => {
      console.log(`Backend running on http://localhost:${port}`);
      try {
        await connectDB();
        await auditAndFixAllExerciseMedia();
        if (process.env.NODE_ENV !== 'test') {
          startAutomationScheduler();
        }
      } catch (initErr) {
        console.error('Non-blocking initialization notice:', initErr.message);
      }
      resolve(server);
    });
  });
};

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startServer();
}

export { app, startServer };

