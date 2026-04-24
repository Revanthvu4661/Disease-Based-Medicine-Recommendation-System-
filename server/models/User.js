const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, minlength: 6 },   // optional — Google users have no password
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String },                    // Google profile picture URL
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  role: { type: String, enum: ['patient', 'doctor'], required: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  specialization: { type: String },
  loginHistory: [{
    loginTime: { type: Date, default: Date.now },
    method: { type: String, enum: ['local', 'google'] }
  }],
  allergies: [String],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
