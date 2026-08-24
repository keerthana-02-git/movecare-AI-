import jwt from 'jsonwebtoken';
import { Patient, Therapist, User } from '../models/index.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const createPatientProfile = (user, profile = {}) => Patient.create({
  user: user._id,
  dateOfBirth: profile.dateOfBirth || new Date('1970-01-01'),
  gender: profile.gender || 'Other',
  medicalCondition: profile.medicalCondition || 'Profile setup required',
  injuryDescription: profile.injuryDescription || '',
});

export const createTherapistProfile = (user, profile = {}) => Therapist.create({
  user: user._id,
  licenseNumber: profile.licenseNumber || `PT-${user._id.toString().slice(-6).toUpperCase()}`,
  specialization: profile.specialization || 'Physical Therapy',
  yearsOfExperience: profile.yearsOfExperience !== undefined ? Number(profile.yearsOfExperience) : 5,
  status: profile.status || 'Available',
  availability: profile.availability || {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: { start: '10:00', end: '14:00' },
  },
  patientsAssigned: profile.patientsAssigned || [],
});

export const ensureTherapistProfile = async (user) => {
  const existingProfile = await Therapist.findOne({ user: user._id });
  if (existingProfile) return existingProfile;

  return createTherapistProfile(user);
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!String(name || '').trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const requestedRole = ['Patient', 'Therapist', 'Admin'].includes(req.body.role)
      ? req.body.role
      : 'Patient';

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: requestedRole,
    });

    try {
      if (requestedRole === 'Patient') {
        await createPatientProfile(user, req.body);
      } else if (requestedRole === 'Therapist') {
        await createTherapistProfile(user, req.body);
      }
    } catch (profileError) {
      await User.deleteOne({ _id: user._id });
      throw profileError;
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: error.name === 'ValidationError' ? error.message : 'Registration failed' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const emailAddress = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!emailAddress || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: emailAddress }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

export const logoutUser = (req, res) => {
  res.json({ message: 'Logout successful. Please discard the token on the client side.' });
};

export const getMe = async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
};
