import { Notification, Patient, Therapist } from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { runAllAutomation } from '../services/automationService.js';

export const createNotification = (data) => Notification.create(data);

export const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const filter = { recipient: req.user._id };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ isRead: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load notifications', error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to get unread count' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' },
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update notification' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update notifications' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to delete notification' });
  }
};

export const createTherapistMessage = async (req, res) => {
  try {
    const { patientId, title, message, priority = 'Normal', type = 'Message' } = req.body;
    if (!['Message', 'ExerciseReminder'].includes(type)) {
      return res.status(400).json({ message: 'Only messages and exercise reminders can be sent here' });
    }
    const therapist = await ensureTherapistProfile(req.user);
    const patient = await Patient.findOne({
      _id: patientId,
      $or: [{ assignedTherapist: therapist?._id }, { _id: { $in: therapist?.patientsAssigned || [] } }],
    }).populate('user', 'name');
    if (!patient) return res.status(404).json({ message: 'Patient not found for this therapist' });
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

    const recipientId = patient.user?._id || patient.user;
    const notification = await createNotification({
      recipient: recipientId,
      type,
      title,
      message,
      priority,
      relatedEntity: { entityType: 'Patient', entityId: patient._id },
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to send message' });
  }
};

export const triggerAutomation = async (req, res) => {
  try {
    const result = await runAllAutomation();
    res.json({
      message: 'Automation cycle completed successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({ message: 'Automation execution failed', error: error.message });
  }
};