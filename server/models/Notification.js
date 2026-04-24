const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['record_reviewed', 'new_record', 'appointment_requested', 'appointment_approved', 'appointment_declined', 'appointment_cancelled'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
