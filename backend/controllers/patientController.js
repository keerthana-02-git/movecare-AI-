import {
  Appointment,
  ExercisePlan,
  Notification,
  PainJournal,
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
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const patientIds = [patient._id, req.user._id];

    const [plans, appointments, progress, notifications, journalEntries] = await Promise.all([
      ExercisePlan.find({ patient: { $in: patientIds }, status: { $in: ['Active', 'Paused'] } })
        .sort({ startDate: -1 })
        .populate({
          path: 'therapist',
          populate: { path: 'user', select: 'name email' },
        })
        .populate('exercises.exercise')
        .lean(),
      Appointment.find({
        patient: { $in: patientIds },
        appointmentDate: { $gte: startOfToday },
        status: { $nin: ['Cancelled', 'NoShow'] },
      })
        .sort({ appointmentDate: 1, startTime: 1 })
        .limit(1)
        .populate({
          path: 'therapist',
          populate: { path: 'user', select: 'name email' },
        })
        .lean(),
      Progress.find({ patient: { $in: patientIds } })
        .sort({ datePerformed: -1 })
        .limit(100)
        .populate('exercise', 'name category targetBodyPart difficulty duration sets reps')
        .lean(),
      Notification.find({ recipient: req.user._id })
        .sort({ isRead: 1, createdAt: -1 })
        .limit(10)
        .lean(),
      PainJournal.find({ patient: { $in: patientIds } })
        .sort({ dateString: -1, createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const toISODate = (d) => {
      const dateObj = new Date(d);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = toISODate(now);
    const todayJournalEntry = journalEntries.find((j) => j.dateString === todayStr) || null;
    const latestJournalEntry = journalEntries[0] || null;

    // 1. Flatten all assigned exercises from active plans
    const allAssignedExercises = [];
    plans.forEach((plan) => {
      (plan.exercises || []).forEach((item, index) => {
        if (item && item.exercise) {
          allAssignedExercises.push({
            planId: plan._id,
            planName: plan.name,
            planStartDate: plan.startDate,
            planEndDate: plan.endDate,
            frequency: item.frequency || 'Daily',
            order: item.order ?? index + 1,
            exercise: item.exercise,
          });
        }
      });
    });

    const totalAssignedExercises = allAssignedExercises.length;
    const completedProgressEntries = progress.filter((entry) => entry.completionStatus === 'Completed');
    const completedExerciseIds = new Set(
      completedProgressEntries.map((p) => String(p.exercise?._id || p.exercise))
    );

    const completedExercisesCount = allAssignedExercises.filter((item) =>
      completedExerciseIds.has(String(item.exercise?._id || item.exercise))
    ).length;

    const remainingExercisesCount = Math.max(0, totalAssignedExercises - completedExercisesCount);

    const overallCompletionRate = totalAssignedExercises > 0
      ? Math.round((completedExercisesCount / totalAssignedExercises) * 100)
      : (progress.length > 0
        ? Math.round((completedProgressEntries.length / progress.length) * 100)
        : 0);

    // 2. Streak calculation based on actual progress dates
    const calculateStreak = (progressList) => {
      const completedTimestamps = Array.from(
        new Set(
          progressList
            .filter((entry) => entry.completionStatus === 'Completed' && entry.datePerformed)
            .map((entry) => {
              const d = new Date(entry.datePerformed);
              return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            })
        )
      ).sort((a, b) => a - b); // ascending

      if (completedTimestamps.length === 0) return { currentStreak: 0, bestStreak: 0 };

      // Calculate Best Streak
      let bestStreak = 1;
      let running = 1;
      for (let i = 1; i < completedTimestamps.length; i++) {
        const diff = Math.round((completedTimestamps[i] - completedTimestamps[i - 1]) / 86400000);
        if (diff === 1) {
          running += 1;
          if (running > bestStreak) bestStreak = running;
        } else if (diff > 1) {
          running = 1;
        }
      }

      // Calculate Current Streak
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayMid = todayMid - 86400000;
      const descTimestamps = [...completedTimestamps].sort((a, b) => b - a);

      let currentDay = descTimestamps[0] === todayMid ? todayMid : (descTimestamps[0] === yesterdayMid ? yesterdayMid : null);
      let currentStreak = 0;
      if (currentDay !== null) {
        for (const dateTimestamp of descTimestamps) {
          if (dateTimestamp === currentDay) {
            currentStreak += 1;
            currentDay -= 86400000;
          } else if (dateTimestamp < currentDay) {
            break;
          }
        }
      }

      return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
    };

    const { currentStreak, bestStreak } = calculateStreak(progress);

    // 3. Today's Recovery calculations
    const todayCompletedProgress = progress.filter(
      (p) =>
        p.completionStatus === 'Completed' &&
        p.datePerformed &&
        new Date(p.datePerformed) >= startOfToday &&
        new Date(p.datePerformed) <= endOfToday
    );

    const todayCompletedExerciseIds = new Set(
      todayCompletedProgress.map((p) => String(p.exercise?._id || p.exercise))
    );

    const daysElapsedSince = (startDate) => {
      const start = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), new Date(startDate).getDate());
      return Math.max(0, Math.floor((startOfToday.getTime() - start.getTime()) / 86400000));
    };

    const isScheduledToday = (item) => {
      const frequency = item.frequency || 'Daily';
      if (frequency === 'Daily') return true;
      const days = daysElapsedSince(item.planStartDate);
      if (frequency === 'Every2Days' || frequency === 'EveryOtherDay') return days % 2 === 0;
      if (frequency === 'Weekly') return days % 7 === 0;
      if (frequency === 'Twice') return days % 3 === 0;
      return true;
    };

    const todaysFiltered = allAssignedExercises.filter(isScheduledToday);
    const activeDailyList = todaysFiltered.length > 0 ? todaysFiltered : allAssignedExercises;

    const todaysExercisesList = activeDailyList.map((item) => {
      const exerciseIdStr = String(item.exercise?._id || item.exercise);
      const isCompletedToday = todayCompletedExerciseIds.has(exerciseIdStr);
      const todayEntry = todayCompletedProgress.find(
        (p) => String(p.exercise?._id || p.exercise) === exerciseIdStr
      );
      return {
        planId: item.planId,
        planName: item.planName,
        frequency: item.frequency,
        order: item.order,
        exercise: item.exercise,
        isCompletedToday,
        completedAt: todayEntry?.datePerformed || null,
        repsCompleted: todayEntry?.repsCompleted || null,
        setsCompleted: todayEntry?.setsCompleted || null,
        painLevel: todayEntry?.painLevel ?? null,
      };
    });

    const todayTotal = todaysExercisesList.length;
    const todayCompleted = todaysExercisesList.filter((e) => e.isCompletedToday).length;
    const todayRemaining = Math.max(0, todayTotal - todayCompleted);
    const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // 4. Recovery Goal & Target Body Part
    const activePlan = plans[0] || null;
    const targetBodyParts = Array.from(
      new Set(allAssignedExercises.map((item) => item.exercise?.targetBodyPart).filter(Boolean))
    );

    const hasGoal = Boolean(
      activePlan?.goals ||
      (patient.medicalCondition && patient.medicalCondition !== 'Profile setup required')
    );

    const recoveryGoal = hasGoal
      ? {
          goal: activePlan?.goals || (patient.medicalCondition !== 'Profile setup required' ? `Recovery for ${patient.medicalCondition}` : null),
          condition: patient.medicalCondition && patient.medicalCondition !== 'Profile setup required' ? patient.medicalCondition : null,
          targetBodyPart: targetBodyParts.join(', ') || null,
          targetBodyParts,
          injuryDescription: patient.injuryDescription || null,
          planName: activePlan?.name || null,
          planStartDate: activePlan?.startDate || null,
          planEndDate: activePlan?.endDate || null,
          notes: activePlan?.notes || null,
        }
      : null;

    // 5. Next Appointment
    const upcomingAppointmentDoc = appointments[0] || null;
    const therapistUser = upcomingAppointmentDoc?.therapist?.user || patient.assignedTherapist?.user;
    const nextAppointment = upcomingAppointmentDoc
      ? {
          id: upcomingAppointmentDoc._id,
          _id: upcomingAppointmentDoc._id,
          therapist: upcomingAppointmentDoc.therapist,
          therapistName: therapistUser?.name || 'Assigned Therapist',
          therapistSpecialization: upcomingAppointmentDoc.therapist?.specialization || patient.assignedTherapist?.specialization || 'Physical Therapy',
          appointmentDate: upcomingAppointmentDoc.appointmentDate,
          startTime: upcomingAppointmentDoc.startTime,
          endTime: upcomingAppointmentDoc.endTime,
          status: upcomingAppointmentDoc.status,
          type: upcomingAppointmentDoc.type || 'Treatment Session',
          consultationMode: upcomingAppointmentDoc.consultationMode || 'Virtual',
          location: upcomingAppointmentDoc.location || null,
          notes: upcomingAppointmentDoc.notes || null,
        }
      : null;

    // 6. Progress Stats
    const trackedPainEntries = progress.filter((e) => e.painLevel !== undefined && e.painLevel !== null);
    const trackedMobilityEntries = progress.filter((e) => e.mobilityScore !== undefined && e.mobilityScore !== null);
    const averagePain = trackedPainEntries.length
      ? Math.round((trackedPainEntries.reduce((tot, e) => tot + Number(e.painLevel), 0) / trackedPainEntries.length) * 10) / 10
      : null;
    const averageMobility = trackedMobilityEntries.length
      ? Math.round(trackedMobilityEntries.reduce((tot, e) => tot + Number(e.mobilityScore), 0) / trackedMobilityEntries.length)
      : null;
    const mobilityStatus = averagePain === null
      ? 'Awaiting check-in'
      : averagePain <= 3
      ? 'Stable'
      : 'Needs attention';

    const profile = {
      id: patient._id,
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phoneNumber: patient.phoneNumber || null,
      address: patient.address || null,
      emergencyContact: patient.emergencyContact || null,
      medicalCondition: patient.medicalCondition,
      injuryDescription: patient.injuryDescription || null,
      status: patient.status || 'Active',
      assignedTherapist: patient.assignedTherapist
        ? {
            id: patient.assignedTherapist._id,
            name: patient.assignedTherapist.user?.name || 'Assigned Therapist',
            email: patient.assignedTherapist.user?.email || null,
            specialization: patient.assignedTherapist.specialization || 'Physical Therapy',
            yearsOfExperience: patient.assignedTherapist.yearsOfExperience || null,
          }
        : null,
      profileCompleted: Boolean(
        patient.medicalCondition &&
        patient.medicalCondition !== 'Profile setup required' &&
        patient.phoneNumber
      ),
    };

    const recovery = {
      completionPercentage: overallCompletionRate,
      completionRate: overallCompletionRate,
      totalAssignedExercises,
      completedExercises: completedExercisesCount,
      remainingExercises: remainingExercisesCount,
      currentStreak,
      bestStreak,
      activePlansCount: plans.length,
      totalSessionsLogged: progress.length,
      completedSessions: completedProgressEntries.length,
    };

    const exercises = {
      today: todaysExercisesList,
      todayTotal,
      todayCompleted,
      todayRemaining,
      todayCompletionRate,
      allAssigned: allAssignedExercises,
      totalAssigned: totalAssignedExercises,
      completedCount: completedExercisesCount,
      remainingCount: remainingExercisesCount,
    };

    const progressSummary = {
      overallProgressPercentage: overallCompletionRate,
      completionRate: overallCompletionRate,
      completedSessions: completedProgressEntries.length,
      totalSessions: progress.length,
      currentStreak,
      bestStreak,
      averagePain,
      averageMobility,
      mobilityStatus,
      recentEntries: progress.slice(0, 5),
    };

    res.json({
      // Structured Phase 1 payload
      profile,
      recovery,
      recoveryGoal,
      exercises,
      appointment: nextAppointment,
      progressSummary,
      painJournal: {
        todayEntry: todayJournalEntry,
        hasTodayEntry: Boolean(todayJournalEntry),
        latestEntry: latestJournalEntry,
        totalEntries: journalEntries.length,
      },
      // Backward compatibility fields
      patient,
      plans,
      upcomingAppointment: upcomingAppointmentDoc,
      progress,
      notifications,
      stats: {
        completionRate: overallCompletionRate,
        completedSessions: completedProgressEntries.length,
        totalSessions: progress.length,
        totalAssignedExercises,
        completedExercises: completedExercisesCount,
        remainingExercises: remainingExercisesCount,
        averagePain,
        averageMobility,
        mobilityStatus,
        currentStreak,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load patient dashboard' });
  }
};