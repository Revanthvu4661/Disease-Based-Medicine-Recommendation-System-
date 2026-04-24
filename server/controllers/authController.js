const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, age, gender, specialization } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'Please fill all required fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, age, gender, specialization, loginHistory: [{ method: 'local' }] });
    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });

    if (role && user.role !== role) return res.status(401).json({ message: `This account is not registered as a ${role}` });

    user.loginHistory.push({ method: 'local' });
    await user.save({ validateBeforeSave: false });

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.updateMe = async (req, res) => {
  try {
    const { name, age, gender, specialization, allergies } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (age) updates.age = age;
    if (gender) updates.gender = gender;
    if (specialization) updates.specialization = specialization;
    if (allergies) updates.allergies = Array.isArray(allergies) ? allergies : allergies.split(',').map(a => a.trim());

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== GOOGLE OAUTH =====
// Flow: frontend gets a Google ID token via Google Sign-In button,
// sends it here. We verify it with google-auth-library, then find/create the user.
exports.googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });
    if (!role) return res.status(400).json({ message: 'Role (patient/doctor) is required' });
    if (!['patient', 'doctor'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: 'Google Client ID not configured on server' });

    const client = new OAuth2Client(clientId);

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) return res.status(400).json({ message: 'Could not retrieve email from Google account' });

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Existing user — link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
      // Role mismatch check
      if (user.role !== role) {
        return res.status(401).json({
          message: `This Google account is registered as a ${user.role}, not a ${role}.`
        });
      }
      user.loginHistory.push({ method: 'google' });
      await user.save();
    } else {
      // New user — create with Google details
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        role,
        authProvider: 'google',
        loginHistory: [{ method: 'google' }]
        // no password for Google-only users
      });
    }

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google sign-in failed: ' + err.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email specialization');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
