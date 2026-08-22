import { Appointment, ExercisePlan, Patient, Progress, Therapist } from '../models/index.js';

const frequencyDays = {
  Daily: 1,
  Every2Days: 2,
  EveryOtherDay: 2,
  Twice: 3.5,
  Weekly: 7,
};

const getPatient = (userId) => Patient.findOne({ user: userId });
const getTherapist = (userId) => Therapist.findOne({ user: userId });

const round = (value) => Math.round(value * 10) / 10;

const expectedSessions = (plans) => {
  const today = new Date();
  return plans.reduce((total, plan) => {
    const start = new Date(plan.startDate);
    const end = new Date(Math.min(new Date(plan.endDate).getTime(), today.getTime()));
    if (end < start) return total;
    return total + plan.exercises.reduce((planTotal, item) => {
      const days = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
      return planTotal + Math.max(1, Math.ceil(days / (frequencyDays[item.frequency] || 1)));
    }, 0);
  }, 0);
};

const buildSummary = (progress, appointments, plans) => {
  const completed = progress.filter((entry) => entry.completionStatus === 'Completed');
  const trackedPain = progress.filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null);
  const trackedMobility = progress.filter((entry) => entry.mobilityScore !== undefined && entry.mobilityScore !== null);
  const pastAppointments = appointments.filter((appointment) => new Date(appointment.appointmentDate) < new Date() && !['Cancelled', 'NoShow'].includes(appointment.status));
  const attendedAppointments = pastAppointments.filter((appointment) => appointment.status === 'Completed');
  const expected = expectedSessions(plans);
  const adherence = expected ? Math.min(100, Math.round((completed.length / expected) * 100)) : 0;

  return {
    completedSessions: completed.length,
    totalSessions: progress.length,
    exerciseAdherence: adherence,
    completionRate: progress.length ? Math.round((completed.length / progress.length) * 100) : 0,
    averagePain: trackedPain.length ? round(trackedPain.reduce((total, entry) => total + entry.painLevel, 0) / trackedPain.length) : null,
    mobilityScore: trackedMobility.length ? Math.round(trackedMobility.reduce((total, entry) => total + entry.mobilityScore, 0) / trackedMobility.length) : null,
    appointmentAttendance: pastAppointments.length ? Math.round((attendedAppointments.length / pastAppointments.length) * 100) : 0,
    attendedAppointments: attendedAppointments.length,
    pastAppointments: pastAppointments.length,
  };
};

const buildTimeline = (progress) => {
  const grouped = new Map();
  progress.forEach((entry) => {
    const date = new Date(entry.datePerformed).toISOString().slice(0, 10);
    const current = grouped.get(date) || { date, completed: 0, sessions: 0, painTotal: 0, painCount: 0, mobilityTotal: 0, mobilityCount: 0 };
    current.sessions += 1;
    if (entry.completionStatus === 'Completed') current.completed += 1;
    if (entry.painLevel !== undefined && entry.painLevel !== null) { current.painTotal += entry.painLevel; current.painCount += 1; }
    if (entry.mobilityScore !== undefined && entry.mobilityScore !== null) { current.mobilityTotal += entry.mobilityScore; current.mobilityCount += 1; }
    grouped.set(date, current);
  });
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
    date: item.date,
    completionRate: Math.round((item.completed / item.sessions) * 100),
    pain: item.painCount ? round(item.painTotal / item.painCount) : null,
    mobilityScore: item.mobilityCount ? Math.round(item.mobilityTotal / item.mobilityCount) : null,
    sessions: item.sessions,
  }));
};

const getProgressPayload = async (patientId) => {
  const [patient, progress, appointments, plans] = await Promise.all([
    Patient.findById(patientId).populate('user', 'name email').lean(),
    Progress.find({ patient: patientId }).sort({ datePerformed: 1 }).populate('exercise', 'name').lean(),
    Appointment.find({ patient: patientId }).sort({ appointmentDate: 1 }).lean(),
    ExercisePlan.find({ patient: patientId, status: { $in: ['Active', 'Paused', 'Completed'] } }).lean(),
  ]);
  return { patient, entries: progress, timeline: buildTimeline(progress), summary: buildSummary(progress, appointments, plans) };
};

export const getMyProgress = async (req, res) => {
  try {
    const patient = await getPatient(req.user._id);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    res.json(await getProgressPayload(patient._id));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load progress' });
  }
};

export const recordMyProgress = async (req, res) => {
  try {
    const { exercise, exercisePlan, completionStatus = 'Completed', painLevel, mobilityScore, notes, repsCompleted, setsCompleted, difficulty } = req.body;
    const patient = await getPatient(req.user._id);
    const plan = await ExercisePlan.findOne({ _id: exercisePlan, patient: patient?._id });
    if (!patient || !plan || !plan.exercises.some((item) => String(item.exercise) === String(exercise))) {
      return res.status(404).json({ message: 'Assigned exercise plan not found' });
    }
    const entry = await Progress.create({ patient: patient._id, exercise, exercisePlan, completionStatus, painLevel, mobilityScore, notes, repsCompleted, setsCompleted, difficulty });
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to record progress' });
  }
};

export const listTherapistPatientsProgress = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const patients = await Patient.find({ assignedTherapist: therapist._id }).populate('user', 'name email').lean();
    const summaries = await Promise.all(patients.map(async (patient) => {
      const payload = await getProgressPayload(patient._id);
      return { patient: payload.patient, summary: payload.summary, timeline: payload.timeline };
    }));
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient progress' });
  }
};

export const getTherapistPatientProgress = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    const patient = await Patient.findOne({ _id: req.params.patientId, assignedTherapist: therapist?._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found for this therapist' });
    res.json(await getProgressPayload(patient._id));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient progress' });
  }
};