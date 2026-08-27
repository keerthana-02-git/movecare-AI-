import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      enum: [
        'Appointment',
        'ExerciseReminder',
        'ProgressUpdate',
        'NewExercisePlan',
        'SystemAlert',
        'Message',
        'MissedActivity',
        'AIAlert',
      ],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['Appointment', 'Exercise', 'ExercisePlan', 'Patient', 'Therapist', 'Progress', 'AiRecommendation'],
      },
      entityId: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient notification queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, 'relatedEntity.entityId': 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
