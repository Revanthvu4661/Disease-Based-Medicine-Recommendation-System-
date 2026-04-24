const express = require('express');
const router = express.Router();
const { protect, doctorOnly } = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  getAppointmentById
} = require('../controllers/appointmentController');

router.use(protect);

router.post('/', createAppointment);
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.patch('/:id', updateAppointmentStatus);

module.exports = router;
