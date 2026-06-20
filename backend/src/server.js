const http = require("node:http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const { setRealtimeServer } = require("./realtime");
const jwt = require("jsonwebtoken");
const db = require("./db");
const eventService = require("./services/event-service");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigin, credentials: true },
});

io.use((socket, next) => {
  (async () => {
    const cookies = Object.fromEntries((socket.handshake.headers.cookie || "").split(";").filter(Boolean).map((part) => {
      const separator = part.indexOf("=");
      return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))];
    }));
    const token = cookies.appify_token || socket.handshake.auth?.token;
    const payload = jwt.verify(token, config.jwtSecret);
    const users = await db.collection("users");
    const user = await users.findOne({ id: Number(payload.sub) });
    if (!user) return next(new Error("Authentication required."));
    socket.userId = user.id;
    next();
  })().catch(() => {
    next(new Error("Authentication required."));
  });
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  io.emit("presence:update", { userId, online: true });
  socket.emit("presence:snapshot", { userIds: [...onlineUsers.keys()] });
  socket.emit("realtime:ready", { connectedAt: new Date().toISOString() });

  socket.on("conversation:join", async (conversationId) => {
    const members = await db.collection("conversation_members");
    const member = await members.findOne({ conversation_id: Number(conversationId), user_id: userId });
    if (member) socket.join(`conversation:${conversationId}`);
  });
  socket.on("typing:start", ({ conversationId }) => socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, typing: true }));
  socket.on("typing:stop", ({ conversationId }) => socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, typing: false }));
  socket.on("disconnect", () => {
    const remaining = (onlineUsers.get(userId) || 1) - 1;
    if (remaining > 0) onlineUsers.set(userId, remaining);
    else {
      onlineUsers.delete(userId);
      io.emit("presence:update", { userId, online: false });
    }
  });
});

setRealtimeServer(io);

db.connect().then(() => {
  eventService.sendDueReminders().catch(console.error);
  setInterval(() => eventService.sendDueReminders().catch(console.error), 15 * 60 * 1000).unref();

  server.listen(config.port, () => {
    console.log(`Appify API and WebSocket server running at http://localhost:${config.port}`);
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
