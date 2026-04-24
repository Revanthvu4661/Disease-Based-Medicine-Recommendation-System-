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

// Indexes for query performance
recordSchema.index({ patientId: 1, date: -1 });
recordSchema.index({ deleted: 1, reviewed: 1 });
recordSchema.index({ severity: 1 });
recordSchema.index({ date: 1 });
recordSchema.index({ disease: 'text', patientName: 'text' });

module.exports = mongoose.model('Record', recordSchema);
