const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/event-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.post("/", upload.single("image"), upload.normalize, asyncHandler(controller.create));
router.get("/:id", asyncHandler(controller.details));
router.post("/:id/attendance", asyncHandler(controller.attend));
router.post("/:id/invite", asyncHandler(controller.invite));

module.exports = router;
