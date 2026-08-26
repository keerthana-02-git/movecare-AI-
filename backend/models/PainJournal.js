import mongoose from 'mongoose';

const painJournalSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: () => new Date(),
    },
    dateString: {
      type: String,
      required: [true, 'Date string is required'],
      trim: true,
    },
    painLevel: {
      type: Number,
      required: [true, 'Pain level is required'],
      min: [0, 'Pain level must be at least 0'],
      max: [10, 'Pain level cannot exceed 10'],
    },
    mobilityLevel: {
      type: Number,
      required: [true, 'Mobility level is required'],
      min: [1, 'Mobility level must be between 1 and 5'],
      max: [5, 'Mobility level must be between 1 and 5'],
    },
    mobilityScore: {
      type: Number,
      min: [0, 'Mobility score cannot be negative'],
      max: [100, 'Mobility score cannot exceed 100'],
      default: function () {
        return this.mobilityLevel ? this.mobilityLevel * 20 : 60;
      },
    },
    bodyPart: {
      type: String,
      required: [true, 'Affected body part is required'],
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    symptomsDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Symptoms description cannot exceed 300 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find patient entries by date and ensure query performance
painJournalSchema.index({ patient: 1, dateString: -1 });

const PainJournal = mongoose.model('PainJournal', painJournalSchema);

export default PainJournal;
