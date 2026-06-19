const service = require("../services/notification-service");

async function list(req, res) {
  res.json({ data: {
    notifications: await service.list(req.user.id, req.query.unread === "true", req.query.limit),
    unreadCount: await service.unreadCount(req.user.id),
  } });
}
async function read(req, res) { await service.markRead(req.user.id, Number(req.params.id)); res.status(204).end(); }
async function readAll(req, res) { await service.markAllRead(req.user.id); res.status(204).end(); }

module.exports = { list, read, readAll };
