import {
  Appointment,
  AuditLog,
  Exercise,
  ExercisePlan,
  Patient,
  Progress,
  Therapist,
  User,
} from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getAdminOverview = async (req, res) => {
  try {
    const [users, patients, therapists, exercises, appointments, stats, recentActivity] = await Promise.all([
      User.find()
        .select('name email role isActive authProvider googleId deactivatedAt createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Patient.find()
        .populate('user', 'name email role isActive')
        .populate({ path: 'assignedTherapist', populate: { path: 'user', select: 'name email' } })
        .sort({ createdAt: -1 })
        .lean(),
      Therapist.find()
        .populate('user', 'name email role isActive')
        .sort({ createdAt: -1 })
        .lean(),
      Exercise.find()
        .populate({ path: 'createdBy', populate: { path: 'user', select: 'name' } })
        .sort({ updatedAt: -1 })
        .lean(),
      Appointment.find()
        .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
        .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: 'Patient' }),
        User.countDocuments({ role: 'Therapist' }),
        User.countDocuments({ role: 'Admin' }),
        Therapist.countDocuments({ status: 'Available' }),
        Exercise.countDocuments(),
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: 'Scheduled' }),
        Appointment.countDocuments({ status: 'Accepted' }),
        Appointment.countDocuments({ status: 'InProgress' }),
        Appointment.countDocuments({ status: 'Completed' }),
        Appointment.countDocuments({ status: 'Cancelled' }),
        ExercisePlan.countDocuments({ status: 'Active' }),
        Progress.countDocuments({ completionStatus: 'Completed' }),
      ]),
      AuditLog.find()
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    res.json({
      users,
      patients,
      therapists,
      exercises,
      appointments,
      recentActivity,
      stats: {
        users: stats[0],
        activeUsers: stats[1],
        deactivatedUsers: stats[2],
        patients: stats[3],
        therapists: stats[4],
        admins: stats[5],
        availableTherapists: stats[6],
        exercises: stats[7],
        appointments: stats[8],
        appointmentBreakdown: {
          scheduled: stats[9],
          accepted: stats[10],
          inProgress: stats[11],
          completed: stats[12],
          cancelled: stats[13],
        },
        activePlans: stats[14],
        completedSessions: stats[15],
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: 'after', runValidators: true }
    ).select('name email role isActive deactivatedAt createdAt');
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

    await logAuditEvent({
      action: 'USER_ROLE_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'User', entityId: user._id },
      details: { targetUserId: user._id, targetEmail: user.email, newRole: role },
      req,
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update user' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean value (true or false)' });
    }

    if (String(req.user._id) === String(req.params.id) && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousStatus = user.isActive !== false;
    user.isActive = isActive;
    user.deactivatedAt = isActive ? null : new Date();
    await user.save();

    await logAuditEvent({
      action: 'USER_STATUS_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'User', entityId: user._id },
      details: {
        targetUserId: user._id,
        targetEmail: user.email,
        isActive,
        previousStatus,
      },
      req,
    });

    res.json({
      message: `User ${isActive ? 'reactivated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update user status' });
  }
};

export const updateTherapistStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Available', 'Unavailable', 'OnLeave'].includes(status)) {
      return res.status(400).json({ message: 'Invalid therapist status' });
    }
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    ).populate('user', 'name email role');
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    await logAuditEvent({
      action: 'THERAPIST_STATUS_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Therapist', entityId: therapist._id },
      details: { therapistId: therapist._id, status },
      req,
    });

    res.json(therapist);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update therapist' });
  }
};

export const deleteExerciseAsAdmin = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    await ExercisePlan.updateMany(
      { 'exercises.exercise': exercise._id },
      { $pull: { exercises: { exercise: exercise._id } } }
    );

    await logAuditEvent({
      action: 'EXERCISE_DELETED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Exercise', entityId: exercise._id },
      details: { exerciseId: exercise._id, exerciseName: exercise.name, deletedBy: 'Admin' },
      req,
    });

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete exercise' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const filter = {};

    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.role) {
      filter.performedByRole = req.query.role;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to retrieve audit logs' });
  }
};
