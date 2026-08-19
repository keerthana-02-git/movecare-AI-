import mongoose from 'mongoose';

const therapistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Therapist must be linked to a user'],
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      enum: ['Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'General'],
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Years of experience cannot be negative'],
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
    patientsAssigned: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Patient',
      default: [],
    },
    availability: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String },
    },
    status: {
      type: String,
      enum: ['Available', 'Unavailable', 'OnLeave'],
      default: 'Available',
    },
  },
  {
    timestamps: true,
  }
);

const Therapist = mongoose.model('Therapist', therapistSchema);

export default Therapist;
