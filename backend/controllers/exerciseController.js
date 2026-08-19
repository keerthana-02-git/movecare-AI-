import {
  Exercise,
  ExercisePlan,
  Patient,
  Progress,
  Therapist,
} from '../models/index.js';

const getTherapist = (userId) => Therapist.findOne({ user: userId });

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
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const exercises = await Exercise.find({ createdBy: therapist._id }).sort({ updatedAt: -1 }).lean();
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load exercises' });
  }
};

export const createExercise = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const exercise = await Exercise.create({ ...pickExerciseFields(req.body), createdBy: therapist._id });
    res.status(201).json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to create exercise' });
  }
};

export const updateExercise = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
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
    const therapist = await getTherapist(req.user._id);
    const exercise = await Exercise.findOneAndDelete({ _id: req.params.id, createdBy: therapist?._id });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    await ExercisePlan.updateMany(
      { 'exercises.exercise': exercise._id },
      { $pull: { exercises: { exercise: exercise._id } } },
    );
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to delete exercise' });
  }
};

export const listAssignmentOptions = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const [patients, exercises] = await Promise.all([
      Patient.find({ assignedTherapist: therapist._id }).populate('user', 'name email').sort({ createdAt: -1 }).lean(),
      Exercise.find({ createdBy: therapist._id }).sort({ name: 1 }).lean(),
    ]);
    res.json({ patients, exercises });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load assignment options' });
  }
};

export const assignExercise = async (req, res) => {
  try {
    const { patientId, exerciseId, planName, startDate, endDate, frequency = 'Daily' } = req.body;
    if (!patientId || !exerciseId || !planName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Patient, exercise, plan name, start date and end date are required' });
    }

    const therapist = await getTherapist(req.user._id);
    const [patient, exercise] = await Promise.all([
      Patient.findOne({ _id: patientId, assignedTherapist: therapist?._id }),
      Exercise.findOne({ _id: exerciseId, createdBy: therapist?._id }),
    ]);
    if (!patient || !exercise) return res.status(404).json({ message: 'Patient or exercise not found' });

    const plan = await ExercisePlan.create({
      patient: patient._id,
      therapist: therapist._id,
      name: planName,
      exercises: [{ exercise: exercise._id, frequency, order: 1 }],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'Active',
    });

    res.status(201).json(await plan.populate('exercises.exercise'));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to assign exercise' });
  }
};

export const getPatientExercises = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const plans = await ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } })
      .sort({ startDate: -1 })
      .populate('exercises.exercise')
      .lean();
    const progress = await Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(100).lean();
    res.json({ plans, progress });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load assigned exercises' });
  }
};

export const completePatientExercise = async (req, res) => {
  try {
    const { planId, painLevel, notes } = req.body;
    const patient = await Patient.findOne({ user: req.user._id });
    const plan = await ExercisePlan.findOne({ _id: planId, patient: patient?._id, status: { $in: ['Active', 'Paused'] } });
    if (!plan || !plan.exercises.some((item) => String(item.exercise) === req.params.exerciseId)) {
      return res.status(404).json({ message: 'Assigned exercise not found' });
    }

    const progress = await Progress.create({
      patient: patient._id,
      exercise: req.params.exerciseId,
      exercisePlan: plan._id,
      completionStatus: 'Completed',
      painLevel: painLevel === '' || painLevel === undefined ? undefined : Number(painLevel),
      notes,
    });
    res.status(201).json(progress);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to mark exercise complete' });
  }
};