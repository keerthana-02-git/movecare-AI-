import mongoose from 'mongoose';
import {
  AiRecommendation,
  Appointment,
  Exercise,
  ExercisePlan,
  Notification,
  PainJournal,
  Patient,
  Progress,
  Therapist,
} from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { ensurePatientProfile } from './patientController.js';

const difficultyOrder = ['Easy', 'Medium', 'Hard'];

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 35;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!birthdayPassed) age -= 1;
  return isNaN(age) ? 35 : age;
};

const buildRecommendationProfile = (patient, progress, targetBodyPart = '') => {
  const latest = progress[0];
  const conditionText = `${patient.medicalCondition || ''} ${patient.injuryDescription || ''} ${targetBodyPart || ''}`.toLowerCase();
  const validPainEntries = progress
    .filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null)
    .slice(0, 5);
  const averagePain = validPainEntries.length
    ? Math.round(
        (validPainEntries.reduce((total, entry) => total + entry.painLevel, 0) / validPainEntries.length) * 10
      ) / 10
    : null;

  return {
    condition: patient.medicalCondition,
    age: calculateAge(patient.dateOfBirth),
    painLevel: latest?.painLevel ?? averagePain,
    mobilityLevel: latest?.mobilityScore ?? null,
    previousSessions: progress.length,
    completedSessions: progress.filter((entry) => entry.completionStatus === 'Completed').length,
    conditionText,
    targetBodyPart,
  };
};

const suggestedPlan = (profile) => {
  const pain = profile.painLevel ?? 4;
  const mobility = profile.mobilityLevel ?? 55;
  let difficulty = mobility < 40 ? 'Easy' : mobility < 70 ? 'Medium' : 'Hard';
  let duration = pain >= 7 ? 5 : pain >= 4 ? 10 : 15;
  let frequency = pain >= 7 ? 'Every other day' : mobility < 45 ? '3 times per week' : 'Daily';

  if (pain >= 7) difficulty = 'Easy';
  if (profile.age >= 70 && difficulty === 'Hard') difficulty = 'Medium';
  if (profile.completedSessions === 0) difficulty = 'Easy';

  return { difficulty, duration, frequency };
};

const scoreExercise = (exercise, profile, plan) => {
  const text = `${exercise.name} ${exercise.description || ''} ${exercise.targetBodyPart || ''} ${exercise.category || ''}`.toLowerCase();
  let score = 0;

  if (profile.targetBodyPart && exercise.targetBodyPart) {
    if (exercise.targetBodyPart.toLowerCase() === profile.targetBodyPart.toLowerCase()) {
      score += 6;
    }
  }

  const conditionTerms = profile.conditionText
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);
  conditionTerms.forEach((term) => {
    if (text.includes(term)) score += 4;
  });

  if (profile.painLevel !== null && profile.painLevel >= 7) {
    if (['Stretching', 'Flexibility', 'Balance'].includes(exercise.category)) score += 5;
    if (exercise.difficulty === 'Easy') score += 4;
    if (exercise.difficulty === 'Hard') score -= 10;
  }

  if (profile.mobilityLevel !== null && profile.mobilityLevel < 50 && ['Balance', 'Flexibility', 'Stretching'].includes(exercise.category)) {
    score += 3;
  }

  if (exercise.difficulty === plan.difficulty) score += 3;
  if (difficultyOrder.indexOf(exercise.difficulty) <= difficultyOrder.indexOf(plan.difficulty)) score += 1;
  if (profile.age >= 65 && exercise.difficulty === 'Easy') score += 2;

  return score;
};

const recommendationReason = (exercise, profile, plan) => {
  if (profile.painLevel !== null && profile.painLevel >= 7) {
    return 'Prioritizes lower-load, gentle movement while your reported pain is high.';
  }
  if (profile.targetBodyPart && exercise.targetBodyPart?.toLowerCase() === profile.targetBodyPart.toLowerCase()) {
    return `Specifically targets the ${exercise.targetBodyPart} region with controlled biomechanics.`;
  }
  if (profile.mobilityLevel !== null && profile.mobilityLevel < 50) {
    return 'Supports mobility restoration with controlled progressive movement.';
  }
  if (exercise.difficulty === plan.difficulty) {
    return `Matches your suggested ${plan.difficulty.toLowerCase()} rehabilitation level.`;
  }
  return 'Aligns with your recovery condition and exercise history.';
};

