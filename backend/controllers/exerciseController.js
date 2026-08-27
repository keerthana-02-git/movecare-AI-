import {
  Exercise,
  ExercisePlan,
  Patient,
  Progress,
  Therapist,
  User,
} from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { ensurePatientProfile } from './patientController.js';
import { createNotification } from './notificationController.js';
import { logAuditEvent } from '../utils/auditLogger.js';

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

    await logAuditEvent({
      action: 'EXERCISE_CREATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Exercise', entityId: exercise._id },
      details: { exerciseId: exercise._id, name: exercise.name, targetBodyPart: exercise.targetBodyPart },
      req,
    });

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

    await logAuditEvent({
      action: 'EXERCISE_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Exercise', entityId: exercise._id },
      details: { exerciseId: exercise._id, name: exercise.name },
      req,
    });

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

    await logAuditEvent({
      action: 'EXERCISE_DELETED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Exercise', entityId: exercise._id },
      details: { exerciseId: exercise._id, name: exercise.name },
      req,
    });

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

    await logAuditEvent({
      action: 'EXERCISE_ASSIGNED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'ExercisePlan', entityId: plan._id },
      details: {
        patientId: patient._id,
        planName: plan.name,
        assignedExercisesCount: idsToAssign.length,
      },
      req,
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

export const ensureDefaultExerciseLibrary = async (clinicianId = null) => {
  const existingCount = await Exercise.countDocuments();
  if (existingCount >= 5) return;

  let assignedClinician = clinicianId;
  if (!assignedClinician) {
    const anyTherapist = await Therapist.findOne();
    if (anyTherapist) {
      assignedClinician = anyTherapist._id;
    }
  }

  const defaultExercises = [
    {
      name: 'Quadriceps Set',
      description: 'Isometric exercise to activate and strengthen quadriceps muscles with minimal joint pressure.',
      category: 'Strengthening',
      difficulty: 'Easy',
      duration: 6,
      sets: 3,
      reps: 12,
      instructions: '1. Lie or sit with legs straight. 2. Tighten the thigh muscles, pushing the back of your knee into the surface. 3. Hold for 5 seconds, relax, and repeat.',
      precautions: 'Do not hold your breath. Stop if sharp knee pain develops.',
      targetBodyPart: 'Knee',
      videoUrl: 'https://www.youtube.com/watch?v=y3uVjJzB90E',
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
      ...(assignedClinician ? { createdBy: assignedClinician } : {}),
    },
    {
      name: 'Hamstring Heel Slide',
      description: 'Gentle knee flexion and hamstring strengthening exercise for lower extremity rehabilitation.',
      category: 'Mobility',
      difficulty: 'Easy',
      duration: 8,
      sets: 3,
      reps: 10,
      instructions: '1. Lie on back. 2. Slowly slide heel towards your glutes, bending knee. 3. Hold for 2 seconds. 4. Slide back to start smoothly.',
      precautions: 'Avoid jerky movements; maintain smooth control.',
      targetBodyPart: 'Knee',
      videoUrl: 'https://www.youtube.com/watch?v=F3QfT08gR9Q',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
      ...(assignedClinician ? { createdBy: assignedClinician } : {}),
    },
    {
      name: 'Scapular Wall Slide',
      description: 'Strengthens lower trapezius and serratus anterior while promoting optimal shoulder kinematics.',
      category: 'Strengthening',
      difficulty: 'Medium',
      duration: 10,
      sets: 3,
      reps: 10,
      instructions: '1. Stand with back and forearms against a wall. 2. Slowly slide forearms upwards maintaining wall contact. 3. Lower under control.',
      precautions: 'Do not arch your lower back away from the wall.',
      targetBodyPart: 'Shoulder',
      videoUrl: 'https://www.youtube.com/watch?v=4y_v1tE4i4w',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      ...(assignedClinician ? { createdBy: assignedClinician } : {}),
    },
    {
      name: 'Cervical Chin Tuck & Retraction',
      description: 'Relieves anterior head carriage, reduces cervical spine load, and strengthens deep neck flexors.',
      category: 'Postural',
      difficulty: 'Easy',
      duration: 5,
      sets: 3,
      reps: 10,
      instructions: '1. Sit upright. 2. Gently glide chin straight backward as if making a double chin. 3. Hold for 5 seconds. 4. Release smoothly.',
      precautions: 'Do not tilt chin downwards; move head purely horizontally.',
      targetBodyPart: 'Neck',
      videoUrl: 'https://www.youtube.com/watch?v=W5_gJ3o_Y2I',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
      ...(assignedClinician ? { createdBy: assignedClinician } : {}),
    },
    {
      name: 'Pelvic Bridging & Core Stabilization',
      description: 'Activates gluteals, deep abdominal stabilizing musculature, and unloads the lumbar spine.',
      category: 'Stability',
      difficulty: 'Easy',
      duration: 8,
      sets: 3,
      reps: 12,
      instructions: '1. Lie on back with knees bent and feet flat. 2. Squeeze glutes and lift hips toward ceiling until thighs and torso align. 3. Hold 3s, lower slowly.',
      precautions: 'Do not hyper-extend lower back past neutral.',
      targetBodyPart: 'Back',
      videoUrl: 'https://www.youtube.com/watch?v=wPM8icPu6H8',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      ...(assignedClinician ? { createdBy: assignedClinician } : {}),
    },
  ];

  for (const ex of defaultExercises) {
    const existing = await Exercise.findOne({ name: ex.name });
    if (!existing) {
      await Exercise.create(ex);
    }
  }
};

export const adoptStarterPlan = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    // Check if patient already has an active plan
    const existingPlan = await ExercisePlan.findOne({
      patient: { $in: [patient._id, req.user._id] },
      status: 'Active',
    }).populate('exercises.exercise');

    if (existingPlan && (existingPlan.exercises || []).some((item) => item && item.exercise)) {
      return res.json({
        message: 'Your active rehabilitation routine is ready.',
        plan: existingPlan,
      });
    }

    // Ensure clinician exists
    let therapist = null;
    if (patient.assignedTherapist) {
      therapist = await Therapist.findById(patient.assignedTherapist);
    }
    if (!therapist) {
      therapist = await Therapist.findOne({ status: 'Available' });
    }
    if (!therapist) {
      therapist = await Therapist.findOne();
    }
    if (!therapist) {
      // Find or create clinician user
      let clinicianUser = await User.findOne({ role: 'Therapist' });
      if (!clinicianUser) {
        clinicianUser = await User.create({
          name: 'MoveCare Clinical Team',
          email: 'clinical.care@movecare.io',
          password: 'MoveCareSecure2026!',
          role: 'Therapist',
        });
      }
      therapist = await Therapist.create({
        user: clinicianUser._id,
        licenseNumber: 'PT-CLINICAL-001',
        specialization: 'Physical Therapy',
        yearsOfExperience: 10,
        status: 'Available',
      });
    }

    // Ensure exercises in library
    await ensureDefaultExerciseLibrary(therapist._id);

    // Identify patient focus area from condition/injury
    const condition = `${patient.medicalCondition || ''} ${patient.injuryDescription || ''}`.toLowerCase();
    let bodyPartTarget = null;
    if (condition.includes('knee') || condition.includes('patell') || condition.includes('acl') || condition.includes('menisc')) {
      bodyPartTarget = 'Knee';
    } else if (condition.includes('shoulder') || condition.includes('rotator') || condition.includes('scapul')) {
      bodyPartTarget = 'Shoulder';
    } else if (condition.includes('neck') || condition.includes('cervical') || condition.includes('spine')) {
      bodyPartTarget = 'Neck';
    } else if (condition.includes('back') || condition.includes('lumbar') || condition.includes('disc') || condition.includes('sciat')) {
      bodyPartTarget = 'Back';
    }

    let selectedExercises = [];
    if (bodyPartTarget) {
      selectedExercises = await Exercise.find({ targetBodyPart: bodyPartTarget }).limit(3);
    }
    if (selectedExercises.length === 0) {
      selectedExercises = await Exercise.find().limit(3);
    }

    if (selectedExercises.length === 0) {
      return res.status(500).json({ message: 'No clinical exercises available to assign' });
    }

    // Link patient to therapist
    patient.assignedTherapist = therapist._id;
    await patient.save();

    if (!therapist.patientsAssigned) therapist.patientsAssigned = [];
    if (!therapist.patientsAssigned.some((id) => String(id) === String(patient._id))) {
      therapist.patientsAssigned.push(patient._id);
      await therapist.save();
    }

    const planName = bodyPartTarget
      ? `${bodyPartTarget} Rehabilitation & Functional Recovery Routine`
      : 'Full-Body Foundation Mobility & Recovery Routine';

    const exerciseItems = selectedExercises.map((ex, index) => ({
      exercise: ex._id,
      frequency: 'Daily',
      order: index + 1,
      targetSets: ex.sets || 3,
      targetReps: ex.reps || 10,
    }));

    const plan = await ExercisePlan.create({
      patient: patient._id,
      therapist: therapist._id,
      name: planName,
      exercises: exerciseItems,
      startDate: new Date(),
      endDate: new Date(Date.now() + 28 * 86400000), // 28 days
      status: 'Active',
      description: `Tailored clinical starter routine generated for ${patient.medicalCondition || 'functional recovery'}.`,
    });

    await createNotification({
      recipient: patient.user,
      type: 'NewExercisePlan',
      title: 'Personalized recovery routine activated',
      message: `Your ${planName} is now active with ${selectedExercises.length} prescribed exercises.`,
      relatedEntity: { entityType: 'ExercisePlan', entityId: plan._id },
    });

    await logAuditEvent({
      action: 'EXERCISE_ASSIGNED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'ExercisePlan', entityId: plan._id },
      details: {
        patientId: patient._id,
        planName: plan.name,
        assignedExercisesCount: selectedExercises.length,
        type: 'StarterPlanActivation',
      },
      req,
    });

    const populatedPlan = await ExercisePlan.findById(plan._id).populate('exercises.exercise');
    res.status(201).json(populatedPlan);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to activate starter routine' });
  }
};