import mongoose from 'mongoose';

const exercisePlanSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist is required'],
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    exercises: [
      {
        exercise: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exercise',
          required: true,
        },
        frequency: {
          type: String,
          enum: ['Daily', 'Every2Days', 'EveryOtherDay', 'Twice', 'Weekly'],
          default: 'Daily',
        },
        order: Number,
      },
    ],
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    goals: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Completed', 'Cancelled'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Validate that endDate is after startDate
exercisePlanSchema.pre('save', function validateDates() {
  if (this.endDate <= this.startDate) {
    throw new Error('End date must be after start date');
  }
});

const ExercisePlan = mongoose.model('ExercisePlan', exercisePlanSchema);

export default ExercisePlan;