// ============================================================================
// FEATURE 1: AI EXERCISE RECOMMENDATION (With Real MongoDB Persistence)
// ============================================================================
export const getRecommendations = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const requestedBodyPart = String(req.query.bodyPart || '').trim();

    let [progress, plans, exercises, latestJournal] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(50).lean(),
      ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } }).select('exercises.exercise').lean(),
      Exercise.find(patient.assignedTherapist ? { createdBy: patient.assignedTherapist } : {}).sort({ name: 1 }).lean(),
      PainJournal.findOne({ patient: patient._id }).sort({ date: -1 }).lean(),
    ]);

    if (!exercises.length) {
      exercises = await Exercise.find().sort({ name: 1 }).lean();
    }

    const profile = buildRecommendationProfile(patient, progress, requestedBodyPart);
    if (latestJournal?.painLevel !== undefined && profile.painLevel === null) {
      profile.painLevel = latestJournal.painLevel;
    }

    const plan = suggestedPlan(profile);
    const assignedIds = new Set(
      plans.flatMap((item) => (item.exercises || []).map((ex) => String(ex.exercise)))
    );

    const scored = exercises
      .map((exercise) => ({ exercise, score: scoreExercise(exercise, profile, plan) }))
      .sort((first, second) => second.score - first.score)
      .slice(0, 5);

    const recommendations = scored.map(({ exercise }) => ({
      exercise,
      name: exercise.name,
      targetBodyPart: exercise.targetBodyPart,
      difficulty: exercise.difficulty,
      suggestedDifficulty: plan.difficulty,
      suggestedDuration: plan.duration,
      suggestedFrequency: plan.frequency,
      reason: assignedIds.has(String(exercise._id))
        ? 'Already assigned in your active plan; review the suggested pacing with your therapist.'
        : recommendationReason(exercise, profile, plan),
      alreadyAssigned: assignedIds.has(String(exercise._id)),
    }));

    // Persist to MongoDB as user application history
    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      therapist: patient.assignedTherapist || null,
      recommendationType: 'Exercise',
      inputProfile: {
        condition: profile.condition,
        age: profile.age,
        painLevel: profile.painLevel,
        mobilityLevel: profile.mobilityLevel,
        bodyPart: requestedBodyPart || 'General',
        completedSessions: profile.completedSessions,
      },
      plan,
      recommendations: recommendations.map((r) => ({
        exercise: r.exercise?._id,
        name: r.name,
        targetBodyPart: r.targetBodyPart,
        difficulty: r.difficulty,
        reason: r.reason,
        suggestedDifficulty: r.suggestedDifficulty,
        suggestedDuration: r.suggestedDuration,
        suggestedFrequency: r.suggestedFrequency,
        alreadyAssigned: r.alreadyAssigned,
      })),
      disclaimer:
        'This software feature provides educational exercise suggestions, not a medical diagnosis or treatment plan. Review changes with a licensed healthcare professional.',
    });

    res.json({
      recommendationId: savedRec._id,
      generatedAt: savedRec.createdAt,
      inputProfile: {
        condition: profile.condition,
        age: profile.age,
        painLevel: profile.painLevel,
        mobilityLevel: profile.mobilityLevel,
        previousExerciseSessions: profile.previousSessions,
        bodyPart: requestedBodyPart || 'All body parts',
      },
      plan,
      recommendations,
      disclaimer: savedRec.disclaimer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to generate recommendations' });
  }
};

