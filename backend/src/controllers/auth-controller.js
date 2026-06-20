const config = require("../config");
const authService = require("../services/auth-service");

function setAuthCookie(res, token, remember = true) {
  res.cookie("appify_token", token, {
    httpOnly: true,
    sameSite: config.isProduction ? "none" : "lax",
    secure: config.isProduction,
    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined,
  });
}

async function register(req, res) {
  const result = await authService.register(req.body);
  setAuthCookie(res, result.token);
  res.status(201).json({ data: { user: result.user, token: result.token } });
}

async function login(req, res) {
  const result = await authService.login(req.body);
  setAuthCookie(res, result.token, req.body.remember);
  res.json({ data: { user: result.user, token: result.token } });
}

async function google(req, res) {
  const result = await authService.googleLogin(req.body);
  setAuthCookie(res, result.token);
  res.json({ data: { user: result.user, token: result.token } });
}

function me(req, res) {
  res.json({ data: { user: req.user } });
}

function logout(_req, res) {
  res.clearCookie("appify_token", {
    httpOnly: true,
    sameSite: config.isProduction ? "none" : "lax",
    secure: config.isProduction,
  });
  res.status(204).end();
}

module.exports = { register, login, google, me, logout };
