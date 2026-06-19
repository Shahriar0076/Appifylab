const service = require("../services/message-service");

async function list(req, res) { res.json({ data: { conversations: await service.list(req.user.id) } }); }
async function create(req, res) { res.status(201).json({ data: { id: await service.getOrCreate(req.user.id, Number(req.body.userId)) } }); }
async function messages(req, res) { res.json({ data: { messages: await service.messages(Number(req.params.id), req.user.id, req.query.before ? Number(req.query.before) : null) } }); }
async function send(req, res) { res.status(201).json({ data: { id: await service.send(Number(req.params.id), req.user.id, req.body, req.file) } }); }

module.exports = { list, create, messages, send };
