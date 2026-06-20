const service = require("../services/network-service");

async function people(req, res) {
  const result = await service.people(req.user.id, req.query.q, req.query.limit, req.query.cursor);
  res.json({ data: { people: result.items, nextCursor: result.nextCursor } });
}
async function follow(req, res) { res.json({ data: { isFollowing: await service.toggleFollow(req.user.id, Number(req.params.userId)) } }); }
async function request(req, res) { res.status(201).json({ data: { friendStatus: await service.sendRequest(req.user.id, Number(req.params.userId)) } }); }
async function requests(req, res) {
  const result = await service.requests(req.user.id, req.query.cursor, req.query.limit);
  res.json({ data: { requests: result.items, nextCursor: result.nextCursor } });
}
async function respond(req, res) { await service.respond(req.user.id, Number(req.params.requestId), req.body.status); res.status(204).end(); }
async function friends(req, res) {
  const result = await service.friends(req.user.id, req.query.q, req.query.cursor, req.query.limit);
  res.json({ data: { friends: result.items, nextCursor: result.nextCursor } });
}
async function removeFriend(req, res) { await service.removeFriend(req.user.id, Number(req.params.userId)); res.status(204).end(); }
async function ignore(req, res) { await service.ignore(req.user.id, Number(req.params.userId)); res.status(204).end(); }

module.exports = { people, follow, request, requests, respond, friends, removeFriend, ignore };
