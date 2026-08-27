import mongoose from 'mongoose';

const reminderItemSchema = new mongoose.Schema(
  {
    type: { type: String },
    message: { type: String },
    triggerReason: { type: String },
    targetDate: { type: Date },
  },
  { _id: false }
);

const aiRecommendationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
    },
    recommendationType: {
      type: String,
      enum: ['Exercise', 'AdaptiveExercise', 'ProgressAnalysis', 'SmartReminder', 'TherapistSummary'],
      default: 'Exercise',
      index: true,
    },
    inputProfile: {
      condition: String,
      age: Number,
      painLevel: Number,
      mobilityLevel: Number,
      bodyPart: String,
      adherenceRate: Number,
      completedSessions: Number,
    },
    plan: {
      difficulty: String,
      duration: Number,
      frequency: String,
    },
    recommendations: [
      {
        exercise: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exercise',
        },
        name: String,
        targetBodyPart: String,
        difficulty: String,
        reason: String,
        suggestedDifficulty: String,
        suggestedDuration: Number,
        suggestedFrequency: String,
        alreadyAssigned: Boolean,
      },
    ],
    analysis: {
      summary: String,
      adherenceObservations: String,
      improvementAreas: [String],
      suggestedNextSteps: [String],
    },
    reminders: [reminderItemSchema],
    therapistSummary: {
      adherence: Number,
      recentProgress: String,
      painTrend: String,
      completedExercises: [String],
      upcomingAppointment: String,
      clinicalNotes: String,
    },
    agentActionsTaken: [
      {
        actionType: String,
        description: String,
        triggeredAt: { type: Date, default: Date.now },
      },
    ],
    disclaimer: {
      type: String,
      default: 'This software feature provides educational exercise suggestions, not a medical diagnosis or treatment plan. Review changes with a licensed healthcare professional.',
    },
  },
  {
    timestamps: true,
  }
);

const AiRecommendation = mongoose.model('AiRecommendation', aiRecommendationSchema);

export default AiRecommendation;
