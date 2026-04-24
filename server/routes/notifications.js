const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read/all', markAllAsRead);

module.exports = router;
