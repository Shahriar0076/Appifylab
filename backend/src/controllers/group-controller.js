const service = require("../services/group-service");
const { broadcast } = require("../realtime");

async function list(req, res) {
  const result = await service.list(req.user.id, req.query.q, req.query.cursor, req.query.limit);
  res.json({ data: { groups: result.items, nextCursor: result.nextCursor } });
}
async function create(req, res) { res.status(201).json({ data: { id: await service.create(req.user.id, req.body, req.file) } }); }
async function details(req, res) { res.json({ data: { group: await service.details(req.params.id, req.user.id, req.query.postsCursor, req.query.postsLimit) } }); }
async function membership(req, res) { const groupId = (await service.resolveGroup(req.params.id)).id; const joined = await service.toggleMembership(groupId, req.user.id); broadcast("group:changed", { type: "membership", groupId }); res.json({ data: { joined } }); }
async function createPost(req, res) { const groupId = (await service.resolveGroup(req.params.id)).id; const post = await service.createPost(groupId, req.user.id, req.body, req.file); broadcast("group:changed", { type: "post.created", groupId, id: post.id }); res.status(201).json({ data: { post } }); }
async function update(req, res) { await service.update(req.params.id, req.user.id, req.body); res.status(204).end(); }
async function role(req, res) { await service.setRole(req.params.id, req.user.id, Number(req.params.userId), req.body.role); res.status(204).end(); }

module.exports = { list, create, details, membership, createPost, update, role };
