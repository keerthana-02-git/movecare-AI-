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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MoveCare AI backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);

const startServer = async (port = PORT) => {
  await connectDB();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
      resolve(server);
    });
  });
};

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startServer();
}

export { app, startServer };
