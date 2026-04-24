let io;
const userSockets = new Map();

const initSocketService = (ioInstance) => {
  io = ioInstance;

  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      userSockets.set(userId.toString(), socket.id);
      socket.userId = userId;
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId.toString());
      }
    });
  });
};

const notifyUser = (userId, event, data) => {
  const socketId = userSockets.get(userId.toString());
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

const broadcastToUsers = (userIds, event, data) => {
  userIds.forEach(userId => {
    notifyUser(userId, event, data);
  });
};

module.exports = { initSocketService, notifyUser, broadcastToUsers };
