import { PainJournal, Patient } from '../models/index.js';
import { ensurePatientProfile } from './patientController.js';

const round = (value) => Math.round(value * 10) / 10;

const getPatient = async (user) => {
  if (user?.role === 'Patient') return ensurePatientProfile(user);
  return Patient.findOne({ user: user?._id || user });
};

const toISODateString = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPatientPainJournal = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const entries = await PainJournal.find({ patient: patient._id })
      .sort({ dateString: -1, createdAt: -1 })
      .lean();

    const todayStr = toISODateString(new Date());
    const todayEntry = entries.find((e) => e.dateString === todayStr) || null;

    const totalEntries = entries.length;
    const averagePain = totalEntries > 0
      ? round(entries.reduce((sum, e) => sum + Number(e.painLevel), 0) / totalEntries)
      : null;
    const averageMobility = totalEntries > 0
      ? round(entries.reduce((sum, e) => sum + Number(e.mobilityLevel), 0) / totalEntries)
      : null;

    const summary = {
      totalEntries,
      hasTodayEntry: Boolean(todayEntry),
      averagePain,
      averageMobility,
      latestEntry: entries[0] || null,
      todayEntry,
    };

    res.json({
      entries,
      todayEntry,
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to retrieve pain journal' });
  }
};

export const recordPainJournalEntry = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const {
      painLevel,
      mobilityLevel,
      bodyPart,
      symptoms = [],
      symptomsDescription = '',
      notes = '',
      date,
    } = req.body;

    // Strict Validation
    if (painLevel === undefined || painLevel === null || isNaN(Number(painLevel))) {
      return res.status(400).json({ message: 'Pain level must be a valid number between 0 and 10' });
    }
    const numPain = Number(painLevel);
    if (numPain < 0 || numPain > 10) {
      return res.status(400).json({ message: 'Pain level must be between 0 and 10' });
    }

    if (mobilityLevel === undefined || mobilityLevel === null || isNaN(Number(mobilityLevel))) {
      return res.status(400).json({ message: 'Mobility level must be a valid number between 1 and 5' });
    }
    const numMobility = Number(mobilityLevel);
    if (numMobility < 1 || numMobility > 5) {
      return res.status(400).json({ message: 'Mobility level must be between 1 and 5' });
    }

    if (!bodyPart || typeof bodyPart !== 'string' || !bodyPart.trim()) {
      return res.status(400).json({ message: 'Affected body part is required' });
    }

    if (notes && typeof notes === 'string' && notes.length > 500) {
      return res.status(400).json({ message: 'Notes cannot exceed 500 characters' });
    }

    if (symptomsDescription && typeof symptomsDescription === 'string' && symptomsDescription.length > 300) {
      return res.status(400).json({ message: 'Symptoms description cannot exceed 300 characters' });
    }

    const dateString = toISODateString(date);
    const recordedDate = date ? new Date(date) : new Date();
    const mobilityScore = Math.min(100, Math.max(0, numMobility * 20));

    // One-Entry-Per-Day Upsert Logic
    const existingEntry = await PainJournal.findOne({
      patient: patient._id,
      dateString,
    });

    if (existingEntry) {
      existingEntry.painLevel = numPain;
      existingEntry.mobilityLevel = numMobility;
      existingEntry.mobilityScore = mobilityScore;
      existingEntry.bodyPart = bodyPart.trim();
      existingEntry.symptoms = Array.isArray(symptoms) ? symptoms : [symptoms].filter(Boolean);
      existingEntry.symptomsDescription = (symptomsDescription || '').trim();
      existingEntry.notes = (notes || '').trim();
      existingEntry.date = recordedDate;

      await existingEntry.save();
      return res.status(200).json(existingEntry);
    }

    const newEntry = await PainJournal.create({
      patient: patient._id,
      date: recordedDate,
      dateString,
      painLevel: numPain,
      mobilityLevel: numMobility,
      mobilityScore,
      bodyPart: bodyPart.trim(),
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms].filter(Boolean),
      symptomsDescription: (symptomsDescription || '').trim(),
      notes: (notes || '').trim(),
    });

    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to record pain journal entry' });
  }
};

export const updatePainJournalEntry = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const entry = await PainJournal.findOne({
      _id: req.params.entryId,
      patient: patient._id,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    const {
      painLevel,
      mobilityLevel,
      bodyPart,
      symptoms,
      symptomsDescription,
      notes,
    } = req.body;

    if (painLevel !== undefined) {
      const numPain = Number(painLevel);
      if (isNaN(numPain) || numPain < 0 || numPain > 10) {
        return res.status(400).json({ message: 'Pain level must be between 0 and 10' });
      }
      entry.painLevel = numPain;
    }

    if (mobilityLevel !== undefined) {
      const numMobility = Number(mobilityLevel);
      if (isNaN(numMobility) || numMobility < 1 || numMobility > 5) {
        return res.status(400).json({ message: 'Mobility level must be between 1 and 5' });
      }
      entry.mobilityLevel = numMobility;
      entry.mobilityScore = Math.min(100, Math.max(0, numMobility * 20));
    }

    if (bodyPart !== undefined) {
      if (!bodyPart || typeof bodyPart !== 'string' || !bodyPart.trim()) {
        return res.status(400).json({ message: 'Affected body part cannot be empty' });
      }
      entry.bodyPart = bodyPart.trim();
    }

    if (symptoms !== undefined) {
      entry.symptoms = Array.isArray(symptoms) ? symptoms : [symptoms].filter(Boolean);
    }

    if (symptomsDescription !== undefined) {
      if (typeof symptomsDescription === 'string' && symptomsDescription.length > 300) {
        return res.status(400).json({ message: 'Symptoms description cannot exceed 300 characters' });
      }
      entry.symptomsDescription = (symptomsDescription || '').trim();
    }

    if (notes !== undefined) {
      if (typeof notes === 'string' && notes.length > 500) {
        return res.status(400).json({ message: 'Notes cannot exceed 500 characters' });
      }
      entry.notes = (notes || '').trim();
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to update journal entry' });
  }
};

export const deletePainJournalEntry = async (req, res) => {
  try {
    const patient = await getPatient(req.user);
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    const entry = await PainJournal.findOneAndDelete({
      _id: req.params.entryId,
      patient: patient._id,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    res.json({ message: 'Journal entry deleted successfully', deletedId: entry._id });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to delete journal entry' });
  }
};
