import express from 'express';
import {
  deleteExerciseAsAdmin,
  getAdminOverview,
  updateTherapistStatus,
  updateUserRole,
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('Admin'));
router.get('/overview', getAdminOverview);
router.patch('/users/:id/role', updateUserRole);
router.patch('/therapists/:id/status', updateTherapistStatus);
router.delete('/exercises/:id', deleteExerciseAsAdmin);

export default router;
