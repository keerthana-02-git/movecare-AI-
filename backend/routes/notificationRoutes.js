import express from 'express';
import {
  createTherapistMessage,
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  triggerAutomation,
} from '../controllers/notificationController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);
router.post('/messages', authorize('Therapist'), createTherapistMessage);
router.post('/automation/run', authorize('Admin', 'Therapist'), triggerAutomation);

export default router;