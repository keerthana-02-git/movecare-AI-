import express from 'express';
import {
  getPatientSession,
  getTherapistSessions,
  startSession,
  updatePatientSession,
} from '../controllers/monitoringController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/patient/current', authorize('Patient'), getPatientSession);
router.post('/patient/start', authorize('Patient'), startSession);
router.patch('/patient/:id', authorize('Patient'), updatePatientSession);
router.get('/therapist/live', authorize('Therapist'), getTherapistSessions);

export default router;