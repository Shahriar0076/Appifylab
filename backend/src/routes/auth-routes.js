const express = require("express");
const rateLimit = require("express-rate-limit");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/auth-controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true });

router.post("/register", authLimiter, asyncHandler(controller.register));
router.post("/login", authLimiter, asyncHandler(controller.login));
router.post("/google", authLimiter, asyncHandler(controller.google));
router.get("/me", requireAuth, asyncHandler(controller.me));
router.post("/logout", requireAuth, asyncHandler(controller.logout));

module.exports = router;
