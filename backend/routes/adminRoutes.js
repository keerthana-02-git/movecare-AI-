import express from 'express';
import {
  deleteExerciseAsAdmin,
  getAdminOverview,
  getAuditLogs,
  updateTherapistStatus,
  updateUserRole,
  updateUserStatus,
  purgeJunkTestData,
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('Admin'));
router.get('/overview', getAdminOverview);
router.post('/purge-junk-data', purgeJunkTestData);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/therapists/:id/status', updateTherapistStatus);
router.delete('/exercises/:id', deleteExerciseAsAdmin);
router.get('/audit-logs', getAuditLogs);

export default router;
