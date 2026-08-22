import express from 'express';
import { answerAssistant, getRecommendations, getTherapistRecommendations } from '../controllers/aiController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/recommendations', authorize('Patient'), getRecommendations);
router.get('/therapist/recommendations', authorize('Therapist'), getTherapistRecommendations);
router.post('/assistant', authorize('Patient'), answerAssistant);

export default router;