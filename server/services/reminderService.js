const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendAppointmentStatusEmail } = require('./emailService');

let job = null;

const startReminderService = () => {
  job = cron.schedule('0 8 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
      const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

      const appointments = await Appointment.find({
        requestedDate: { $gte: startOfDay, $lte: endOfDay },
        status: 'approved'
      });

      for (const apt of appointments) {
        // Send reminder to patient
        await sendAppointmentStatusEmail(
          apt.patientEmail,
          apt.patientName,
          'reminder',
          apt.doctorName,
          `${new Date(apt.requestedDate).toLocaleDateString()} at ${apt.timeSlot}`
        );
      }

      if (appointments.length > 0) {
        console.log(`📧 Sent ${appointments.length} appointment reminders`);
      }
    } catch (err) {
      console.error('Reminder service error:', err.message);
    }
  });

  console.log('⏰ Appointment reminder service started (daily at 8 AM)');
};

const stopReminderService = () => {
  if (job) {
    job.stop();
    console.log('⏰ Appointment reminder service stopped');
  }
};

module.exports = { startReminderService, stopReminderService };
