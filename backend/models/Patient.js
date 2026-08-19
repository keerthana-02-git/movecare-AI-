import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient must be linked to a user'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required'],
    },
    medicalCondition: {
      type: String,
      required: [true, 'Medical condition is required'],
      trim: true,
    },
    injuryDescription: {
      type: String,
      trim: true,
    },
    assignedTherapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\d{10,}$/, 'Please enter a valid phone number'],
    },
    address: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      name: String,
      phone: String,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Completed'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
