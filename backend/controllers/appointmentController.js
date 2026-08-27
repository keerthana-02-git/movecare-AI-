import mongoose from 'mongoose';
import { Appointment, Patient, Therapist } from '../models/index.js';
import { ensureTherapistProfile } from './authController.js';
import { ensurePatientProfile } from './patientController.js';
import { createNotification } from './notificationController.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const slotMinutes = 45;

const parseTime = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
};

const dayKey = (date) =>
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

const dateBounds = (dateValue) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { start, end };
};

const getPatient = async (user) => {
  if (user?.role === 'Patient') return ensurePatientProfile(user);
  return Patient.findOne({ user: user?._id || user });
};

const getTherapist = async (user) => {
  if (user?.role === 'Therapist') return ensureTherapistProfile(user);
  return Therapist.findOne({ user: user?._id || user });
};

export const listAvailableTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.find({ status: 'Available' })
      .populate('user', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json(therapists);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load therapists' });
  }
};

export const listAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'A date in YYYY-MM-DD format is required' });
    }

    const therapist = await Therapist.findOne({ _id: req.params.therapistId, status: 'Available' }).lean();
    if (!therapist) return res.status(404).json({ message: 'Available therapist not found' });

    const { start, end } = dateBounds(date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (start < startOfToday) return res.json([]);

    const availability = therapist.availability?.[dayKey(start)];
    if (!availability?.start || !availability?.end) return res.json([]);

    const now = new Date();
    const isToday = start.toDateString() === now.toDateString();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const appointments = await Appointment.find({
      therapist: therapist._id,
      appointmentDate: { $gte: start, $lt: end },
      status: { $nin: ['Cancelled', 'NoShow'] },
    }).select('startTime endTime').lean();
    const occupied = appointments.map((appointment) => [parseTime(appointment.startTime), parseTime(appointment.endTime)]);
    const slots = [];
    for (let minutes = parseTime(availability.start); minutes + slotMinutes <= parseTime(availability.end); minutes += slotMinutes) {
      const slotEnd = minutes + slotMinutes;
      if (!occupied.some(([startTime, endTime]) => minutes < endTime && slotEnd > startTime)) {
        if (!isToday || minutes > nowMinutes) {
          slots.push({ startTime: formatTime(minutes), endTime: formatTime(slotEnd) });
        }
      }
    }
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load appointment slots' });
  }
};