// ============================================================================
// FEATURE 2: PROGRESS ANALYZER (Real MongoDB Data Analytics & Narrative)
// ============================================================================
export const analyzeProgress = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const [progressList, plans, journals, appointments] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).populate('exercise').lean(),
      ExercisePlan.find({ patient: patient._id, status: 'Active' }).populate('exercises.exercise').lean(),
      PainJournal.find({ patient: patient._id }).sort({ date: -1 }).limit(14).lean(),
      Appointment.find({ patient: patient._id }).sort({ appointmentDate: -1 }).limit(5).lean(),
    ]);

    const totalSessions = progressList.length;
    const completedSessions = progressList.filter((p) => p.completionStatus === 'Completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const validPain = progressList.filter((p) => p.painLevel !== undefined && p.painLevel !== null);
    const avgPain = validPain.length
      ? Math.round((validPain.reduce((sum, p) => sum + p.painLevel, 0) / validPain.length) * 10) / 10
      : null;

    const validMobility = progressList.filter((p) => p.mobilityScore !== undefined && p.mobilityScore !== null);
    const avgMobility = validMobility.length
      ? Math.round(validMobility.reduce((sum, p) => sum + p.mobilityScore, 0) / validMobility.length)
      : null;

    // Generate observations and next steps based on real metrics
    const summary = totalSessions > 0
      ? `You have logged ${completedSessions} completed physical therapy session(s) across your recovery program with an average mobility score of ${avgMobility ?? 50}/100 and an average reported pain rating of ${avgPain ?? 'moderate'}/10.`
      : 'Your recovery profile is freshly set up. Once you log exercises and pain check-ins, the analyzer will compute comprehensive clinical adherence trends.';

    const adherenceObservations = completionRate >= 80
      ? `Excellent exercise adherence (${completionRate}%). Regular execution promotes optimal neuromuscular re-education.`
      : completionRate >= 50
      ? `Moderate adherence (${completionRate}%). Maintaining a consistent daily routine will accelerate functional range-of-motion recovery.`
      : totalSessions > 0
      ? `Adherence is currently ${completionRate}%. Try breaking your prescribed routines into shorter, more frequent movement bouts.`
      : 'No sessions logged yet. Complete your first assigned exercise to begin building your consistency score.';

    const improvementAreas = [];
    if (avgPain !== null && avgPain >= 6) {
      improvementAreas.push('Pain modulation: High reported discomfort during or after movements indicates a need for lower-intensity modifications.');
    }
    if (avgMobility !== null && avgMobility < 60) {
      improvementAreas.push('End-range joint mobility: Focus on slow, controlled eccentric contractions to safely expand active range.');
    }
    if (plans.length > 0 && completedSessions < plans.length * 2) {
      improvementAreas.push('Routine completion consistency: Aim to complete all scheduled sets rather than partial sets.');
    }
    if (improvementAreas.length === 0) {
      improvementAreas.push('Postural stamina: Continue building muscular endurance through sustained holds and stability work.');
      improvementAreas.push('Movement symmetry: Ensure equal bilateral loading between affected and non-affected sides.');
    }

    const suggestedNextSteps = [
      'Maintain daily pain logging in your MoveCare Pain Journal to assist your physical therapist in tuning your care plan.',
      avgPain !== null && avgPain >= 6
        ? 'Notify your therapist regarding persistent elevated discomfort before progressing resistance levels.'
        : 'Gradually increase movement hold times as tolerated without exceeding your comfortable pain threshold.',
      'Review your upcoming telehealth consultation schedule to prepare any questions for your clinician.',
    ];

    const analysis = {
      summary,
      adherenceObservations,
      improvementAreas,
      suggestedNextSteps,
    };

    // Persist to MongoDB
    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      therapist: patient.assignedTherapist || null,
      recommendationType: 'ProgressAnalysis',
      inputProfile: {
        condition: patient.medicalCondition,
        painLevel: avgPain,
        mobilityLevel: avgMobility,
        adherenceRate: completionRate,
        completedSessions,
      },
      analysis,
      disclaimer:
        'The MoveCare Progress Analyzer provides software-generated observations based on your self-reported logs. It is not a clinical diagnosis. Discuss results with your physical therapist.',
    });

    // If high pain detected (>= 7), generate AIAlert for patient and clinician
    if (avgPain !== null && avgPain >= 7) {
      const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      const alreadyNotified = await Notification.findOne({
        recipient: req.user._id,
        type: 'AIAlert',
        createdAt: { $gte: startOfToday },
      });
      if (!alreadyNotified) {
        await Notification.create({
          recipient: req.user._id,
          type: 'AIAlert',
          title: 'AI Clinical Alert: Elevated Pain',
          message: `Elevated pain level (${avgPain}/10) detected in your recent logs. Low-intensity movements and rest recommended.`,
          priority: 'High',
          relatedEntity: { entityType: 'Patient', entityId: patient._id },
        });
      }

      if (patient.assignedTherapist) {
        const therapistDoc = await Therapist.findById(patient.assignedTherapist).select('user');
        if (therapistDoc?.user) {
          const alreadyNotifiedDoc = await Notification.findOne({
            recipient: therapistDoc.user,
            type: 'AIAlert',
            'relatedEntity.entityId': patient._id,
            createdAt: { $gte: startOfToday },
          });
          if (!alreadyNotifiedDoc) {
            await Notification.create({
              recipient: therapistDoc.user,
              type: 'AIAlert',
              title: 'Patient Severe Pain Alert',
              message: `Patient ${req.user.name || 'Patient'} has logged an elevated average pain of ${avgPain}/10 during progress analysis.`,
              priority: 'Urgent',
              relatedEntity: { entityType: 'Patient', entityId: patient._id },
            });
          }
        }
      }
    }

    res.json({
      analysisId: savedRec._id,
      generatedAt: savedRec.createdAt,
      metrics: {
        totalSessions,
        completedSessions,
        completionRate,
        averagePain: avgPain,
        averageMobility: avgMobility,
        journalEntriesCount: journals.length,
        appointmentsCount: appointments.length,
      },
      analysis,
      disclaimer: savedRec.disclaimer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to analyze progress' });
  }
};

