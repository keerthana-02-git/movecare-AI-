import express from 'express';
import {
  analyzeProgress,
  answerAssistant,
  evaluatePatientAgent,
  getAdaptiveRecommendations,
  getRecommendations,
  getTherapistPatientSummary,
  getTherapistRecommendations,
  generateSmartReminders,
} from '../controllers/aiController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Feature 1: AI Exercise Recommendation
router.get('/recommendations', authorize('Patient'), getRecommendations);

// Feature 2: Progress Analyzer
router.get('/progress-analysis', authorize('Patient'), analyzeProgress);

// Feature 3: Adaptive Exercise Recommendation
router.get('/adaptive-recommendations', authorize('Patient'), getAdaptiveRecommendations);
router.post('/adaptive-recommendations', authorize('Patient'), getAdaptiveRecommendations);

// Feature 4: Smart Reminders
router.get('/smart-reminders', authorize('Patient'), generateSmartReminders);
router.post('/smart-reminders', authorize('Patient'), generateSmartReminders);

// Agentic Loop: Observe -> Analyze -> Decide -> Generate -> Store -> Trigger
router.post('/agent/evaluate-patient', authorize('Patient'), evaluatePatientAgent);

// Feature 5: Therapist AI Summary
router.get('/therapist/recommendations', authorize('Therapist'), getTherapistRecommendations);
router.get('/therapist/patients/:patientId/summary', authorize('Therapist'), getTherapistPatientSummary);

// Feature 6: AI Health Assistant
router.post('/assistant', authorize('Patient'), answerAssistant);

export default router;