import express from 'express';
import { answerAssistant, getRecommendations } from '../controllers/aiController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('Patient'));
router.get('/recommendations', getRecommendations);
router.post('/assistant', answerAssistant);

export default router;