// ============================================================================
// FEATURE 3: ADAPTIVE EXERCISE RECOMMENDATION (Responds to Pain & Progress Changes)
// ============================================================================
export const getAdaptiveRecommendations = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const [progress, latestJournal, plans, exercises] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(10).populate('exercise').lean(),
      PainJournal.findOne({ patient: patient._id }).sort({ date: -1 }).lean(),
      ExercisePlan.find({ patient: patient._id, status: 'Active' }).select('exercises.exercise').lean(),
      Exercise.find().sort({ name: 1 }).lean(),
    ]);

    const recentPain = latestJournal?.painLevel ?? progress[0]?.painLevel ?? 3;
    const recentMobility = latestJournal?.mobilityScore ?? progress[0]?.mobilityScore ?? 65;

    let adaptiveCategory = 'Maintenance';
    let safetyNotice = '';
    let targetDifficulty = 'Medium';
    let targetDuration = 10;
    let frequency = 'Daily';

    // High Pain Adaption (>= 7/10)
    if (recentPain >= 7) {
      adaptiveCategory = 'De-escalation & Protection';
      safetyNotice = `Elevated pain level (${recentPain}/10) detected. High-load and strenuous movements have been removed. Gentle decompression, low-load stretches, and isometric stability are recommended. If sharp or radiating pain persists, pause exercise and request an assessment from your physical therapist.`;
      targetDifficulty = 'Easy';
      targetDuration = 5;
      frequency = 'Every other day';
    } else if (recentPain <= 3 && recentMobility >= 70 && progress.length >= 3) {
      // Low Pain / Good Mobility Progression
      adaptiveCategory = 'Gradual Functional Progression';
      safetyNotice = `Low pain (${recentPain}/10) and favorable mobility (${recentMobility}/100) observed across recent sessions. Safe progressive loading and extended holds have been integrated into recommendations to build endurance.`;
      targetDifficulty = 'Hard';
      targetDuration = 15;
      frequency = 'Daily';
    } else {
      // Moderate baseline
      adaptiveCategory = 'Balanced Rehabilitation';
      safetyNotice = `Moderate pain response (${recentPain}/10). Recommended routine maintains steady neuromuscular activation without overloading target tissues.`;
      targetDifficulty = recentMobility < 50 ? 'Easy' : 'Medium';
      targetDuration = 10;
      frequency = 'Daily';
    }

    const assignedIds = new Set(
      plans.flatMap((p) => (p.exercises || []).map((e) => String(e.exercise)))
    );

    // Filter exercises appropriate for the adaptive state
    let filteredExercises = exercises;
    if (recentPain >= 7) {
      filteredExercises = exercises.filter(
        (ex) =>
          ex.difficulty === 'Easy' ||
          ['Stretching', 'Flexibility', 'Balance'].includes(ex.category)
      );
    }

    const recommendations = (filteredExercises.length ? filteredExercises : exercises)
      .slice(0, 4)
      .map((ex) => ({
        exercise: ex,
        name: ex.name,
        targetBodyPart: ex.targetBodyPart,
        difficulty: ex.difficulty,
        suggestedDifficulty: targetDifficulty,
        suggestedDuration: targetDuration,
        suggestedFrequency: frequency,
        alreadyAssigned: assignedIds.has(String(ex._id)),
        reason: recentPain >= 7
          ? 'Gentle restorative movement selected to protect irritated tissue while pain is elevated.'
          : recentPain <= 3
          ? 'Progressive resistance chosen to build structural strength and active joint capacity.'
          : 'Stabilizing movement matching your current rehabilitation phase.',
      }));

    // Persist to MongoDB
    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      therapist: patient.assignedTherapist || null,
      recommendationType: 'AdaptiveExercise',
      inputProfile: {
        condition: patient.medicalCondition,
        painLevel: recentPain,
        mobilityLevel: recentMobility,
        completedSessions: progress.length,
      },
      plan: {
        difficulty: targetDifficulty,
        duration: targetDuration,
        frequency,
      },
      recommendations: recommendations.map((r) => ({
        exercise: r.exercise?._id,
        name: r.name,
        targetBodyPart: r.targetBodyPart,
        difficulty: r.difficulty,
        reason: r.reason,
        suggestedDifficulty: r.suggestedDifficulty,
        suggestedDuration: r.suggestedDuration,
        suggestedFrequency: r.suggestedFrequency,
        alreadyAssigned: r.alreadyAssigned,
      })),
      analysis: {
        summary: safetyNotice,
        adherenceObservations: `Adaptive protocol: ${adaptiveCategory}`,
      },
      disclaimer:
        'Adaptive suggestions dynamically reflect your recent self-reported pain and progress. They are supportive guidance and do not replace your clinician’s orders.',
    });

    res.json({
      recommendationId: savedRec._id,
      generatedAt: savedRec.createdAt,
      adaptiveCategory,
      recentPain,
      recentMobility,
      safetyNotice,
      plan: {
        difficulty: targetDifficulty,
        duration: targetDuration,
        frequency,
      },
      recommendations,
      disclaimer: savedRec.disclaimer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to generate adaptive recommendations' });
  }
};

