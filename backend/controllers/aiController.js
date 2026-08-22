import { Exercise, ExercisePlan, Patient, Progress, Therapist } from '../models/index.js';

const difficultyOrder = ['Easy', 'Medium', 'Hard'];

const calculateAge = (dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed = today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
};

const clampDifficulty = (level) => difficultyOrder[Math.max(0, Math.min(difficultyOrder.length - 1, level))];

const buildRecommendationProfile = (patient, progress) => {
  const latest = progress[0];
  const conditionText = `${patient.medicalCondition || ''} ${patient.injuryDescription || ''}`.toLowerCase();
  const averagePainEntries = progress.filter((entry) => entry.painLevel !== undefined && entry.painLevel !== null).slice(0, 5);
  const averagePain = averagePainEntries.length
    ? Math.round((averagePainEntries.reduce((total, entry) => total + entry.painLevel, 0) / averagePainEntries.length) * 10) / 10
    : null;

  return {
    condition: patient.medicalCondition,
    age: calculateAge(patient.dateOfBirth),
    painLevel: latest?.painLevel ?? averagePain,
    mobilityLevel: latest?.mobilityScore ?? null,
    previousSessions: progress.length,
    completedSessions: progress.filter((entry) => entry.completionStatus === 'Completed').length,
    conditionText,
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
  const text = `${exercise.name} ${exercise.description} ${exercise.targetBodyPart} ${exercise.category}`.toLowerCase();
  let score = 0;
  const conditionTerms = profile.conditionText.split(/[^a-z0-9]+/).filter((term) => term.length > 3);
  conditionTerms.forEach((term) => { if (text.includes(term)) score += 4; });
  if (profile.painLevel >= 7 && ['Stretching', 'Flexibility', 'Balance'].includes(exercise.category)) score += 4;
  if (profile.mobilityLevel !== null && profile.mobilityLevel < 50 && ['Balance', 'Flexibility', 'Stretching'].includes(exercise.category)) score += 3;
  if (exercise.difficulty === plan.difficulty) score += 3;
  if (difficultyOrder.indexOf(exercise.difficulty) <= difficultyOrder.indexOf(plan.difficulty)) score += 1;
  if (profile.age >= 65 && exercise.difficulty === 'Easy') score += 2;
  return score;
};

const recommendationReason = (exercise, profile, plan) => {
  if (profile.painLevel >= 7) return 'Prioritizes a lower-load movement while reported pain is high.';
  if (profile.mobilityLevel !== null && profile.mobilityLevel < 50) return 'Supports mobility development with a controlled progression.';
  if (exercise.difficulty === plan.difficulty) return `Matches the suggested ${plan.difficulty.toLowerCase()} starting level.`;
  return 'Fits the condition and recent exercise history.';
};

export const getRecommendations = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id }).lean();
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const [progress, plans, exercises] = await Promise.all([
      Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(50).lean(),
      ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } }).select('exercises.exercise').lean(),
      Exercise.find(patient.assignedTherapist ? { createdBy: patient.assignedTherapist } : {}).sort({ name: 1 }).lean(),
    ]);
    const profile = buildRecommendationProfile(patient, progress);
    const plan = suggestedPlan(profile);
    const assignedIds = new Set(plans.flatMap((item) => item.exercises.map((exercise) => String(exercise.exercise))));
    const recommendations = exercises
      .map((exercise) => ({ exercise, score: scoreExercise(exercise, profile, plan) }))
      .sort((first, second) => second.score - first.score)
      .slice(0, 5)
      .map(({ exercise }) => ({
        exercise,
        suggestedDifficulty: plan.difficulty,
        suggestedDuration: plan.duration,
        suggestedFrequency: plan.frequency,
        reason: assignedIds.has(String(exercise._id)) ? 'Already assigned in your active plan; review the suggested pacing with your therapist.' : recommendationReason(exercise, profile, plan),
        alreadyAssigned: assignedIds.has(String(exercise._id)),
      }));

    res.json({
      generatedAt: new Date(),
      inputProfile: {
        condition: profile.condition,
        age: profile.age,
        painLevel: profile.painLevel,
        mobilityLevel: profile.mobilityLevel,
        previousExerciseSessions: profile.previousSessions,
      },
      plan,
      recommendations,
      disclaimer: 'This software feature provides educational exercise suggestions, not a medical diagnosis or treatment plan. Review changes with a licensed healthcare professional.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to generate recommendations' });
  }
};

export const getTherapistRecommendations = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id }).lean();
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const [patients, exercises] = await Promise.all([
      Patient.find({ assignedTherapist: therapist._id }).populate('user', 'name email').lean(),
      Exercise.find({ createdBy: therapist._id }).sort({ name: 1 }).lean(),
    ]);
    const reviews = await Promise.all(patients.map(async (patient) => {
      const [progress, plans] = await Promise.all([
        Progress.find({ patient: patient._id }).sort({ datePerformed: -1 }).limit(50).lean(),
        ExercisePlan.find({ patient: patient._id, status: { $in: ['Active', 'Paused'] } }).select('exercises.exercise').lean(),
      ]);
      const profile = buildRecommendationProfile(patient, progress);
      const plan = suggestedPlan(profile);
      const assignedIds = new Set(plans.flatMap((item) => item.exercises.map((exercise) => String(exercise.exercise))));
      const recommendations = exercises
        .map((exercise) => ({ exercise, score: scoreExercise(exercise, profile, plan) }))
        .sort((first, second) => second.score - first.score)
        .slice(0, 3)
        .map(({ exercise }) => ({
          exercise,
          reason: assignedIds.has(String(exercise._id)) ? 'Already in the active plan; review pacing and adherence.' : recommendationReason(exercise, profile, plan),
          alreadyAssigned: assignedIds.has(String(exercise._id)),
          suggestedDifficulty: plan.difficulty,
          suggestedDuration: plan.duration,
          suggestedFrequency: plan.frequency,
        }));
      return { patient, inputProfile: profile, plan, recommendations };
    }));

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load therapist recommendations' });
  }
};

export const answerAssistant = async (req, res) => {
  const message = String(req.body.message || '').trim().toLowerCase();
  if (!message) return res.status(400).json({ message: 'A message is required' });
  let answer = 'I can explain your exercise suggestions, progress metrics, or appointment details. What would you like to review?';
  if (message.includes('pain') || message.includes('hurt')) answer = 'Please record your pain level after a session and tell your therapist if pain is severe, new, or worsening. I cannot assess injuries or provide a diagnosis.';
  else if (message.includes('exercise') || message.includes('recommend')) answer = 'Open Personalized recommendations on your dashboard to review suggestions based on your recorded condition, pain, mobility, and exercise history.';
  else if (message.includes('appointment') || message.includes('therapist')) answer = 'Use Appointments to browse available therapists, book a virtual visit, and open the consultation room for an accepted appointment.';
  else if (message.includes('progress') || message.includes('score')) answer = 'Progress tracking combines completed sessions, exercise adherence, recorded pain, mobility scores, and appointment attendance over time.';
  res.json({ answer, disclaimer: 'This assistant is a software guide and does not replace a licensed healthcare professional.' });
};