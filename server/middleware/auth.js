const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set in environment');
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const doctorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') return next();
  res.status(403).json({ message: 'Access denied: Doctors only' });
};

const patientOnly = (req, res, next) => {
  if (req.user && req.user.role === 'patient') return next();
  res.status(403).json({ message: 'Access denied: Patients only' });
};

module.exports = { protect, doctorOnly, patientOnly };
