import express from 'express';
import {
  adoptStarterPlan,
  assignExercise,
  completePatientExercise,
  createExercise,
  deleteExercise,
  getExerciseById,
  getPatientExercises,
  listAssignmentOptions,
  listExercises,
  updateExercise,
} from '../controllers/exerciseController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/patient/assigned', authorize('Patient'), getPatientExercises);
router.post('/patient/starter-plan', authorize('Patient'), adoptStarterPlan);
router.post('/patient/:exerciseId/complete', authorize('Patient'), completePatientExercise);
router.get('/', authorize('Therapist'), listExercises);
router.get('/assignment-options', authorize('Therapist'), listAssignmentOptions);
router.get('/:id', authorize('Therapist'), getExerciseById);
router.post('/', authorize('Therapist'), createExercise);
router.post('/assign', authorize('Therapist'), assignExercise);
router.put('/:id', authorize('Therapist'), updateExercise);
router.delete('/:id', authorize('Therapist'), deleteExercise);

export default router;