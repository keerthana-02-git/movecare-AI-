import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const DEFAULT_JWT_SECRET = 'movecare_production_jwt_secret_key_2026_super_secure_32_characters_minimum_fallback_x89a7f21b';
const getJwtSecret = () => process.env.JWT_SECRET || DEFAULT_JWT_SECRET;


export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(decoded.id).select('-password');


    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact an administrator.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this role' });
  }

  next();
};
