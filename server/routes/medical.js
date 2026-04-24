const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { searchDisease, getDiseaseByName, getAllDiseases } = require('../controllers/medicalController');

router.use(protect);
router.get('/search', searchDisease);
router.get('/all', getAllDiseases);
router.get('/:name', getDiseaseByName);

module.exports = router;
