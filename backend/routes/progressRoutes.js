import express from 'express';
import {
  getMyProgress,
  getTherapistPatientProgress,
  listTherapistPatientsProgress,
  recordMyProgress,
} from '../controllers/progressController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/me', authorize('Patient'), getMyProgress);
router.post('/me', authorize('Patient'), recordMyProgress);
router.get('/patients', authorize('Therapist'), listTherapistPatientsProgress);
router.get('/patients/:patientId', authorize('Therapist'), getTherapistPatientProgress);

export default router;