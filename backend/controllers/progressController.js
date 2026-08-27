import { Appointment, ExercisePlan, PainJournal, Patient, Progress, Therapist } from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { ensurePatientProfile } from './patientController.js';

const round = (value) => Math.round(value * 10) / 10;

const getPatient = async (user) => {
  if (user?.role === 'Patient') return ensurePatientProfile(user);
  return Patient.findOne({ user: user?._id || user });
};

const getTherapist = async (user) => {
  if (user?.role === 'Therapist') return ensureTherapistProfile(user);
  return Therapist.findOne({ user: user?._id || user });
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toISODate = (d) => {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateStreaks = (completedProgress) => {
  const dateSet = new Set();
  completedProgress.forEach((p) => {
    if (p.datePerformed) {
      dateSet.add(toISODate(p.datePerformed));
    }
  });

  if (dateSet.size === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Calculate Best Streak
  const sortedDates = Array.from(dateSet).sort();
  let bestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      runningStreak += 1;
      if (runningStreak > bestStreak) bestStreak = runningStreak;
    } else if (diffDays > 1) {
      runningStreak = 1;
    }
  }

  // Calculate Current Streak
  const now = new Date();
  const todayStr = toISODate(now);
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = toISODate(yesterday);

  let currentStreak = 0;
  let checkDate = null;

  if (dateSet.has(todayStr)) {
    checkDate = new Date(now);
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
  }

  if (checkDate) {
    while (dateSet.has(toISODate(checkDate))) {
      currentStreak += 1;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
};

const buildWeeklyMatrix = (completedProgress, plans) => {
  const now = new Date();
  const weekly = [];

  // Count scheduled exercises per day from active plans
  const totalAssignedDaily = plans.reduce((acc, plan) => {
    return acc + (plan.exercises?.length || 0);
  }, 0) || 1;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = toISODate(d);
    const dayOfWeek = d.getDay();
    const isToday = i === 0;

    const completedOnDay = completedProgress.filter((p) => toISODate(p.datePerformed) === dateStr);

    weekly.push({
      day: dayNames[dayOfWeek],
      dayShort: shortDayNames[dayOfWeek],
      date: dateStr,
      completed: completedOnDay.length,
      target: totalAssignedDaily,
      isToday,
      completionRate: Math.min(100, Math.round((completedOnDay.length / Math.max(1, totalAssignedDaily)) * 100)),
    });
  }

  return weekly;
};

const buildMonthlyStats = (completedProgress, currentStreak) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1).getTime();
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();

  const monthProgress = completedProgress.filter((p) => {
    const time = new Date(p.datePerformed).getTime();
    return time >= monthStart && time <= monthEnd;
  });

  const activeDates = new Set(monthProgress.map((p) => toISODate(p.datePerformed)));
  const completedThisMonth = monthProgress.length;
  const activeDays = activeDates.size;
  const averagePerActiveDay = activeDays > 0 ? round(completedThisMonth / activeDays) : 0;
  const daysInMonthSoFar = now.getDate();
  const completionPercentage = daysInMonthSoFar > 0 ? Math.min(100, Math.round((activeDays / daysInMonthSoFar) * 100)) : 0;

  return {
    completedThisMonth,
    completionPercentage,
    activeDays,
    currentStreak,
    averagePerActiveDay,
    monthName: monthNames[currentMonth],
    year: currentYear,
  };
};

