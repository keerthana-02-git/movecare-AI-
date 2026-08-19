import { ExercisePlan, MonitoringSession, Patient, Progress, Therapist } from '../models/index.js';
import { createNotification } from './notificationController.js';

const getPatient = (userId) => Patient.findOne({ user: userId });
const getTherapist = (userId) => Therapist.findOne({ user: userId });

const populateSession = (query) => query
  .populate('exercise', 'name duration reps targetBodyPart')
  .populate('exercisePlan', 'name')
  .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } });

export const startSession = async (req, res) => {
  try {
    const { exerciseId, planId } = req.body;
    const patient = await getPatient(req.user._id);
    const plan = await ExercisePlan.findOne({ _id: planId, patient: patient?._id, status: { $in: ['Active', 'Paused'] } }).populate('exercises.exercise');
    const assignment = plan?.exercises.find((item) => String(item.exercise?._id || item.exercise) === String(exerciseId));
    if (!patient || !plan || !assignment) return res.status(404).json({ message: 'Assigned exercise not found' });

    await MonitoringSession.updateMany(
      { patient: patient._id, status: { $in: ['Active', 'Paused'] } },
      { status: 'Cancelled' },
    );
    const session = await MonitoringSession.create({
      patient: patient._id,
      exercise: exerciseId,
      exercisePlan: plan._id,
      targetReps: assignment.exercise.reps || 10,
      simulated: true,
      lastUpdateSource: 'Patient',
    });
    res.status(201).json(await populateSession(MonitoringSession.findById(session._id)));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to start monitoring session' });
  }
};

export const getPatientSession = async (req, res) => {
  try {
    const patient = await getPatient(req.user._id);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const session = await populateSession(MonitoringSession.findOne({ patient: patient._id, status: { $in: ['Active', 'Paused', 'Completed'] } }).sort({ updatedAt: -1 }));
    res.json(session || null);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load monitoring session' });
  }
};

export const updatePatientSession = async (req, res) => {
  try {
    const patient = await getPatient(req.user._id);
    const { status, elapsedSeconds, currentReps, painLevel, mobilityScore } = req.body;
    const update = {
      ...(status ? { status } : {}),
      ...(elapsedSeconds !== undefined ? { elapsedSeconds: Number(elapsedSeconds) } : {}),
      ...(currentReps !== undefined ? { currentReps: Number(currentReps) } : {}),
      ...(painLevel !== undefined && painLevel !== '' ? { painLevel: Number(painLevel) } : {}),
      ...(mobilityScore !== undefined && mobilityScore !== '' ? { mobilityScore: Number(mobilityScore) } : {}),
      lastUpdateSource: 'Demo sensor',
      ...(status === 'Completed' ? { completedAt: new Date() } : {}),
    };
    const session = await MonitoringSession.findOneAndUpdate(
      { _id: req.params.id, patient: patient?._id, status: { $in: ['Active', 'Paused'] } },
      update,
      { new: true, runValidators: true },
    );
    if (!session) return res.status(404).json({ message: 'Active monitoring session not found' });

    if (status === 'Completed') {
      await Progress.create({
        patient: session.patient,
        exercise: session.exercise,
        exercisePlan: session.exercisePlan,
        completionStatus: 'Completed',
        repsCompleted: session.currentReps,
        painLevel: session.painLevel,
        mobilityScore: session.mobilityScore,
        notes: 'Completed through simulated monitoring session',
      });
      const plan = await ExercisePlan.findById(session.exercisePlan).populate({ path: 'therapist', select: 'user' });
      if (plan?.therapist?.user) {
        await createNotification({
          recipient: plan.therapist.user,
          type: 'ProgressUpdate',
          title: 'Monitored session completed',
          message: 'A patient completed a simulated exercise session with live pain and mobility readings.',
          relatedEntity: { entityType: 'ExercisePlan', entityId: plan._id },
        });
      }
    }
    res.json(await populateSession(MonitoringSession.findById(session._id)));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update monitoring session' });
  }
};

export const getTherapistSessions = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const sessions = await populateSession(MonitoringSession.find({ status: { $in: ['Active', 'Paused'] } }).sort({ updatedAt: -1 }));
    const assignedIds = new Set(therapist.patientsAssigned.map((id) => String(id)));
    res.json(sessions.filter((session) => assignedIds.has(String(session.patient?._id))));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load live monitoring sessions' });
  }
};