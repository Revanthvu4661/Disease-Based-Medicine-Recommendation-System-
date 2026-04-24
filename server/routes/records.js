const express = require('express');
const router = express.Router();
const { protect, doctorOnly, patientOnly } = require('../middleware/auth');
const {
  createRecord, getMyRecords, getAllRecords,
  getRecord, reviewRecord, deleteRecord, getStats,
  getDeletedRecords, restoreRecord, permanentDelete,
  getPrescription, deleteOwnRecord
} = require('../controllers/recordController');

router.use(protect);

router.post('/', createRecord);
router.get('/mine', getMyRecords);

// Patient route
router.delete('/:id', patientOnly, deleteOwnRecord);

// Doctor routes
router.get('/', doctorOnly, getAllRecords);
router.get('/stats', doctorOnly, getStats);
router.get('/deleted', doctorOnly, getDeletedRecords);
router.get('/:id/prescription', doctorOnly, getPrescription);
router.get('/:id', doctorOnly, getRecord);
router.patch('/:id/review', doctorOnly, reviewRecord);
router.patch('/:id/restore', doctorOnly, restoreRecord);
router.delete('/:id/permanent', doctorOnly, permanentDelete);

module.exports = router;
