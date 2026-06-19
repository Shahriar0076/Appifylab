const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/message-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/attachment-upload");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.get("/:id/messages", asyncHandler(controller.messages));
router.post("/:id/messages", upload.single("attachment"), upload.normalize, asyncHandler(controller.send));

module.exports = router;