// ============================================================================
// FEATURE 4: SMART REMINDERS (Agentic Evaluation of Real MongoDB Data)
// ============================================================================
export const generateSmartReminders = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const now = new Date();
    const fortyEightHoursAhead = new Date(now.getTime() + 48 * 3600 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [upcomingAppointments, activePlans, todayProgress, recentActivity] = await Promise.all([
      Appointment.find({
        patient: patient._id,
        appointmentDate: { $gte: now, $lte: fortyEightHoursAhead },
        status: { $in: ['Scheduled', 'Accepted'] },
      }).populate({ path: 'therapist', populate: { path: 'user', select: 'name' } }).lean(),
      ExercisePlan.find({ patient: patient._id, status: 'Active' }).populate('exercises.exercise').lean(),
      Progress.find({
        patient: patient._id,
        datePerformed: { $gte: startOfToday },
        completionStatus: 'Completed',
      }).lean(),
      Progress.findOne({ patient: patient._id }).sort({ datePerformed: -1 }).lean(),
    ]);

    const reminders = [];
    const notificationsCreated = [];

    // 1. Upcoming Consultation Check
    for (const appt of upcomingAppointments) {
      const therapistName = appt.therapist?.user?.name || 'your physical therapist';
      const apptDateStr = new Date(appt.appointmentDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const msg = `Upcoming Consultation Reminder: You have an appointment with ${therapistName} on ${apptDateStr} from ${appt.startTime} to ${appt.endTime}.`;

      // Check if a reminder for this appointment was already generated today
      const alreadySent = await Notification.findOne({
        recipient: req.user._id,
        'relatedEntity.entityId': appt._id,
        createdAt: { $gte: startOfToday },
      });

      if (!alreadySent) {
        const notif = await Notification.create({
          recipient: req.user._id,
          title: 'Upcoming Telehealth Consultation',
          message: msg,
          type: 'Appointment',
          priority: 'High',
          relatedEntity: { entityType: 'Appointment', entityId: appt._id },
        });
        notificationsCreated.push(notif);
      }

      reminders.push({
        type: 'Appointment',
        message: msg,
        triggerReason: 'Upcoming appointment within 48 hours',
        targetDate: appt.appointmentDate,
      });
    }

    // 2. Pending Daily Exercises Check
    const totalScheduledToday = activePlans.reduce(
      (sum, plan) => sum + (plan.exercises ? plan.exercises.length : 0),
      0
    );
    const completedToday = todayProgress.length;
    const pendingCount = Math.max(0, totalScheduledToday - completedToday);

    if (pendingCount > 0) {
      const msg = `Daily Exercise Reminder: You have ${pendingCount} prescribed exercise(s) remaining for today. Take 10–15 minutes to keep your recovery on track.`;

      const alreadyRemindedToday = await Notification.findOne({
        recipient: req.user._id,
        type: 'ExerciseReminder',
        createdAt: { $gte: startOfToday },
      });

      if (!alreadyRemindedToday) {
        const notif = await Notification.create({
          recipient: req.user._id,
          title: 'Daily Exercise Reminder',
          message: msg,
          type: 'ExerciseReminder',
          priority: 'Normal',
        });
        notificationsCreated.push(notif);
      }

      reminders.push({
        type: 'ExerciseReminder',
        message: msg,
        triggerReason: `${pendingCount} exercise(s) scheduled today but not yet logged`,
        targetDate: now,
      });
    }

    // 3. Missed Exercise Activity Check (>= 2 days inactivity)
    if (recentActivity?.datePerformed) {
      const daysSinceLastSession = Math.floor(
        (now.getTime() - new Date(recentActivity.datePerformed).getTime()) / (1000 * 3600 * 24)
      );

      if (daysSinceLastSession >= 2) {
        const msg = `Care Check-in: It has been ${daysSinceLastSession} days since your last recorded physical therapy session. Consistency is key to mobility. Start with a light stretch today!`;

        const recentInactivityNotif = await Notification.findOne({
          recipient: req.user._id,
          type: 'ProgressUpdate',
          createdAt: { $gte: startOfToday },
        });

        if (!recentInactivityNotif) {
          const notif = await Notification.create({
            recipient: req.user._id,
            title: 'Recovery Check-in',
            message: msg,
            type: 'ProgressUpdate',
            priority: 'Normal',
          });
          notificationsCreated.push(notif);
        }

        reminders.push({
          type: 'MissedActivity',
          message: msg,
          triggerReason: `No sessions logged in ${daysSinceLastSession} days`,
          targetDate: now,
        });
      }
    }

    // Persist to MongoDB
    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      recommendationType: 'SmartReminder',
      reminders,
      agentActionsTaken: notificationsCreated.map((n) => ({
        actionType: 'NotificationDispatched',
        description: n.message,
        triggeredAt: n.createdAt,
      })),
      disclaimer: 'Smart reminders are automated check-ins based on your application schedule and activity logs.',
    });

    res.json({
      evaluationId: savedRec._id,
      evaluatedAt: savedRec.createdAt,
      remindersCount: reminders.length,
      notificationsCreatedCount: notificationsCreated.length,
      reminders,
      notificationsCreated,
    });
  } catch (error) {
    console.error('generateSmartReminders error:', error);
    res.status(500).json({ message: 'Unable to generate smart reminders', error: error.message });
  }
};

