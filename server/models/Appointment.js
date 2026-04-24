const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  requestedDate: { type: Date, required: true },
  timeSlot: { type: String, required: true }, // HH:MM format
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'cancelled'], default: 'pending' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
