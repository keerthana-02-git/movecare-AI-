import {
  Exercise,
  ExercisePlan,
  Patient,
  Progress,
  Therapist,
} from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { ensurePatientProfile } from './patientController.js';
import { createNotification } from './notificationController.js';

const getTherapist = async (user) => {
  if (user?.role === 'Therapist') {
    return ensureTherapistProfile(user);
  }
  return Therapist.findOne({ user: user?._id || user });
};

const exerciseFields = [
  'name',
  'description',
  'category',
  'difficulty',
  'duration',
  'sets',
  'reps',
  'instructions',
  'videoUrl',
  'imageUrl',
  'targetBodyPart',
  'precautions',
];

const pickExerciseFields = (body) =>
  Object.fromEntries(
    exerciseFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]),
  );

export const listExercises = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const exercises = await Exercise.find({ createdBy: therapist._id }).sort({ updatedAt: -1 }).lean();
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load exercises' });
  }
};

export const getExerciseById = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load exercise' });
  }
};

export const createExercise = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const exercise = await Exercise.create({ ...pickExerciseFields(req.body), createdBy: therapist._id });
    res.status(201).json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to create exercise' });
  }
};

export const updateExercise = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    const exercise = await Exercise.findOneAndUpdate(
      { _id: req.params.id, createdBy: therapist?._id },
      pickExerciseFields(req.body),
      { new: true, runValidators: true },
    );
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    res.json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update exercise' });
  }
};

export const deleteExercise = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    const exercise = await Exercise.findOneAndDelete({ _id: req.params.id, createdBy: therapist?._id });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    await ExercisePlan.updateMany(
      { 'exercises.exercise': exercise._id },
      { $pull: { exercises: { exercise: exercise._id } } },
    );
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete exercise' });
  }
};

export const listAssignmentOptions = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const [patients, exercises] = await Promise.all([
      Patient.find({})
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      Exercise.find({})
        .sort({ name: 1 })
        .lean(),
    ]);
    res.json({ patients, exercises });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load assignment options' });
  }
};

export const assignExercise = async (req, res) => {
  try {
    const {
      patientId,
      exerciseId,
      exerciseIds,
      exercises: rawExercisesList,
      planName,
      startDate,
      endDate,
      frequency = 'Daily',
    } = req.body;

    const idsToAssign = [];
    if (Array.isArray(exerciseIds)) {
      idsToAssign.push(...exerciseIds);
    } else if (Array.isArray(exerciseId)) {
      idsToAssign.push(...exerciseId);
    } else if (Array.isArray(rawExercisesList)) {
      idsToAssign.push(
        ...rawExercisesList.map((item) =>
          typeof item === 'object' ? (item.exerciseId || item.exercise || item._id) : item
        )
      );
    } else if (exerciseId) {
      idsToAssign.push(exerciseId);
    }

    if (!patientId || idsToAssign.length === 0 || !planName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Patient, exercise(s), plan name, start date and end date are required' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    // Look up patient by Patient._id or User._id
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await Patient.findOne({ user: patientId });
    }
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Look up exercises from library
    const matchedExercises = await Exercise.find({ _id: { $in: idsToAssign } });
    if (matchedExercises.length === 0) {
      return res.status(404).json({ message: 'No valid exercises found to assign' });
    }

    // Associate patient with therapist if unassigned
    if (!patient.assignedTherapist || String(patient.assignedTherapist) !== String(therapist._id)) {
      patient.assignedTherapist = therapist._id;
      await patient.save();
    }
    if (!therapist.patientsAssigned) {
      therapist.patientsAssigned = [];
    }
    if (!therapist.patientsAssigned.some((id) => String(id) === String(patient._id))) {
      therapist.patientsAssigned.push(patient._id);
      await therapist.save();
    }

    // Check if an active plan with the same name already exists for this patient
    let plan = await ExercisePlan.findOne({
      patient: patient._id,
      name: planName.trim(),
      status: { $in: ['Active', 'Paused'] },
    });

    const exerciseItems = [];
    matchedExercises.forEach((ex, idx) => {
      exerciseItems.push({
        exercise: ex._id,
        frequency,
        order: idx + 1,
      });
    });

    if (plan) {
      matchedExercises.forEach((ex) => {
        const alreadyHasEx = plan.exercises.some((e) => String(e.exercise) === String(ex._id));
        if (!alreadyHasEx) {
          plan.exercises.push({
            exercise: ex._id,
            frequency,
            order: plan.exercises.length + 1,
          });
        }
      });
      if (new Date(endDate) > new Date(plan.endDate)) {
        plan.endDate = new Date(endDate);
      }
      await plan.save();
    } else {
      plan = await ExercisePlan.create({
        patient: patient._id,
        therapist: therapist._id,
        name: planName.trim(),
        exercises: exerciseItems,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'Active',
      });
    }

    const exerciseNames = matchedExercises.map((e) => e.name).join(', ');
    await createNotification({
      recipient: patient.user,
      type: 'NewExercisePlan',
      title: 'New exercise plan assigned',
      message: `${exerciseNames} assigned to your ${planName} plan.`,
      relatedEntity: { entityType: 'ExercisePlan', entityId: plan._id },
    });

    const populatedPlan = await ExercisePlan.findById(plan._id).populate('exercises.exercise');
    res.status(201).json(populatedPlan);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to assign exercise' });
  }
};

