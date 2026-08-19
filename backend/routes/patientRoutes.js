import express from 'express';
import { getPatientDashboard } from '../controllers/patientController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me/dashboard', protect, authorize('Patient'), getPatientDashboard);

export default router;