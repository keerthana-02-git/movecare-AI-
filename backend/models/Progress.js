import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise is required'],
    },
    exercisePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExercisePlan',
      required: [true, 'Exercise plan is required'],
    },
    datePerformed: {
      type: Date,
      required: [true, 'Date performed is required'],
      default: () => new Date(),
    },
    completionStatus: {
      type: String,
      enum: ['Completed', 'Partial', 'Skipped', 'Unable'],
      default: 'Completed',
    },
    repsCompleted: {
      type: Number,
      min: [0, 'Reps completed cannot be negative'],
    },
    setsCompleted: {
      type: Number,
      min: [0, 'Sets completed cannot be negative'],
    },
    painLevel: {
      type: Number,
      min: [0, 'Pain level must be between 0 and 10'],
      max: [10, 'Pain level must be between 0 and 10'],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
    },
    notes: {
      type: String,
      trim: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
    therapistReview: {
      reviewed: Boolean,
      feedback: String,
      reviewedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying of patient's progress on exercises
progressSchema.index({ patient: 1, exercise: 1, datePerformed: -1 });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