const buildCompletionTrends = (completedProgress) => {
  const now = new Date();

  // Helper for N days
  const buildDaysSeries = (numDays) => {
    const series = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = toISODate(d);
      const label = numDays === 7 ? shortDayNames[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`;
      const completedCount = completedProgress.filter((p) => toISODate(p.datePerformed) === dateStr).length;

      series.push({
        date: dateStr,
        label,
        completed: completedCount,
        isToday: i === 0,
      });
    }
    return series;
  };

  return {
    last7Days: buildDaysSeries(7),
    last30Days: buildDaysSeries(30),
  };
};

const buildPainTrendAnalytics = (progress, journals = []) => {
  const painFromProgress = progress
    .filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null)
    .map((entry) => ({
      date: toISODate(entry.datePerformed),
      timestamp: new Date(entry.datePerformed).getTime(),
      painLevel: Number(entry.painLevel),
      exerciseName: entry.exercise?.name || 'Assigned Exercise',
      notes: entry.notes || '',
    }));

  const painFromJournals = journals
    .filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null)
    .map((entry) => ({
      date: entry.dateString || toISODate(entry.date),
      timestamp: new Date(entry.date || entry.createdAt).getTime(),
      painLevel: Number(entry.painLevel),
      exerciseName: `Daily Journal (${entry.bodyPart})`,
      notes: entry.notes || '',
    }));

  const combined = [...painFromProgress, ...painFromJournals].sort((a, b) => a.timestamp - b.timestamp);

  if (combined.length === 0) {
    return {
      averagePain: null,
      latestPain: null,
      painSeverity: 'None',
      history: [],
      weeklyAverages: [],
    };
  }

  const painSum = combined.reduce((sum, p) => sum + p.painLevel, 0);
  const averagePain = round(painSum / combined.length);
  const latestEntry = combined[combined.length - 1];
  const latestPain = latestEntry.painLevel;

  let painSeverity = 'Mild';
  if (averagePain === 0) painSeverity = 'None';
  else if (averagePain <= 3) painSeverity = 'Mild';
  else if (averagePain <= 6) painSeverity = 'Moderate';
  else painSeverity = 'Severe';

  const history = combined.map((entry) => ({
    date: entry.date,
    painLevel: entry.painLevel,
    exerciseName: entry.exerciseName,
    notes: entry.notes,
  }));

  return {
    averagePain,
    latestPain,
    painSeverity,
    history,
    totalRecords: combined.length,
  };
};

const buildMobilityTrendAnalytics = (progress, journals = []) => {
  const mobilityFromProgress = progress
    .filter((entry) => entry.mobilityScore !== undefined && entry.mobilityScore !== null)
    .map((entry) => ({
      date: toISODate(entry.datePerformed),
      timestamp: new Date(entry.datePerformed).getTime(),
      mobilityScore: Number(entry.mobilityScore),
      exerciseName: entry.exercise?.name || 'Assigned Exercise',
    }));

  const mobilityFromJournals = journals
    .filter((entry) => entry.mobilityScore !== undefined && entry.mobilityScore !== null)
    .map((entry) => ({
      date: entry.dateString || toISODate(entry.date),
      timestamp: new Date(entry.date || entry.createdAt).getTime(),
      mobilityScore: Number(entry.mobilityScore),
      exerciseName: `Daily Journal (${entry.bodyPart})`,
    }));

  const combined = [...mobilityFromProgress, ...mobilityFromJournals].sort((a, b) => a.timestamp - b.timestamp);

  if (combined.length === 0) {
    return {
      averageMobility: null,
      latestMobility: null,
      mobilityStatus: 'No records',
      history: [],
    };
  }

  const mobilitySum = combined.reduce((sum, p) => sum + p.mobilityScore, 0);
  const averageMobility = Math.round(mobilitySum / combined.length);
  const latestEntry = combined[combined.length - 1];
  const latestMobility = latestEntry.mobilityScore;

  let mobilityStatus = 'Stable';
  if (averageMobility >= 80) mobilityStatus = 'Optimal';
  else if (averageMobility >= 60) mobilityStatus = 'Stable';
  else mobilityStatus = 'Needs attention';

  const history = combined.map((entry) => ({
    date: entry.date,
    mobilityScore: entry.mobilityScore,
    exerciseName: entry.exerciseName,
  }));

  return {
    averageMobility,
    latestMobility,
    mobilityStatus,
    history,
    totalRecords: combined.length,
  };
};

const buildSummary = (progress, appointments, plans, journals = []) => {
  const completed = progress.filter((entry) => entry.completionStatus === 'Completed');
  const trackedPain = progress.filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null);
  const trackedMobility = progress.filter((entry) => entry.mobilityScore !== undefined && entry.mobilityScore !== null);
  const pastAppointments = appointments.filter((appointment) => new Date(appointment.appointmentDate) < new Date() && !['Cancelled', 'NoShow'].includes(appointment.status));
  const attendedAppointments = pastAppointments.filter((appointment) => appointment.status === 'Completed');

  const totalAssigned = plans.reduce((acc, plan) => acc + (plan.exercises?.length || 0), 0);
  const completionRate = totalAssigned > 0 ? Math.min(100, Math.round((completed.length / totalAssigned) * 100)) : progress.length ? Math.round((completed.length / progress.length) * 100) : 0;

  return {
    completedSessions: completed.length,
    totalSessions: progress.length,
    exerciseAdherence: completionRate,
    completionRate,
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
    const date = toISODate(entry.datePerformed);
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

export const getProgressPayload = async (patientId) => {
  const [patient, progress, appointments, plans, journals] = await Promise.all([
    Patient.findById(patientId).populate('user', 'name email').lean(),
    Progress.find({ patient: patientId })
      .sort({ datePerformed: 1 })
      .populate('exercise', 'name category targetBodyPart difficulty duration sets reps instructions precautions videoUrl imageUrl')
      .lean(),
    Appointment.find({ patient: patientId })
      .sort({ appointmentDate: 1 })
      .populate('therapist', 'specialization user')
      .lean(),
    ExercisePlan.find({ patient: patientId, status: { $in: ['Active', 'Paused', 'Completed'] } })
      .populate('exercises.exercise')
      .lean(),
    PainJournal.find({ patient: patientId }).sort({ dateString: 1, createdAt: 1 }).lean(),
  ]);

  const completedProgress = progress.filter((p) => p.completionStatus === 'Completed');
  const totalAssigned = plans.reduce((acc, plan) => acc + (plan.exercises?.length || 0), 0);
  const completedCount = completedProgress.length;
  const remainingCount = Math.max(0, totalAssigned - completedCount);
  const completionPercentage = totalAssigned > 0 ? Math.min(100, Math.round((completedCount / totalAssigned) * 100)) : 0;

  const { currentStreak, bestStreak } = calculateStreaks(completedProgress);
  const weekly = buildWeeklyMatrix(completedProgress, plans);
  const monthly = buildMonthlyStats(completedProgress, currentStreak);
  const completionTrend = buildCompletionTrends(completedProgress);
  const painTrend = buildPainTrendAnalytics(progress, journals);
  const mobilityTrend = buildMobilityTrendAnalytics(progress, journals);

  const weeklyCompletionPercentage = weekly.reduce((acc, d) => acc + d.completed, 0);
  const totalWeeklyTarget = weekly.reduce((acc, d) => acc + d.target, 0) || 1;
  const weeklyRate = Math.min(100, Math.round((weeklyCompletionPercentage / totalWeeklyTarget) * 100));

  const overview = {
    totalAssigned,
    completed: completedCount,
    remaining: remainingCount,
    completionPercentage,
    currentStreak,
    bestStreak,
    weeklyCompletionPercentage: weeklyRate,
    monthlyCompletionPercentage: monthly.completionPercentage,
  };

  return {
    patient,
    overview,
    weekly,
    monthly,
    completionTrend,
    painTrend,
    mobilityTrend,
    entries: progress,
    timeline: buildTimeline(progress),
    summary: buildSummary(progress, appointments, plans),
    appointments,
    plans,
    painJournal: journals,
  };
};

export const getMyProgress = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const payload = await getProgressPayload(patient._id);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load progress' });
  }
};

export const recordMyProgress = async (req, res) => {
  try {
    const { exercise, exercisePlan, completionStatus = 'Completed', painLevel, mobilityScore, notes, repsCompleted, setsCompleted, difficulty } = req.body;
    const patient = await getPatient(req.user);
    const plan = await ExercisePlan.findOne({ _id: exercisePlan, patient: patient?._id });
    if (!patient || !plan || !plan.exercises.some((item) => String(item.exercise?._id || item.exercise) === String(exercise))) {
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
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const patients = await Patient.find({
      $or: [
        { assignedTherapist: therapist._id },
        { _id: { $in: therapist.patientsAssigned || [] } },
        { assignedTherapist: null },
        { assignedTherapist: { $exists: false } },
      ],
    }).populate('user', 'name email').lean();
    const summaries = await Promise.all(patients.map(async (patient) => {
      const payload = await getProgressPayload(patient._id);
      return { patient: payload.patient, summary: payload.summary, timeline: payload.timeline, overview: payload.overview };
    }));
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient progress' });
  }
};

export const getTherapistPatientProgress = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const isAssigned =
      !patient.assignedTherapist ||
      String(patient.assignedTherapist) === String(therapist._id) ||
      (therapist.patientsAssigned || []).some((id) => String(id) === String(patient._id));

    if (!isAssigned) {
      const hasConnection = await Appointment.exists({ therapist: therapist._id, patient: patient._id });
      if (!hasConnection) {
        return res.status(403).json({ message: 'You are not authorized to view this patient record' });
      }
    }

    res.json(await getProgressPayload(patient._id));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient progress' });
  }
};