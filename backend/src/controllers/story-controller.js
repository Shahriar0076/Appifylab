const service = require("../services/story-service");

async function list(req, res) { res.json({ data: { stories: await service.list(req.user.id) } }); }
async function create(req, res) { res.status(201).json({ data: { id: await service.create(req.user.id, req.file) } }); }
async function view(req, res) { await service.view(Number(req.params.id), req.user.id); res.status(204).end(); }

module.exports = { list, create, view };
