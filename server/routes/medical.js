const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { searchDisease, getDiseaseByName, getAllDiseases, getSymptoms, checkInteractions } = require('../controllers/medicalController');

router.use(protect);
router.get('/search', searchDisease);
router.get('/symptoms', getSymptoms);
router.get('/interactions', checkInteractions);
router.get('/all', getAllDiseases);
router.get('/:name', getDiseaseByName);

module.exports = router;
