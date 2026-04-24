const express = require('express');
const router = express.Router();
const { register, login, getMe, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);       // POST /api/auth/google  — verify Google ID token
router.get('/me', protect, getMe);

// Expose Google Client ID to frontend (public, not secret)
router.get('/google-config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

module.exports = router;
