const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/story-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.post("/", upload.single("image"), upload.normalize, asyncHandler(controller.create));
router.post("/:id/view", asyncHandler(controller.view));

module.exports = router;
