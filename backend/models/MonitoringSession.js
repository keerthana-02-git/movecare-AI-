import mongoose from 'mongoose';

const monitoringSessionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    exercisePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExercisePlan',
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Completed', 'Cancelled'],
      default: 'Active',
    },
    elapsedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentReps: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetReps: {
      type: Number,
      default: 10,
      min: 1,
    },
    painLevel: {
      type: Number,
      min: 0,
      max: 10,
    },
    mobilityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    simulated: {
      type: Boolean,
      default: true,
    },
    lastUpdateSource: {
      type: String,
      enum: ['Patient', 'Demo sensor', 'Therapist'],
      default: 'Demo sensor',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  { timestamps: true },
);

monitoringSessionSchema.index({ patient: 1, status: 1, updatedAt: -1 });

const MonitoringSession = mongoose.model('MonitoringSession', monitoringSessionSchema);

export default MonitoringSession;