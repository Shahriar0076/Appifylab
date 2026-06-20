const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../db");
const HttpError = require("../utils/http-error");
const { publicUser } = require("../utils/presenters");

async function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const token = req.cookies.appify_token || bearerToken;
  if (!token) return next(new HttpError(401, "Authentication required."));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const users = await db.collection("users");
    const user = await users.findOne({ id: Number(payload.sub) });
    if (!user) return next(new HttpError(401, "Session is no longer valid."));
    req.user = publicUser(user);
    next();
  } catch {
    next(new HttpError(401, "Session is invalid or expired."));
  }
}

module.exports = { requireAuth };
