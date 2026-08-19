import express from 'express';
import {
  createTherapistMessage,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.post('/messages', authorize('Therapist'), createTherapistMessage);

export default router;