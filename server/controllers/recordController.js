const Record = require('../models/Record');

// Patient: Create a new medical record
exports.createRecord = async (req, res) => {
  try {
    const { disease, symptoms, age, weight, gender, medicines, precautions, description, severity } = req.body;
    const record = await Record.create({
      patientId: req.user._id,
      patientName: req.user.name,
      patientEmail: req.user.email,
      disease, symptoms, age, weight, gender,
      medicines, precautions, description, severity
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Patient: Get own records (exclude deleted)
exports.getMyRecords = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.user._id, deleted: { $ne: true } }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Get all active (non-deleted) records
exports.getAllRecords = async (req, res) => {
  try {
    const { disease, search, reviewed } = req.query;
    let filter = { deleted: { $ne: true } };
    if (disease) filter.disease = { $regex: disease, $options: 'i' };
    if (search) filter.$or = [
      { patientName: { $regex: search, $options: 'i' } },
      { disease: { $regex: search, $options: 'i' } }
    ];
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';

    const records = await Record.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Get all deleted records
exports.getDeletedRecords = async (req, res) => {
  try {
    const records = await Record.find({ deleted: true }).sort({ deletedAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Get single record
exports.getRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Mark as reviewed
exports.reviewRecord = async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      { reviewed: true, reviewedBy: req.user._id, reviewedAt: new Date(), notes: req.body.notes },
      { new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Soft-delete record
exports.deleteRecord = async (req, res) => {
  try {
    await Record.findByIdAndUpdate(req.params.id, {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id
    });
    res.json({ message: 'Record moved to deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Restore a soft-deleted record
exports.restoreRecord = async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      { deleted: false, $unset: { deletedAt: '', deletedBy: '' } },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Permanently delete a record
exports.permanentDelete = async (req, res) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Get stats (exclude deleted)
exports.getStats = async (req, res) => {
  try {
    const base = { deleted: { $ne: true } };
    const total = await Record.countDocuments(base);
    const reviewed = await Record.countDocuments({ ...base, reviewed: true });
    const severe = await Record.countDocuments({ ...base, severity: 'severe' });
    const deletedCount = await Record.countDocuments({ deleted: true });
    const byDisease = await Record.aggregate([
      { $match: base },
      { $group: { _id: '$disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ total, reviewed, severe, pending: total - reviewed, deleted: deletedCount, byDisease });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
