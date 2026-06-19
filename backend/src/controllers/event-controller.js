const service = require("../services/event-service");

async function list(req, res) { res.json({ data: { events: await service.list(req.user.id, req.query.q) } }); }
async function create(req, res) { res.status(201).json({ data: { id: await service.create(req.user.id, req.body, req.file) } }); }
async function details(req, res) { res.json({ data: { event: await service.details(req.params.id, req.user.id) } }); }
async function attend(req, res) { await service.attend(req.params.id, req.user.id, req.body.status); res.status(204).end(); }
async function invite(req, res) { await service.invite(req.params.id, req.user.id, Number(req.body.userId)); res.status(204).end(); }

module.exports = { list, create, details, attend, invite };
