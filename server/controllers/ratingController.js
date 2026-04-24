const Rating = require('../models/Rating');

exports.createRating = async (req, res) => {
  try {
    const { doctorId, appointmentId, rating, review } = req.body;
    if (!doctorId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid doctor and rating (1-5) required' });
    }

    const existingRating = await Rating.findOne({ doctorId, patientId: req.user._id });
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
      await existingRating.save();
      return res.json(existingRating);
    }

    const newRating = await Rating.create({
      doctorId,
      patientId: req.user._id,
      appointmentId,
      rating,
      review
    });
    res.status(201).json(newRating);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDoctorRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ doctorId: req.params.doctorId }).populate('patientId', 'name');
    const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : 0;
    res.json({ ratings, average: avgRating, count: ratings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ patientId: req.user._id }).populate('doctorId', 'name specialization');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