// ============================================================================
// FEATURE 5: THERAPIST AI SUMMARY (Real Patient Data Synthesis for Clinicians)
// ============================================================================
export const getTherapistPatientSummary = async (req, res) => {
  try {
    const therapist = await ensureTherapistProfile(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: 'Invalid patient ID format' });
    }

    const patient = await Patient.findById(patientId).populate('user', 'name email').lean();
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Authorization: Must be assigned therapist or have patient in care roster
    const isAssigned =
      String(patient.assignedTherapist) === String(therapist._id) ||
      (therapist.patientsAssigned || []).some((id) => String(id) === String(patient._id));

    if (!isAssigned) {
      return res.status(403).json({ message: 'Not authorized to view clinical summary for this patient' });
    }

    const [progressList, plans, painEntries, upcomingAppt] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).populate('exercise').lean(),
      ExercisePlan.find({ patient: patient._id }).populate('exercises.exercise').lean(),
      PainJournal.find({ patient: patient._id }).sort({ date: -1 }).limit(10).lean(),
      Appointment.findOne({
        patient: patient._id,
        therapist: therapist._id,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['Scheduled', 'Accepted'] },
      }).sort({ appointmentDate: 1 }).lean(),
    ]);

    const totalSessions = progressList.length;
    const completedSessions = progressList.filter((p) => p.completionStatus === 'Completed').length;
    const adherence = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Completed Exercises Set
    const completedExerciseNames = Array.from(
      new Set(
        progressList
          .filter((p) => p.completionStatus === 'Completed' && p.exercise?.name)
          .map((p) => p.exercise.name)
      )
    );

    // Pain Trend Calculation
    const painLevels = painEntries.map((entry) => entry.painLevel).filter((v) => v !== undefined);
    let painTrend = 'No self-reported pain entries recorded yet.';
    if (painLevels.length >= 2) {
      const recent = painLevels[0];
      const older = painLevels[painLevels.length - 1];
      if (recent < older) {
        painTrend = `Favorable reduction: Reported pain decreased from ${older}/10 to ${recent}/10 over the last ${painLevels.length} check-ins.`;
      } else if (recent > older) {
        painTrend = `Caution: Pain increased from ${older}/10 to ${recent}/10. Review exercise volume and resistance in next visit.`;
      } else {
        painTrend = `Stable pain profile: Consistent average at ${recent}/10 across recent check-ins.`;
      }
    } else if (painLevels.length === 1) {
      painTrend = `Latest reported pain level: ${painLevels[0]}/10.`;
    }

    // Recent Progress Summary
    const recentProgress = totalSessions > 0
      ? `${completedSessions} of ${totalSessions} sessions completed (${adherence}% adherence). Latest session completed on ${new Date(progressList[0].datePerformed).toLocaleDateString('en-US')}.`
      : 'No active exercise sessions logged yet.';

    const upcomingAppointment = upcomingAppt
      ? `${new Date(upcomingAppt.appointmentDate).toLocaleDateString('en-US')} at ${upcomingAppt.startTime} (${upcomingAppt.type})`
      : 'No upcoming appointment currently scheduled.';

    const clinicalNotes = `Patient ${patient.user?.name} is being treated for ${patient.medicalCondition || 'musculoskeletal complaint'}. Current exercise adherence is ${adherence}%. ${painTrend} Next clinical review scheduled for ${upcomingAppointment}.`;

    const summaryData = {
      adherence,
      recentProgress,
      painTrend,
      completedExercises: completedExerciseNames,
      upcomingAppointment,
      clinicalNotes,
    };

    // Persist to MongoDB
    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      therapist: therapist._id,
      recommendationType: 'TherapistSummary',
      inputProfile: {
        condition: patient.medicalCondition,
        adherenceRate: adherence,
        completedSessions,
      },
      therapistSummary: summaryData,
      disclaimer: 'Clinician AI summary is an assistive overview aggregated from patient-reported entries and clinical logs.',
    });

    res.json({
      summaryId: savedRec._id,
      patient: {
        id: patient._id,
        name: patient.user?.name,
        email: patient.user?.email,
        condition: patient.medicalCondition,
      },
      summary: summaryData,
      disclaimer: savedRec.disclaimer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to generate therapist AI summary' });
  }
};

