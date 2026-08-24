import {
  Appointment,
  ExercisePlan,
  Notification,
  Patient,
  Progress,
} from '../models/index.js';

export const ensurePatientProfile = async (user) => {
  const existingProfile = await Patient.findOne({ user: user._id || user });
  if (existingProfile) return existingProfile;

  return Patient.create({
    user: user._id || user,
    dateOfBirth: new Date('1970-01-01'),
    gender: 'Other',
    medicalCondition: 'Profile setup required',
    injuryDescription: '',
  });
};

export const getPatientDashboard = async (req, res) => {
  try {
    const patientProfile = await ensurePatientProfile(req.user);
    const patient = await patientProfile.populate({
      path: 'assignedTherapist',
      populate: { path: 'user', select: 'name email' },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [plans, appointments, progress, notifications] = await Promise.all([
      ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } })
        .sort({ startDate: -1 })
        .populate('therapist')
        .populate('exercises.exercise')
        .lean(),
      Appointment.find({
        patient: patient._id,
        appointmentDate: { $gte: startOfToday },
        status: { $nin: ['Cancelled', 'NoShow'] },
      })
        .sort({ appointmentDate: 1 })
        .limit(1)
        .populate({ path: 'therapist', populate: { path: 'user', select: 'name' } })
        .lean(),
      Progress.find({ patient: patient._id })
        .sort({ datePerformed: -1 })
        .limit(30)
        .populate('exercise', 'name')
        .lean(),
      Notification.find({ recipient: req.user._id })
        .sort({ isRead: 1, createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const completedEntries = progress.filter((entry) => entry.completionStatus === 'Completed');
    const averagePain = progress.length
      ? Math.round(
          (progress.reduce((total, entry) => total + (entry.painLevel ?? 0), 0) / progress.length) * 10,
        ) / 10
      : null;

    res.json({
      patient,
      plans,
      upcomingAppointment: appointments[0] || null,
      progress,
      notifications,
      stats: {
        completionRate: progress.length ? Math.round((completedEntries.length / progress.length) * 100) : 0,
        completedSessions: completedEntries.length,
        averagePain,
        mobilityStatus: averagePain === null ? 'Awaiting check-in' : averagePain <= 3 ? 'Stable' : 'Needs attention',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient dashboard' });
  }
};