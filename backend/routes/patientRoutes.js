import express from 'express';
import { getPatientDashboard } from '../controllers/patientController.js';
import {
  deletePainJournalEntry,
  getPatientPainJournal,
  recordPainJournalEntry,
  updatePainJournalEntry,
} from '../controllers/painJournalController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication & Patient role
router.use(protect);
router.use(authorize('Patient'));

router.get('/me/dashboard', getPatientDashboard);
router.get('/me/pain-journal', getPatientPainJournal);
router.post('/me/pain-journal', recordPainJournalEntry);
router.put('/me/pain-journal/:entryId', updatePainJournalEntry);
router.delete('/me/pain-journal/:entryId', deletePainJournalEntry);

export default router;