// ============================================================================
// FEATURE 6: AI HEALTH ASSISTANT (Contextual & Non-Diagnostic Assistant)
// ============================================================================
export const answerAssistant = async (req, res) => {
  try {
    const rawMessage = String(req.body.message || '').trim();
    if (!rawMessage) return res.status(400).json({ message: 'A message is required' });

    const message = rawMessage.toLowerCase();
    const patient = await ensurePatientProfile(req.user);

    // Retrieve real patient context from MongoDB
    let patientCondition = patient?.medicalCondition || 'General physical recovery';
    let assignedExercises = [];
    let recentPain = null;
    let nextAppt = null;

    if (patient) {
      const [plans, latestJournal, appt] = await Promise.all([
        ExercisePlan.find({ patient: patient._id, status: 'Active' }).populate('exercises.exercise').lean(),
        PainJournal.findOne({ patient: patient._id }).sort({ date: -1 }).lean(),
        Appointment.findOne({ patient: patient._id, appointmentDate: { $gte: new Date() }, status: { $in: ['Scheduled', 'Accepted'] } }).sort({ appointmentDate: 1 }).lean(),
      ]);

      assignedExercises = plans.flatMap((p) => (p.exercises || []).map((e) => e.exercise?.name).filter(Boolean));
      recentPain = latestJournal?.painLevel ?? null;
      nextAppt = appt;
    }

    let answer = '';

    // 1. Diagnostic / Medical Evaluation Guardrail
    if (
      message.includes('diagnos') ||
      message.includes('do i have') ||
      message.includes('is my bone broken') ||
      message.includes('torn ligament') ||
      message.includes('what disease') ||
      message.includes('can you cure')
    ) {
      answer = `I cannot provide a medical diagnosis, evaluate injuries, or prescribe clinical treatments. I am an AI recovery assistant designed to help you navigate your MoveCare exercises, track your progress, and prepare for your appointments. For any new, severe, or unexplained symptoms, please contact your licensed healthcare provider or emergency services immediately.`;
    }
    // 2. Pain & Discomfort Queries (Uses actual MongoDB pain journal data)
    else if (message.includes('pain') || message.includes('hurt') || message.includes('ache') || message.includes('sore')) {
      const painContext = recentPain !== null
        ? `Your most recent recorded pain level is ${recentPain}/10 in your Pain Journal.`
        : 'You do not have a recent pain level logged for today.';

      answer = `${painContext} During rehabilitation, mild muscular fatigue can be normal, but sharp, acute, or radiating pain is a signal to stop immediately. Record your symptoms in your Pain Journal so your therapist can review and adapt your movement program.`;
    }
    // 3. Exercise & Routine Queries (Uses actual MongoDB assigned exercises)
    else if (message.includes('exercise') || message.includes('routine') || message.includes('workout') || message.includes('today') || message.includes('prescribe')) {
      if (assignedExercises.length > 0) {
        answer = `According to your active MoveCare care plan for ${patientCondition}, your prescribed exercises are: ${assignedExercises.join(', ')}. You can review movement instructions, reps, and video demonstrations on your "My Exercises" page.`;
      } else {
        answer = `You currently have no active exercise plans assigned in your care roster for ${patientCondition}. Your physical therapist will assign appropriate rehabilitation routines during your next evaluation.`;
      }
    }
    // 4. Appointment & Consultation Queries (Uses actual MongoDB appointment)
    else if (message.includes('appointment') || message.includes('therapist') || message.includes('visit') || message.includes('doctor')) {
      if (nextAppt) {
        const apptDate = new Date(nextAppt.appointmentDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        answer = `Your next scheduled consultation is on ${apptDate} at ${nextAppt.startTime} (${nextAppt.type}). You can access the virtual consultation room from your Appointments dashboard once it is time for your visit.`;
      } else {
        answer = `You do not have any upcoming consultations scheduled right now. You can browse available therapists and book an appointment directly from your Appointments page.`;
      }
    }
    // 5. Progress, Score & Adherence Queries
    else if (message.includes('progress') || message.includes('score') || message.includes('streak') || message.includes('adherence')) {
      answer = `Your recovery progress combines completed daily exercise sessions, adherence rates, self-reported pain levels, and mobility scores. Open the "Progress" page on your dashboard to see your 7-day adherence matrix and completion trends.`;
    }
    // 6. Default Educational Musculoskeletal Guidance
    else {
      answer = `I am here to support your rehabilitation journey for ${patientCondition}. I can assist you with explaining your assigned exercises, checking your appointment schedule, interpreting your progress metrics, or reviewing your pain journal records. What would you like to explore?`;
    }

    res.json({
      answer,
      disclaimer: 'This assistant is a software guide and does not replace a licensed healthcare professional or provide clinical diagnoses.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to process assistant request' });
  }
};

// ============================================================================
// AGENTIC BEHAVIOR: End-to-End Observe-Analyze-Decide-Generate-Store-Trigger Loop
// ============================================================================
export const evaluatePatientAgent = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    // 1. OBSERVE: Gather relevant application state from MongoDB
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [progressList, latestJournal, plans, upcomingAppts] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(10).lean(),
      PainJournal.findOne({ patient: patient._id }).sort({ date: -1 }).lean(),
      ExercisePlan.find({ patient: patient._id, status: 'Active' }).populate('exercises.exercise').lean(),
      Appointment.find({
        patient: patient._id,
        appointmentDate: { $gte: now, $lte: new Date(now.getTime() + 48 * 3600 * 1000) },
        status: { $in: ['Scheduled', 'Accepted'] },
      }).lean(),
    ]);

    // 2. ANALYZE: Compute trends and clinical flags
    const currentPain = latestJournal?.painLevel ?? progressList[0]?.painLevel ?? 3;
    const completedSessions = progressList.filter((p) => p.completionStatus === 'Completed').length;
    const daysSinceLastActive = progressList[0]?.datePerformed
      ? Math.floor((now.getTime() - new Date(progressList[0].datePerformed).getTime()) / (1000 * 3600 * 24))
      : 0;

    // 3. DECIDE: Determine what actions or adaptations are warranted
    const actionsDecided = [];
    let notificationToDispatch = null;
    let adaptationNeeded = false;

    if (currentPain >= 7) {
      adaptationNeeded = true;
      actionsDecided.push('De-escalate exercise difficulty to Easy due to high pain');
      notificationToDispatch = {
        title: 'Pain Alert & Plan Adaptation',
        message: `We noticed your recent pain report is ${currentPain}/10. High-load movements have been paused. Please perform only gentle stretches and notify your physical therapist.`,
        type: 'AIAlert',
        priority: 'High',
        relatedEntity: { entityType: 'Patient', entityId: patient._id },
      };

      // Also escalate to assigned therapist
      if (patient.assignedTherapist) {
        const therapistUser = await Therapist.findById(patient.assignedTherapist).select('user');
        if (therapistUser?.user) {
          const therapistAlreadyAlerted = await Notification.findOne({
            recipient: therapistUser.user,
            type: 'AIAlert',
            'relatedEntity.entityId': patient._id,
            createdAt: { $gte: startOfToday },
          });
          if (!therapistAlreadyAlerted) {
            await Notification.create({
              recipient: therapistUser.user,
              type: 'AIAlert',
              title: 'Clinical Alert: Severe Pain Reported',
              message: `Patient ${req.user.name || 'Patient'} reported high pain (${currentPain}/10). Review recommended.`,
              priority: 'Urgent',
              relatedEntity: { entityType: 'Patient', entityId: patient._id },
            });
          }
        }
      }
    } else if (daysSinceLastActive >= 2) {
      actionsDecided.push('Trigger gentle inactivity check-in');
      notificationToDispatch = {
        title: 'Recovery Check-in',
        message: `It has been ${daysSinceLastActive} days since your last recorded session. Even a 5-minute gentle stretch helps keep your joints mobile.`,
        type: 'ExerciseReminder',
        priority: 'Normal',
      };
    } else if (upcomingAppts.length > 0) {
      actionsDecided.push('Trigger upcoming appointment alert');
      notificationToDispatch = {
        title: 'Upcoming Consultation',
        message: `You have an upcoming consultation in the next 48 hours. Please check your appointments tab to view details.`,
        type: 'Appointment',
        priority: 'High',
      };
    }

    // 4. GENERATE: Formulate adaptive guidance
    const generatedGuidance = adaptationNeeded
      ? 'De-escalated routine generated. Focus on breathing, gentle isometric holds, and low-impact joint lubrication.'
      : 'Maintain consistent daily execution of your prescribed physical therapy routines.';

    // 5. STORE: Persist recommendation result to MongoDB
    const agentActionsTaken = [];

    // 6. TRIGGER: Dispatch notification if action decided
    if (notificationToDispatch) {
      const alreadySent = await Notification.findOne({
        recipient: req.user._id,
        title: notificationToDispatch.title,
        createdAt: { $gte: startOfToday },
      });

      if (!alreadySent) {
        const notif = await Notification.create({
          recipient: req.user._id,
          ...notificationToDispatch,
        });
        agentActionsTaken.push({
          actionType: 'NotificationDispatched',
          description: notif.message,
          triggeredAt: notif.createdAt,
        });
      }
    }

    const savedRec = await AiRecommendation.create({
      patient: patient._id,
      recommendationType: adaptationNeeded ? 'AdaptiveExercise' : 'Exercise',
      inputProfile: {
        condition: patient.medicalCondition,
        painLevel: currentPain,
        completedSessions,
      },
      analysis: {
        summary: generatedGuidance,
        adherenceObservations: `Agent decisions: ${actionsDecided.join('; ') || 'Standard monitoring'}`,
      },
      agentActionsTaken,
      disclaimer: 'Agentic evaluation automates clinical workflow observations and alerts without replacing professional medical judgment.',
    });

    res.json({
      agentEvaluationId: savedRec._id,
      observedState: {
        currentPain,
        completedSessions,
        daysSinceLastActive,
        upcomingAppointmentsCount: upcomingAppts.length,
      },
      analysis: {
        decisions: actionsDecided,
        guidance: generatedGuidance,
      },
      agentActionsTaken,
      disclaimer: savedRec.disclaimer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to perform agent evaluation' });
  }
};

