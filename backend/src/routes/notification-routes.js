const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/notification-controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.patch("/read-all", asyncHandler(controller.readAll));
router.patch("/:id/read", asyncHandler(controller.read));

module.exports = router;
