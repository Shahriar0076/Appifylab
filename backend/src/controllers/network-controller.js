const service = require("../services/network-service");

async function people(req, res) { res.json({ data: { people: await service.people(req.user.id, req.query.q, req.query.limit) } }); }
async function follow(req, res) { res.json({ data: { isFollowing: await service.toggleFollow(req.user.id, Number(req.params.userId)) } }); }
async function request(req, res) { res.status(201).json({ data: { friendStatus: await service.sendRequest(req.user.id, Number(req.params.userId)) } }); }
async function requests(req, res) { res.json({ data: { requests: await service.requests(req.user.id) } }); }
async function respond(req, res) { await service.respond(req.user.id, Number(req.params.requestId), req.body.status); res.status(204).end(); }
async function friends(req, res) { res.json({ data: { friends: await service.friends(req.user.id, req.query.q) } }); }
async function removeFriend(req, res) { await service.removeFriend(req.user.id, Number(req.params.userId)); res.status(204).end(); }
async function ignore(req, res) { await service.ignore(req.user.id, Number(req.params.userId)); res.status(204).end(); }

module.exports = { people, follow, request, requests, respond, friends, removeFriend, ignore };
