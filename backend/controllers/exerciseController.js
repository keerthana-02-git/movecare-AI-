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
      Patient.find({
        $or: [
          { assignedTherapist: therapist._id },
          { _id: { $in: therapist.patientsAssigned || [] } },
          { assignedTherapist: { $exists: false } },
          { assignedTherapist: null },
        ],
      }).populate('user', 'name email').sort({ createdAt: -1 }).lean(),
      Exercise.find({ createdBy: therapist._id }).sort({ name: 1 }).lean(),
    ]);
    res.json({ patients, exercises });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load assignment options' });
  }
};

export const assignExercise = async (req, res) => {
  try {
    const { patientId, exerciseId, planName, startDate, endDate, frequency = 'Daily' } = req.body;
    if (!patientId || !exerciseId || !planName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Patient, exercise, plan name, start date and end date are required' });
    }

    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const [patient, exercise] = await Promise.all([
      Patient.findById(patientId),
      Exercise.findOne({ _id: exerciseId, createdBy: therapist._id }),
    ]);
    if (!patient || !exercise) return res.status(404).json({ message: 'Patient or exercise not found' });

    if (!patient.assignedTherapist || String(patient.assignedTherapist) !== String(therapist._id)) {
      patient.assignedTherapist = therapist._id;
      await patient.save();
    }
    if (!therapist.patientsAssigned.some((id) => String(id) === String(patient._id))) {
      therapist.patientsAssigned.push(patient._id);
      await therapist.save();
    }

    const plan = await ExercisePlan.create({
      patient: patient._id,
      therapist: therapist._id,
      name: planName,
      exercises: [{ exercise: exercise._id, frequency, order: 1 }],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'Active',
    });

    await createNotification({
      recipient: patient.user,
      type: 'NewExercisePlan',
      title: 'New exercise plan assigned',
      message: `${exercise.name} was added to your ${planName} plan.`,
      relatedEntity: { entityType: 'ExercisePlan', entityId: plan._id },
    });

    res.status(201).json(await plan.populate('exercises.exercise'));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to assign exercise' });
  }
};

export const getPatientExercises = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const plans = await ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } })
      .sort({ startDate: -1 })
      .populate('exercises.exercise')
      .lean();
    const progress = await Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(100).lean();
    res.json({ plans, progress });
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
    let plan;
    if (planId) {
      plan = await ExercisePlan.findOne({
        _id: planId,
        patient: patient._id,
        status: { $in: ['Active', 'Paused'] },
      });
    } else {
      plan = await ExercisePlan.findOne({
        patient: patient._id,
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