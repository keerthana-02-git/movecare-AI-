import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  googleAuth,
  getGoogleAuthUrl,
  googleCallback,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', resetPassword);
router.get('/google/url', getGoogleAuthUrl);
router.get('/google/callback', googleCallback);
router.post('/google', googleAuth);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

export default router;

