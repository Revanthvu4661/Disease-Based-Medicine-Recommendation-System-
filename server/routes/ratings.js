const express = require('express');
const router = express.Router();
const { protect, patientOnly } = require('../middleware/auth');
const { createRating, getDoctorRatings, getMyRatings } = require('../controllers/ratingController');

router.use(protect);
router.post('/', patientOnly, createRating);
router.get('/doctor/:doctorId', getDoctorRatings);
router.get('/my/ratings', getMyRatings);

module.exports = router;
