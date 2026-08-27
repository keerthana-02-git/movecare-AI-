import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'USER_LOGIN',
        'USER_REGISTER',
        'USER_PASSWORD_RESET',
        'USER_ROLE_UPDATED',
        'USER_STATUS_UPDATED',
        'THERAPIST_STATUS_UPDATED',
        'EXERCISE_CREATED',
        'EXERCISE_UPDATED',
        'EXERCISE_DELETED',
        'EXERCISE_ASSIGNED',
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_STATUS_UPDATED',
        'APPOINTMENT_CANCELLED',
        'CONSULTATION_STATUS_UPDATED',
      ],
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    performedByRole: {
      type: String,
      enum: ['Patient', 'Therapist', 'Admin', 'System'],
      default: 'System',
    },
    targetEntity: {
      entityType: {
        type: String,
        enum: ['User', 'Patient', 'Therapist', 'Exercise', 'ExercisePlan', 'Appointment', 'Consultation', 'System'],
      },
      entityId: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'internal',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
