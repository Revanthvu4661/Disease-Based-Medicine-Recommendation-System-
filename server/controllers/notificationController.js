const Notification = require('../models/Notification');

exports.createNotification = async (userId, type, title, message, recordId = null, appointmentId = null) => {
  try {
    return await Notification.create({
      userId,
      type,
      title,
      message,
      recordId,
      appointmentId
    });
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('recordId', 'disease severity')
      .populate('appointmentId', 'reason requestedDate')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ unread: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
