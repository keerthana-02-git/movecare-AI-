import {
  Appointment,
  Exercise,
  ExercisePlan,
  Patient,
  Therapist,
  User,
} from '../models/index.js';

export const getAdminOverview = async (req, res) => {
  try {
    const [users, patients, therapists, exercises, appointments, stats] = await Promise.all([
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean(),
      Patient.find()
        .populate('user', 'name email role')
        .populate({ path: 'assignedTherapist', populate: { path: 'user', select: 'name email' } })
        .sort({ createdAt: -1 })
        .lean(),
      Therapist.find().populate('user', 'name email role').sort({ createdAt: -1 }).lean(),
      Exercise.find().populate({ path: 'createdBy', populate: { path: 'user', select: 'name' } }).sort({ updatedAt: -1 }).lean(),
      Appointment.find()
        .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
        .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
        .sort({ appointmentDate: -1, startTime: -1 })
        .limit(50)
        .lean(),
      Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'Patient' }),
        User.countDocuments({ role: 'Therapist' }),
        Therapist.countDocuments({ status: 'Available' }),
        Exercise.countDocuments(),
        Appointment.countDocuments(),
        ExercisePlan.countDocuments({ status: 'Active' }),
      ]),
    ]);

    res.json({
      users,
      patients,
      therapists,
      exercises,
      appointments,
      stats: {
        users: stats[0], patients: stats[1], therapists: stats[2], availableTherapists: stats[3],
        exercises: stats[4], appointments: stats[5], activePlans: stats[6],
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load admin overview' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Patient', 'Therapist', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role' });
    }
    if (String(req.user._id) === String(req.params.id) && role !== 'Admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin access' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select('name email role createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role === 'Therapist') {
      const existingTherapist = await Therapist.findOne({ user: user._id });
      if (!existingTherapist) {
        await Therapist.create({
          user: user._id,
          licenseNumber: `PT-${user._id.toString().slice(-6).toUpperCase()}`,
          specialization: 'Physical Therapy',
          yearsOfExperience: 5,
          status: 'Available',
          availability: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: { start: '10:00', end: '14:00' },
          },
        });
      }
    } else if (role === 'Patient') {
      const existingPatient = await Patient.findOne({ user: user._id });
      if (!existingPatient) {
        await Patient.create({
          user: user._id,
          dateOfBirth: new Date('1970-01-01'),
          gender: 'Other',
          medicalCondition: 'Profile setup required',
          injuryDescription: '',
        });
      }
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update user' });
  }
};

export const updateTherapistStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Available', 'Unavailable', 'OnLeave'].includes(status)) {
      return res.status(400).json({ message: 'Invalid therapist status' });
    }
    const therapist = await Therapist.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true }).populate('user', 'name email role');
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    res.json(therapist);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update therapist' });
  }
};

export const deleteExerciseAsAdmin = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    await ExercisePlan.updateMany({ 'exercises.exercise': exercise._id }, { $pull: { exercises: { exercise: exercise._id } } });
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete exercise' });
  }
};
