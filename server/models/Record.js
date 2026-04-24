const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String },
  disease: { type: String, required: true },
  symptoms: [String],
  age: { type: Number },
  weight: { type: Number },
  gender: { type: String },
  medicines: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  precautions: [String],
  description: { type: String },
  severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' },
  reviewed: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  notes: { type: String },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', recordSchema);