export const getPatientExercises = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const patientIds = [patient._id, req.user._id];

    const rawPlans = await ExercisePlan.find({
      patient: { $in: patientIds },
      status: { $in: ['Active', 'Paused'] },
    })
      .sort({ startDate: -1 })
      .populate('exercises.exercise')
      .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
      .lean();

    // Sanitize plans to filter out any deleted exercise references
    const plans = rawPlans.map((plan) => ({
      ...plan,
      exercises: (plan.exercises || []).filter((item) => item && item.exercise),
    }));

    const progress = await Progress.find({ patient: { $in: patientIds } })
      .sort({ datePerformed: -1 })
      .limit(100)
      .lean();

    // Compute Today's Stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);

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

    const isScheduledToday = (item, planStartDate) => {
      const frequency = item.frequency || 'Daily';
      if (frequency === 'Daily') return true;
      const days = daysElapsedSince(planStartDate);
      if (frequency === 'Every2Days' || frequency === 'EveryOtherDay') return days % 2 === 0;
      if (frequency === 'Weekly') return days % 7 === 0;
      if (frequency === 'Twice') return days % 3 === 0;
      return true;
    };

    let totalAssigned = 0;
    let todayAssigned = 0;
    let todayCompleted = 0;

    plans.forEach((plan) => {
      (plan.exercises || []).forEach((item) => {
        if (item && item.exercise) {
          totalAssigned++;
          if (isScheduledToday(item, plan.startDate)) {
            todayAssigned++;
            const exIdStr = String(item.exercise._id || item.exercise);
            if (todayCompletedExerciseIds.has(exIdStr)) {
              todayCompleted++;
            }
          }
        }
      });
    });

    const todayRemaining = Math.max(0, todayAssigned - todayCompleted);
    const completionRate = todayAssigned > 0 ? Math.round((todayCompleted / todayAssigned) * 100) : 0;

    res.json({
      plans,
      progress,
      stats: {
        totalAssigned,
        todayTotal: todayAssigned,
        todayCompleted,
        todayRemaining,
        completionRate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load assigned exercises' });
  }
};

export const completePatientExercise = async (req, res) => {
  try {
    const { planId, painLevel, mobilityScore, notes } = req.body;
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    // Validate pain level if provided
    let parsedPain;
    if (painLevel !== undefined && painLevel !== '' && painLevel !== null) {
      parsedPain = Number(painLevel);
      if (isNaN(parsedPain) || parsedPain < 0 || parsedPain > 10) {
        return res.status(400).json({ message: 'Pain level must be a valid number between 0 and 10' });
      }
    }

    // Validate mobility score if provided
    let parsedMobility;
    if (mobilityScore !== undefined && mobilityScore !== '' && mobilityScore !== null) {
      parsedMobility = Number(mobilityScore);
      if (isNaN(parsedMobility) || parsedMobility < 0 || parsedMobility > 100) {
        return res.status(400).json({ message: 'Mobility score must be a valid number between 0 and 100' });
      }
    }

    // Sanitize optional notes
    const sanitizedNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : undefined;

    // Look up plan explicitly or by exercise membership
    const patientIds = [patient._id, req.user._id];
    let plan;
    if (planId) {
      plan = await ExercisePlan.findOne({
        _id: planId,
        patient: { $in: patientIds },
        status: { $in: ['Active', 'Paused'] },
      });
    } else {
      plan = await ExercisePlan.findOne({
        patient: { $in: patientIds },
        status: { $in: ['Active', 'Paused'] },
        'exercises.exercise': req.params.exerciseId,
      });
    }

    if (
      !plan ||
      !plan.exercises.some(
        (item) => String(item.exercise?._id || item.exercise) === String(req.params.exerciseId)
      )
    ) {
      return res.status(404).json({ message: 'Assigned exercise not found for this patient' });
    }

    const progress = await Progress.create({
      patient: patient._id,
      exercise: req.params.exerciseId,
      exercisePlan: plan._id,
      completionStatus: 'Completed',
      painLevel: parsedPain,
      mobilityScore: parsedMobility,
      notes: sanitizedNotes,
      datePerformed: new Date(),
    });

    const populatedProgress = await Progress.findById(progress._id).populate(
      'exercise',
      'name description category difficulty duration sets reps instructions precautions videoUrl imageUrl targetBodyPart'
    );

    const populatedPlan = await ExercisePlan.findById(plan._id).populate({
      path: 'therapist',
      select: 'user',
    });
    if (populatedPlan?.therapist?.user) {
      await createNotification({
        recipient: populatedPlan.therapist.user,
        type: 'ProgressUpdate',
        title: 'Exercise completed',
        message: `${req.user.name || 'A patient'} completed an assigned exercise and recorded progress.`,
        relatedEntity: { entityType: 'ExercisePlan', entityId: plan._id },
      });
    }

    res.status(201).json(populatedProgress || progress);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to mark exercise complete' });
  }
};