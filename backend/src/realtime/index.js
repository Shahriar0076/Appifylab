let io;

function setRealtimeServer(server) {
  io = server;
}

function broadcast(event, payload) {
  io?.emit(event, payload);
}

function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setRealtimeServer, broadcast, emitToUser };
