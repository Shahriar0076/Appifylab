const service = require("../services/profile-service");

async function get(req, res) {
  res.json({ data: { profile: await service.get(req.params.userId, req.user.id) } });
}

async function update(req, res) {
  res.json({ data: { profile: await service.update(req.user.id, req.body, req.files) } });
}

async function posts(req, res) {
  res.json({ data: await service.posts(req.params.userId, req.user.id) });
}

module.exports = { get, update, posts };
