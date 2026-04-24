const nodemailer = require('nodemailer');

let transporter;

const initializeEmailService = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    console.log('⚠️ Email service disabled: EMAIL_USER or EMAIL_PASS not configured in .env');
  }
};

const sendRecordReviewedEmail = async (patientEmail, patientName, doctorName, diseaseReviewed) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: patientEmail,
      subject: '📋 Your Medical Record Has Been Reviewed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Record Reviewed</h2>
          <p>Dear ${patientName},</p>
          <p>Your medical record for <strong>${diseaseReviewed}</strong> has been reviewed by <strong>Dr. ${doctorName}</strong>.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/patient.html" style="background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Record</a></p>
          <p>Best regards,<br>MediRec Team</p>
        </div>
      `,
    });
    console.log(`✅ Record review email sent to ${patientEmail}`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const sendAppointmentStatusEmail = async (recipientEmail, recipientName, status, doctorName, appointmentDate) => {
  if (!transporter) return;
  try {
    const statusText = status === 'approved' ? '✅ Approved' : status === 'declined' ? '❌ Declined' : '❌ Cancelled';
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `📅 Appointment ${statusText}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment ${statusText}</h2>
          <p>Dear ${recipientName},</p>
          <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${appointmentDate}</strong> has been <strong>${status}</strong>.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/patient.html" style="background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Appointments</a></p>
          <p>Best regards,<br>MediRec Team</p>
        </div>
      `,
    });
    console.log(`✅ Appointment status email sent to ${recipientEmail}`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const sendAppointmentRequestEmail = async (doctorEmail, doctorName, patientName, appointmentDate, timeSlot) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: doctorEmail,
      subject: '📅 New Appointment Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Appointment Request</h2>
          <p>Dear Dr. ${doctorName},</p>
          <p><strong>${patientName}</strong> has requested an appointment on <strong>${appointmentDate}</strong> at <strong>${timeSlot}</strong>.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/doctor.html" style="background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Request</a></p>
          <p>Best regards,<br>MediRec Team</p>
        </div>
      `,
    });
    console.log(`✅ Appointment request email sent to ${doctorEmail}`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

module.exports = {
  initializeEmailService,
  sendRecordReviewedEmail,
  sendAppointmentStatusEmail,
  sendAppointmentRequestEmail,
};
