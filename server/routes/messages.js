const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listConversations,
  startConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead
} = require('../controllers/messageController');

router.use(protect);
router.get('/', listConversations);
router.post('/', startConversation);
router.get('/:conversationId', getConversationMessages);
router.post('/:conversationId', sendMessage);
router.put('/:conversationId/read', markMessagesAsRead);

module.exports = router;
