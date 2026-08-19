import express from 'express';
import {
  bookAppointment,
  cancelPatientAppointment,
  getConsultation,
  listAvailableSlots,
  listAvailableTherapists,
  listPatientAppointments,
  listTherapistAppointments,
  updateConsultationStatus,
  updateTherapistAppointment,
} from '../controllers/appointmentController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/therapists', authorize('Patient'), listAvailableTherapists);
router.get('/therapists/:therapistId/slots', authorize('Patient'), listAvailableSlots);
router.post('/', authorize('Patient'), bookAppointment);
router.get('/patient', authorize('Patient'), listPatientAppointments);
router.patch('/:id/cancel', authorize('Patient'), cancelPatientAppointment);
router.get('/therapist', authorize('Therapist'), listTherapistAppointments);
router.patch('/:id/manage', authorize('Therapist'), updateTherapistAppointment);
router.get('/:id/consultation', getConsultation);
router.patch('/:id/consultation', authorize('Therapist'), updateConsultationStatus);

export default router;