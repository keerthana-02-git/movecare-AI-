import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Exercise description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Stretching', 'Strengthening', 'Balance', 'Cardio', 'Flexibility', 'Coordination'],
      required: [true, 'Exercise category is required'],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required (in minutes)'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    sets: {
      type: Number,
      default: 1,
      min: [1, 'Sets must be at least 1'],
    },
    reps: {
      type: Number,
      default: 10,
      min: [1, 'Reps must be at least 1'],
    },
    instructions: {
      type: String,
      required: [true, 'Instructions are required'],
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    targetBodyPart: {
      type: String,
      required: [true, 'Target body part is required'],
      trim: true,
    },
    precautions: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Exercise = mongoose.model('Exercise', exerciseSchema);

export default Exercise;
