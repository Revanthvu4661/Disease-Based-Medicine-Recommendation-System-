const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'name role')
      .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.startConversation = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient and content required' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId]
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content
    });

    await Conversation.updateOne(
      { _id: conversation._id },
      { lastMessage: content, lastMessageAt: new Date() }
    );

    res.status(201).json({ conversation, message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const message = await Message.create({
      conversationId,
      senderId: req.user._id,
      content
    });

    await Conversation.updateOne(
      { _id: conversationId },
      { lastMessage: content, lastMessageAt: new Date() }
    );

    const populated = await message.populate('senderId', 'name role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Message.updateMany(
      { conversationId, 'readBy': { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
