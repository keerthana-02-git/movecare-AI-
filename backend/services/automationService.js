import {
  Appointment,
  ExercisePlan,
  Notification,
  Patient,
  Progress,
  Therapist,
} from '../models/index.js';

let schedulerInterval = null;

/**
 * Detects pending assigned exercises for active patients and sends deduplicated reminders.
 */
export const runDailyExerciseReminders = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let createdCount = 0;

  const activePatients = await Patient.find({ status: 'Active' })
    .populate('user', 'name email')
    .lean();

  for (const patient of activePatients) {
    if (!patient.user?._id) continue;

    const activePlans = await ExercisePlan.find({
      patient: patient._id,
      status: 'Active',
    }).lean();

    const totalScheduledToday = activePlans.reduce(
      (sum, plan) => sum + (Array.isArray(plan.exercises) ? plan.exercises.length : 0),
      0
    );

    if (totalScheduledToday === 0) continue;

    const completedToday = await Progress.countDocuments({
      patient: patient._id,
      datePerformed: { $gte: startOfToday },
      completionStatus: 'Completed',
    });

    const pendingCount = Math.max(0, totalScheduledToday - completedToday);

    if (pendingCount > 0) {
      const alreadySent = await Notification.findOne({
        recipient: patient.user._id,
        type: 'ExerciseReminder',
        createdAt: { $gte: startOfToday },
      });

      if (!alreadySent) {
        await Notification.create({
          recipient: patient.user._id,
          type: 'ExerciseReminder',
          title: 'Daily Exercise Reminder',
          message: `You have ${pendingCount} prescribed exercise(s) remaining for today. Take 10–15 minutes to stay on track with your recovery.`,
          priority: 'Normal',
          relatedEntity: { entityType: 'Patient', entityId: patient._id },
        });
        createdCount++;
      }
    }
  }

  return createdCount;
};

/**
 * Identifies patients with missed exercise routines (2+ days without logged progress)
 * and notifies both the patient and their authorized clinician without leaking data.
 */
export const runMissedActivityDetection = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let createdCount = 0;

  const activePatients = await Patient.find({ status: 'Active' })
    .populate('user', 'name email')
    .populate({
      path: 'assignedTherapist',
      populate: { path: 'user', select: 'name email' },
    })
    .lean();

  for (const patient of activePatients) {
    if (!patient.user?._id) continue;

    const activePlans = await ExercisePlan.find({
      patient: patient._id,
      status: 'Active',
    }).lean();

    if (!activePlans.length) continue;

    const latestProgress = await Progress.findOne({
      patient: patient._id,
      completionStatus: 'Completed',
    })
      .sort({ datePerformed: -1 })
      .lean();

    let daysSinceLast = 2;
    if (latestProgress?.datePerformed) {
      daysSinceLast = Math.floor(
        (now.getTime() - new Date(latestProgress.datePerformed).getTime()) / (1000 * 3600 * 24)
      );
    }

    if (daysSinceLast >= 2) {
      // 1. Notify Patient
      const alreadyNotifiedPatient = await Notification.findOne({
        recipient: patient.user._id,
        type: 'MissedActivity',
        createdAt: { $gte: startOfToday },
      });

      if (!alreadyNotifiedPatient) {
        await Notification.create({
          recipient: patient.user._id,
          type: 'MissedActivity',
          title: 'Care Check-in: Missed Exercises',
          message: `It has been ${daysSinceLast} days since your last recorded physical therapy session. Regular motion prevents joint stiffness.`,
          priority: 'Normal',
          relatedEntity: { entityType: 'Patient', entityId: patient._id },
        });
        createdCount++;
      }

      // 2. Notify Authorized Supervising Clinician
      const therapistUserId = patient.assignedTherapist?.user?._id || patient.assignedTherapist?.user;
      if (therapistUserId) {
        const alreadyNotifiedTherapist = await Notification.findOne({
          recipient: therapistUserId,
          type: 'MissedActivity',
          'relatedEntity.entityId': patient._id,
          createdAt: { $gte: startOfToday },
        });

        if (!alreadyNotifiedTherapist) {
          await Notification.create({
            recipient: therapistUserId,
            type: 'MissedActivity',
            title: 'Patient Inactivity Alert',
            message: `Patient ${patient.user?.name || 'Assigned patient'} has not recorded exercise progress in ${daysSinceLast} days. Follow-up recommended.`,
            priority: 'High',
            relatedEntity: { entityType: 'Patient', entityId: patient._id },
          });
          createdCount++;
        }
      }
    }
  }

  return createdCount;
};