// ============================================================================
// THERAPIST BULK RECOMMENDATIONS
// ============================================================================
export const getTherapistRecommendations = async (req, res) => {
  try {
    const therapist = await ensureTherapistProfile(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    let [patients, exercises] = await Promise.all([
      Patient.find({
        $or: [
          { assignedTherapist: therapist._id },
          { _id: { $in: therapist.patientsAssigned || [] } },
          { assignedTherapist: null },
          { assignedTherapist: { $exists: false } },
        ],
      })
        .populate('user', 'name email')
        .lean(),
      Exercise.find({ createdBy: therapist._id }).sort({ name: 1 }).lean(),
    ]);

    if (!exercises.length) {
      exercises = await Exercise.find().sort({ name: 1 }).lean();
    }

    const reviews = await Promise.all(
      patients.map(async (patient) => {
        const [progress, plans] = await Promise.all([
          Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(50).lean(),
          ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } })
            .select('exercises.exercise')
            .lean(),
        ]);
        const profile = buildRecommendationProfile(patient, progress);
        const plan = suggestedPlan(profile);
        const assignedIds = new Set(
          plans.flatMap((item) => (item.exercises || []).map((exercise) => String(exercise.exercise)))
        );
        const recommendations = exercises
          .map((exercise) => ({ exercise, score: scoreExercise(exercise, profile, plan) }))
          .sort((first, second) => second.score - first.score)
          .slice(0, 3)
          .map(({ exercise }) => ({
            exercise,
            reason: assignedIds.has(String(exercise._id))
              ? 'Already in the active plan; review pacing and adherence.'
              : recommendationReason(exercise, profile, plan),
            alreadyAssigned: assignedIds.has(String(exercise._id)),
            suggestedDifficulty: plan.difficulty,
            suggestedDuration: plan.duration,
            suggestedFrequency: plan.frequency,
          }));
        return { patient, inputProfile: profile, plan, recommendations };
      })
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load therapist recommendations' });
  }
};