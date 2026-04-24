const Record = require('../models/Record');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendRecordReviewedEmail } = require('../services/emailService');

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

// Patient: Get own records (exclude deleted) with optional filters
exports.getMyRecords = async (req, res) => {
  try {
    const { disease, severity, dateFrom, dateTo } = req.query;
    let filter = { patientId: req.user._id, deleted: { $ne: true } };
    if (disease) filter.disease = { $regex: disease, $options: 'i' };
    if (severity) filter.severity = severity;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    const records = await Record.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Get all active (non-deleted) records with filters and pagination
exports.getAllRecords = async (req, res) => {
  try {
    const { disease, search, reviewed, severity, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
    let filter = { deleted: { $ne: true } };
    if (disease) filter.disease = { $regex: disease, $options: 'i' };
    if (search) filter.$or = [
      { patientName: { $regex: search, $options: 'i' } },
      { disease: { $regex: search, $options: 'i' } }
    ];
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';
    if (severity) filter.severity = severity;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Record.countDocuments(filter);
    const records = await Record.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum);

    res.json({ records, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
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

// Doctor: Get single record (exclude deleted)
exports.getRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record || record.deleted) return res.status(404).json({ message: 'Record not found' });
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
    if (record) {
      await createNotification(
        record.patientId,
        'record_reviewed',
        'Your Record Reviewed',
        `Your medical record for ${record.disease} has been reviewed by ${req.user.name}`,
        record._id
      );
      // Send email notification
      await sendRecordReviewedEmail(record.patientEmail, record.patientName, req.user.name, record.disease);
    }
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

// Doctor: Get stats (exclude deleted) — optimized aggregation
exports.getStats = async (req, res) => {
  try {
    const base = { deleted: { $ne: true } };
    const bySeverity = await Record.aggregate([
      { $match: base },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const severityMap = {};
    bySeverity.forEach(doc => {
      severityMap[doc._id || 'unknown'] = doc.count;
    });

    const total = await Record.countDocuments(base);
    const reviewed = await Record.countDocuments({ ...base, reviewed: true });
    const deletedCount = await Record.countDocuments({ deleted: true });
    const byDisease = await Record.aggregate([
      { $match: base },
      { $group: { _id: '$disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({
      total,
      reviewed,
      severe: severityMap.severe || 0,
      pending: total - reviewed,
      deleted: deletedCount,
      bySeverity: severityMap,
      byDisease
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Doctor: Generate prescription PDF (returns HTML for browser printing)
exports.getPrescription = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const medicinesHtml = record.medicines.map(med => `
      <tr>
        <td>${med.name}</td>
        <td>${med.dosage}</td>
        <td>${med.frequency}</td>
        <td>${med.duration}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${record.disease}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .hospital-name { font-size: 24px; font-weight: bold; color: #007bff; }
          .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .info-item { border-left: 4px solid #007bff; padding-left: 10px; }
          .label { font-weight: bold; color: #555; font-size: 12px; }
          .value { font-size: 14px; margin-top: 5px; }
          .disease-section { margin: 30px 0; background: #f0f7ff; padding: 15px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #007bff; color: white; font-weight: bold; }
          tr:nth-child(even) { background: #f9f9f9; }
          .signature-section { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature-line { border-top: 1px solid #333; padding-top: 5px; text-align: center; font-weight: bold; }
          .date { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">🏥 MediRec Hospital</div>
          <div style="color: #666; font-size: 12px; margin-top: 5px;">Medical Recommendation System</div>
        </div>

        <h2>Medical Prescription</h2>

        <div class="patient-info">
          <div class="info-item">
            <div class="label">PATIENT NAME</div>
            <div class="value">${record.patientName}</div>
          </div>
          <div class="info-item">
            <div class="label">EMAIL</div>
            <div class="value">${record.patientEmail}</div>
          </div>
          <div class="info-item">
            <div class="label">AGE / GENDER</div>
            <div class="value">${record.age || 'N/A'} years / ${record.gender || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="label">WEIGHT</div>
            <div class="value">${record.weight || 'N/A'} kg</div>
          </div>
        </div>

        <div class="disease-section">
          <h3 style="margin: 0; color: #007bff;">Diagnosed Condition</h3>
          <p style="margin: 10px 0; font-size: 16px; font-weight: bold;">${record.disease}</p>
          <p style="margin: 5px 0; color: #666; font-size: 12px;">Severity: <span style="font-weight: bold; text-transform: uppercase;">${record.severity}</span></p>
          ${record.description ? `<p style="margin: 10px 0; font-size: 13px;">${record.description}</p>` : ''}
        </div>

        <h3>Prescribed Medicines</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medicinesHtml}
          </tbody>
        </table>

        ${record.precautions && record.precautions.length > 0 ? `
          <h3>Precautions & Instructions</h3>
          <ul style="line-height: 1.8;">
            ${record.precautions.map(p => `<li>${p}</li>`).join('')}
          </ul>
        ` : ''}

        <div class="signature-section">
          <div>
            <div style="color: #666; font-size: 12px; margin-bottom: 30px;">Patient Signature</div>
            <div class="signature-line"></div>
          </div>
          <div>
            <div style="color: #666; font-size: 12px; margin-bottom: 30px;">Doctor Signature</div>
            <div class="signature-line"></div>
          </div>
        </div>

        <div class="date">
          <p>Issued on: ${new Date(record.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 5px 0; color: #999; font-size: 11px;">This prescription is generated by MediRec Hospital system. Please consult with your doctor for any queries.</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Patient: Delete their own record
exports.deleteOwnRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete your own records' });
    }
    await Record.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
