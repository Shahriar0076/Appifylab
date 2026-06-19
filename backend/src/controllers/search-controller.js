const service = require("../services/search-service");

async function search(req, res) {
  res.json({ data: await service.search(req.user.id, req.query.q, req.query.limit, req.query.cursor) });
}

module.exports = { search };
