const express = require('express');
const router = express.Router();
const { register, login, getMe, googleAuth, updateMe, getDoctors } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);       // POST /api/auth/google  — verify Google ID token
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);   // PATCH /api/auth/me — update profile
router.get('/doctors', getDoctors);       // GET /api/auth/doctors — list all doctors

// Expose Google Client ID to frontend (public, not secret)
router.get('/google-config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

module.exports = router;
