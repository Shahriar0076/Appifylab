const service = require("../services/insight-service");

async function get(req, res) {
  res.json({ data: { insights: await service.get(req.user.id) } });
}

module.exports = { get };