export const bookAppointment = async (req, res) => {
  try {
    const { therapistId, date, startTime, endTime, type = 'Treatment Session', notes = '' } = req.body;
    if (!therapistId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Therapist, date, start time and end time are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(therapistId)) {
      return res.status(400).json({ message: 'Invalid therapist ID format' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ message: 'Time must be in HH:MM format' });
    }

    if (parseTime(startTime) >= parseTime(endTime)) {
      return res.status(400).json({ message: 'Start time must be before end time' });
    }

    const { start, end } = dateBounds(date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (start < startOfToday) {
      return res.status(400).json({ message: 'Cannot book appointments in the past' });
    }

    const isToday = start.toDateString() === new Date().toDateString();
    if (isToday) {
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      if (parseTime(startTime) <= nowMinutes) {
        return res.status(400).json({ message: 'Cannot book an appointment slot that has already passed today' });
      }
    }

    const [patient, therapist] = await Promise.all([
      getPatient(req.user),
      Therapist.findOne({ _id: therapistId, status: 'Available' }),
    ]);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    if (!therapist) return res.status(404).json({ message: 'Available therapist not found' });

    // Validate therapist schedule working hours
    const availability = therapist.availability?.[dayKey(start)];
    if (availability && availability.start && availability.end) {
      if (parseTime(startTime) < parseTime(availability.start) || parseTime(endTime) > parseTime(availability.end)) {
        return res.status(400).json({ message: 'Requested slot is outside therapist working hours' });
      }
    }

    // Prevent double booking for therapist
    const therapistConflict = await Appointment.exists({
      therapist: therapist._id,
      appointmentDate: { $gte: start, $lt: end },
      startTime,
      status: { $nin: ['Cancelled', 'NoShow'] },
    });
    if (therapistConflict) {
      return res.status(409).json({ message: 'That appointment slot is no longer available' });
    }

    // Prevent double booking for patient
    const patientConflict = await Appointment.exists({
      patient: patient._id,
      appointmentDate: { $gte: start, $lt: end },
      startTime,
      status: { $nin: ['Cancelled', 'NoShow'] },
    });
    if (patientConflict) {
      return res.status(409).json({ message: 'You already have an appointment scheduled at this time' });
    }

    const appointment = await Appointment.create({
      patient: patient._id,
      therapist: therapist._id,
      appointmentDate: start,
      startTime,
      endTime,
      type,
      notes,
      consultationMode: 'Virtual',
      consultationStatus: 'Waiting',
      location: 'MoveCare virtual clinic',
    });

    const therapistUser = await Therapist.findById(therapist._id).select('user');
    if (therapistUser?.user) {
      await createNotification({
        recipient: therapistUser.user,
        type: 'Appointment',
        title: 'New appointment request',
        message: 'A patient has requested a virtual consultation.',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    await logAuditEvent({
      action: 'APPOINTMENT_BOOKED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Appointment', entityId: appointment._id },
      details: {
        appointmentId: appointment._id,
        therapistId: therapist._id,
        appointmentDate: appointment.appointmentDate,
        startTime,
        endTime,
      },
      req,
    });

    res.status(201).json(await appointment.populate([
      { path: 'therapist', populate: { path: 'user', select: 'name email' } },
    ]));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to book appointment' });
  }
};

export const listPatientAppointments = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const appointments = await Appointment.find({ patient: patient._id })
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
      .lean();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load appointments' });
  }
};

export const cancelPatientAppointment = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const appointment = await Appointment.findOne({ _id: req.params.id, patient: patient._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (['Cancelled', 'Completed', 'NoShow'].includes(appointment.status)) {
      return res.status(400).json({ message: 'This appointment cannot be cancelled' });
    }
    if (appointment.status === 'InProgress' || appointment.consultationStatus === 'Live') {
      return res.status(400).json({ message: 'Cannot cancel an in-progress appointment' });
    }

    appointment.status = 'Cancelled';
    appointment.reasonForCancellation = req.body.reason || 'Cancelled by patient';
    await appointment.save();

    const therapistUser = await Therapist.findById(appointment.therapist).select('user');
    if (therapistUser?.user) {
      await createNotification({
        recipient: therapistUser.user,
        type: 'Appointment',
        title: 'Appointment cancelled',
        message: `A patient cancelled their consultation for ${appointment.appointmentDate.toISOString().split('T')[0]}. Reason: ${appointment.reasonForCancellation}`,
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    const patientUser = await Patient.findById(appointment.patient).select('user');
    if (patientUser?.user) {
      await createNotification({
        recipient: patientUser.user,
        type: 'Appointment',
        title: 'Appointment cancelled',
        message: 'Your appointment was cancelled.',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    await logAuditEvent({
      action: 'APPOINTMENT_CANCELLED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Appointment', entityId: appointment._id },
      details: {
        appointmentId: appointment._id,
        cancelledBy: 'Patient',
        reason: appointment.reasonForCancellation,
      },
      req,
    });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to cancel appointment' });
  }
};

export const listTherapistAppointments = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const appointments = await Appointment.find({ therapist: therapist._id })
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .lean();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load appointments' });
  }
};

export const updateTherapistAppointment = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });

    const allowedStatuses = ['Accepted', 'InProgress', 'Completed', 'Cancelled', 'NoShow'];
    const { status, notes, reasonForCancellation, date, startTime, endTime } = req.body;
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid appointment status' });
    }

    const appointment = await Appointment.findOne({ _id: req.params.id, therapist: therapist._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (status) {
      appointment.status = status;
      if (status === 'InProgress') appointment.consultationStatus = 'Live';
      if (status === 'Completed') appointment.consultationStatus = 'Ended';
    }
    if (notes !== undefined) appointment.notes = notes;
    if (reasonForCancellation !== undefined) appointment.reasonForCancellation = reasonForCancellation;

    // Reschedule support
    if (date && startTime && endTime) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Reschedule date must be in YYYY-MM-DD format' });
      }
      const { start, end } = dateBounds(date);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (start < startOfToday) {
        return res.status(400).json({ message: 'Cannot reschedule appointments to past dates' });
      }

      const conflict = await Appointment.exists({
        _id: { $ne: appointment._id },
        therapist: therapist._id,
        appointmentDate: { $gte: start, $lt: end },
        startTime,
        status: { $nin: ['Cancelled', 'NoShow'] },
      });
      if (conflict) {
        return res.status(409).json({ message: 'The requested slot is already booked for this therapist' });
      }

      appointment.appointmentDate = start;
      appointment.startTime = startTime;
      appointment.endTime = endTime;
    }

    await appointment.save();
    await appointment.populate({ path: 'patient', populate: { path: 'user', select: 'name email' } });

    // Notify patient of changes
    const patientUser = await Patient.findById(appointment.patient).select('user');
    if (patientUser?.user) {
      let title = `Appointment ${appointment.status}`;
      let message = `Your appointment status was updated to ${appointment.status}.`;
      if (status === 'Accepted') {
        title = 'Appointment confirmed';
        message = 'Your therapist has confirmed your consultation.';
      } else if (status === 'Cancelled') {
        title = 'Appointment cancelled by therapist';
        message = `Your consultation was cancelled. Reason: ${appointment.reasonForCancellation || 'Schedule update'}`;
      } else if (date && startTime) {
        title = 'Appointment rescheduled';
        message = `Your consultation was rescheduled to ${date} from ${startTime} to ${endTime}.`;
      }
      await createNotification({
        recipient: patientUser.user,
        type: 'Appointment',
        title,
        message,
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    await logAuditEvent({
      action: 'APPOINTMENT_STATUS_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Appointment', entityId: appointment._id },
      details: {
        appointmentId: appointment._id,
        status: appointment.status,
        updatedBy: req.user.role,
        notes: appointment.notes,
      },
      req,
    });

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update appointment' });
  }
};

export const getConsultation = async (req, res) => {
  try {
    let owner;
    if (req.user.role === 'Therapist') {
      const therapist = await getTherapist(req.user);
      if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
      owner = { therapist: therapist._id };
    } else if (req.user.role === 'Patient') {
      const patient = await getPatient(req.user);
      if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
      owner = { patient: patient._id };
    } else if (req.user.role === 'Admin') {
      owner = {};
    } else {
      return res.status(403).json({ message: 'Consultation access denied' });
    }

    const appointment = await Appointment.findOne({ _id: req.params.id, ...owner })
      .populate({
        path: 'patient',
        select: 'user medicalCondition injuryDescription dateOfBirth status',
        populate: { path: 'user', select: 'name email' },
      })
      .populate({
        path: 'therapist',
        select: 'user specialization yearsOfExperience status',
        populate: { path: 'user', select: 'name email' },
      })
      .lean();
    if (!appointment) return res.status(404).json({ message: 'Consultation not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load consultation' });
  }
};

export const updateConsultationStatus = async (req, res) => {
  try {
    let owner;
    if (req.user.role === 'Therapist') {
      const therapist = await getTherapist(req.user);
      if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
      owner = { therapist: therapist._id };
    } else if (req.user.role === 'Patient') {
      const patient = await getPatient(req.user);
      if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
      owner = { patient: patient._id };
    } else if (req.user.role === 'Admin') {
      owner = {};
    } else {
      return res.status(403).json({ message: 'Consultation access denied' });
    }

    const { consultationStatus, notes } = req.body;
    if (consultationStatus && !['Waiting', 'Live', 'Ended'].includes(consultationStatus)) {
      return res.status(400).json({ message: 'Invalid consultation status' });
    }

    const appointment = await Appointment.findOne({ _id: req.params.id, ...owner });
    if (!appointment) return res.status(404).json({ message: 'Consultation not found' });

    if (consultationStatus) {
      if (req.user.role === 'Patient' && ['Live', 'Ended'].includes(consultationStatus)) {
        return res.status(403).json({ message: 'Only therapist can start or end consultation' });
      }
      appointment.consultationStatus = consultationStatus;
      if (consultationStatus === 'Live') appointment.status = 'InProgress';
      if (consultationStatus === 'Ended') appointment.status = 'Completed';
    }

    if (notes !== undefined) {
      appointment.notes = notes;
    }

    await appointment.save();
    await appointment.populate([
      {
        path: 'patient',
        select: 'user medicalCondition injuryDescription dateOfBirth status',
        populate: { path: 'user', select: 'name email' },
      },
      {
        path: 'therapist',
        select: 'user specialization yearsOfExperience status',
        populate: { path: 'user', select: 'name email' },
      },
    ]);

    await logAuditEvent({
      action: 'CONSULTATION_STATUS_UPDATED',
      performedBy: req.user,
      performedByRole: req.user.role,
      targetEntity: { entityType: 'Consultation', entityId: appointment._id },
      details: {
        appointmentId: appointment._id,
        consultationStatus: appointment.consultationStatus,
        role: req.user.role,
      },
      req,
    });

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update consultation' });
  }
};