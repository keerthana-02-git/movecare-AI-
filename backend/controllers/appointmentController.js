import { Appointment, Patient, Therapist } from '../models/index.js';
import { createNotification } from './notificationController.js';

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

const getPatient = (userId) => Patient.findOne({ user: userId });
const getTherapist = (userId) => Therapist.findOne({ user: userId });

export const listAvailableTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.find({ status: 'Available' })
      .populate('user', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json(therapists);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load therapists' });
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
    if (start < new Date()) return res.json([]);
    const availability = therapist.availability?.[dayKey(start)];
    if (!availability?.start || !availability?.end) return res.json([]);

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
        slots.push({ startTime: formatTime(minutes), endTime: formatTime(slotEnd) });
      }
    }
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load appointment slots' });
  }
};

export const bookAppointment = async (req, res) => {
  try {
    const { therapistId, date, startTime, endTime, type = 'Treatment Session', notes = '' } = req.body;
    if (!therapistId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Therapist, date, start time and end time are required' });
    }

    const [patient, therapist] = await Promise.all([
      getPatient(req.user._id),
      Therapist.findOne({ _id: therapistId, status: 'Available' }),
    ]);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    if (!therapist) return res.status(404).json({ message: 'Available therapist not found' });

    const { start, end } = dateBounds(date);
    const conflict = await Appointment.exists({
      therapist: therapist._id,
      appointmentDate: { $gte: start, $lt: end },
      startTime,
      status: { $nin: ['Cancelled', 'NoShow'] },
    });
    if (conflict) return res.status(409).json({ message: 'That appointment slot is no longer available' });

    const appointment = await Appointment.create({
      patient: patient._id,
      therapist: therapist._id,
      appointmentDate: start,
      startTime,
      endTime,
      type,
      notes,
      consultationMode: 'Virtual',
      location: 'MoveCare virtual clinic',
    });
    const therapistUser = await Therapist.findById(therapist._id).select('user');
    await createNotification({
      recipient: therapistUser.user,
      type: 'Appointment',
      title: 'New appointment request',
      message: 'A patient has requested a virtual consultation.',
      relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
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
    const patient = await getPatient(req.user._id);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
    const appointments = await Appointment.find({ patient: patient._id })
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
      .lean();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load appointments' });
  }
};

export const cancelPatientAppointment = async (req, res) => {
  try {
    const patient = await getPatient(req.user._id);
    const appointment = await Appointment.findOne({ _id: req.params.id, patient: patient?._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const patientUser = await Patient.findById(appointment.patient).select('user');
    await createNotification({
      recipient: patientUser.user,
      type: status === 'Cancelled' ? 'Appointment' : 'Appointment',
      title: status === 'Accepted' ? 'Appointment accepted' : status === 'Cancelled' ? 'Appointment cancelled' : 'Appointment updated',
      message: status === 'Accepted' ? 'Your therapist accepted the appointment request.' : `Your appointment status is now ${status}.`,
      relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
    });
    if (['Cancelled', 'Completed', 'NoShow'].includes(appointment.status)) {
      return res.status(400).json({ message: 'This appointment cannot be cancelled' });
    }
    const appointmentStart = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentStart.setHours(hours, minutes, 0, 0);
    const deadline = appointmentStart.getTime() - appointment.cancellationDeadlineHours * 60 * 60 * 1000;
    if (Date.now() > deadline) return res.status(400).json({ message: 'Appointments can only be cancelled 24 hours in advance' });

    appointment.status = 'Cancelled';
    appointment.reasonForCancellation = req.body.reason || 'Cancelled by patient';
    await appointment.save();
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to cancel appointment' });
  }
};

export const listTherapistAppointments = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    if (!therapist) return res.status(404).json({ message: 'Therapist profile not found' });
    const appointments = await Appointment.find({ therapist: therapist._id })
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .lean();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load appointments' });
  }
};

export const updateTherapistAppointment = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    const allowedStatuses = ['Accepted', 'InProgress', 'Completed', 'Cancelled', 'NoShow'];
    const { status, notes } = req.body;
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid appointment status' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, therapist: therapist?._id },
      { status, ...(notes !== undefined ? { notes } : {}) },
      { new: true, runValidators: true },
    ).populate({ path: 'patient', populate: { path: 'user', select: 'name email' } });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update appointment' });
  }
};

export const getConsultation = async (req, res) => {
  try {
    const [patient, therapist] = await Promise.all([getPatient(req.user._id), getTherapist(req.user._id)]);
    const owner = patient ? { patient: patient._id } : therapist ? { therapist: therapist._id } : null;
    if (!owner) return res.status(403).json({ message: 'Consultation access denied' });
    const appointment = await Appointment.findOne({ _id: req.params.id, ...owner })
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .populate({ path: 'therapist', populate: { path: 'user', select: 'name email' } })
      .lean();
    if (!appointment) return res.status(404).json({ message: 'Consultation not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load consultation' });
  }
};

export const updateConsultationStatus = async (req, res) => {
  try {
    const therapist = await getTherapist(req.user._id);
    const { consultationStatus } = req.body;
    if (!['Waiting', 'Live', 'Ended'].includes(consultationStatus)) return res.status(400).json({ message: 'Invalid consultation status' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, therapist: therapist?._id },
      {
        consultationStatus,
        ...(consultationStatus === 'Live' ? { status: 'InProgress' } : {}),
      },
      { new: true, runValidators: true },
    );
    if (!appointment) return res.status(404).json({ message: 'Consultation not found' });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update consultation' });
  }
};