/**
 * Detects upcoming consultations in the next 24 to 48 hours and sends reminders
 * to both the patient and clinician.
 */
export const runUpcomingAppointmentReminders = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fortyEightHoursAhead = new Date(now.getTime() + 48 * 3600 * 1000);
  let createdCount = 0;

  const upcomingAppointments = await Appointment.find({
    appointmentDate: { $gte: now, $lte: fortyEightHoursAhead },
    status: { $in: ['Scheduled', 'Accepted'] },
  })
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
    .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
    .lean();

  for (const appt of upcomingAppointments) {
    const patientUserId = appt.patient?.user?._id || appt.patient?.user;
    const therapistUserId = appt.therapist?.user?._id || appt.therapist?.user;
    const apptDateStr = new Date(appt.appointmentDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Reminder to Patient
    if (patientUserId) {
      const alreadySentPatient = await Notification.findOne({
        recipient: patientUserId,
        type: 'Appointment',
        'relatedEntity.entityId': appt._id,
        createdAt: { $gte: startOfToday },
      });

      if (!alreadySentPatient) {
        const therapistName = appt.therapist?.user?.name || 'your physical therapist';
        await Notification.create({
          recipient: patientUserId,
          type: 'Appointment',
          title: 'Upcoming Consultation Reminder',
          message: `You have an upcoming telehealth consultation with Dr. ${therapistName} on ${apptDateStr} from ${appt.startTime} to ${appt.endTime}.`,
          priority: 'High',
          relatedEntity: { entityType: 'Appointment', entityId: appt._id },
        });
        createdCount++;
      }
    }

    // Reminder to Therapist
    if (therapistUserId) {
      const alreadySentTherapist = await Notification.findOne({
        recipient: therapistUserId,
        type: 'Appointment',
        'relatedEntity.entityId': appt._id,
        createdAt: { $gte: startOfToday },
      });

      if (!alreadySentTherapist) {
        const patientName = appt.patient?.user?.name || 'Patient';
        await Notification.create({
          recipient: therapistUserId,
          type: 'Appointment',
          title: 'Upcoming Patient Consultation',
          message: `You have a scheduled virtual consultation with ${patientName} on ${apptDateStr} from ${appt.startTime} to ${appt.endTime}.`,
          priority: 'Normal',
          relatedEntity: { entityType: 'Appointment', entityId: appt._id },
        });
        createdCount++;
      }
    }
  }

  return createdCount;
};

/**
 * Master automation cycle combining all jobs.
 */
export const runAllAutomation = async () => {
  const [exerciseReminders, missedActivityAlerts, appointmentReminders] = await Promise.all([
    runDailyExerciseReminders().catch((err) => {
      console.error('Automation error in runDailyExerciseReminders:', err.message);
      return 0;
    }),
    runMissedActivityDetection().catch((err) => {
      console.error('Automation error in runMissedActivityDetection:', err.message);
      return 0;
    }),
    runUpcomingAppointmentReminders().catch((err) => {
      console.error('Automation error in runUpcomingAppointmentReminders:', err.message);
      return 0;
    }),
  ]);

  return {
    executedAt: new Date(),
    exerciseReminders,
    missedActivityAlerts,
    appointmentReminders,
    totalCreated: exerciseReminders + missedActivityAlerts + appointmentReminders,
  };
};

/**
 * Initializes server-side timer for periodic automation runs.
 */
export const startAutomationScheduler = (intervalMs = 3600000) => {
  if (schedulerInterval) return schedulerInterval;

  // Run initial pass after 10 seconds to warm up
  setTimeout(() => {
    runAllAutomation().catch((err) => console.error('Initial automation error:', err.message));
  }, 10000);

  schedulerInterval = setInterval(() => {
    runAllAutomation().catch((err) => console.error('Periodic automation error:', err.message));
  }, intervalMs);

  return schedulerInterval;
};

export const stopAutomationScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};
