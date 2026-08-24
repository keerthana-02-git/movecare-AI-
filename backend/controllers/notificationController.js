import { Notification, Patient, Therapist } from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';

export const createNotification = (data) => Notification.create(data);

export const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(limit)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true },
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