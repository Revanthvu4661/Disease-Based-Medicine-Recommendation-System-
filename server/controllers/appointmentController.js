const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendAppointmentRequestEmail, sendAppointmentStatusEmail } = require('../services/emailService');

exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, requestedDate, timeSlot, reason } = req.body;
    if (!doctorId || !requestedDate || !timeSlot || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ message: 'Invalid doctor' });
    }

    const appointment = await Appointment.create({
      patientId: req.user._id,
      patientName: req.user.name,
      patientEmail: req.user.email,
      doctorId,
      doctorName: doctor.name,
      requestedDate: new Date(requestedDate),
      timeSlot,
      reason
    });

    // Notify doctor of new appointment request
    await createNotification(
      doctorId,
      'appointment_requested',
      'New Appointment Request',
      `${req.user.name} requested an appointment for ${new Date(requestedDate).toLocaleDateString('en-IN')} at ${timeSlot}`,
      null,
      appointment._id
    );
    // Send email to doctor
    await sendAppointmentRequestEmail(doctor.email, doctor.name, req.user.name, new Date(requestedDate).toLocaleDateString('en-IN'), timeSlot);

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    // Doctor sees appointment requests for them
    // Patient sees their appointment requests
    if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
    } else {
      filter.patientId = req.user._id;
    }

    if (status) filter.status = status;

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['approved', 'declined', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // Doctor can approve/decline, Patient can cancel
    if (req.user.role === 'doctor' && appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (req.user.role === 'patient' && appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    appointment.updatedAt = new Date();
    await appointment.save();

    // Notify the other party
    const notifyUserId = req.user.role === 'doctor' ? appointment.patientId : appointment.doctorId;
    const notifyUserEmail = req.user.role === 'doctor' ? appointment.patientEmail : (await User.findById(appointment.doctorId)).email;
    const notifyUserName = req.user.role === 'doctor' ? appointment.patientName : appointment.doctorName;

    const statusTitle = status.charAt(0).toUpperCase() + status.slice(1);
    await createNotification(
      notifyUserId,
      `appointment_${status}`,
      `Appointment ${statusTitle}`,
      `Your appointment request has been ${status}`,
      null,
      appointment._id
    );
    // Send email to the other party
    const dateStr = new Date(appointment.requestedDate).toLocaleDateString('en-IN');
    await sendAppointmentStatusEmail(notifyUserEmail, notifyUserName, status, req.user.role === 'doctor' ? req.user.name : appointment.doctorName, `${dateStr} at ${appointment.timeSlot}`);

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    // Verify user is party to this appointment
    const isParty = appointment.patientId.toString() === req.user._id.toString() || appointment.doctorId.toString() === req.user._id.toString();
    if (!isParty) return res.status(403).json({ message: 'Unauthorized' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
