const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/group-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.post("/", upload.single("image"), upload.normalize, asyncHandler(controller.create));
router.get("/:id", asyncHandler(controller.details));
router.patch("/:id", asyncHandler(controller.update));
router.post("/:id/membership", asyncHandler(controller.membership));
router.post("/:id/posts", upload.single("image"), upload.normalize, asyncHandler(controller.createPost));
router.patch("/:id/members/:userId/role", asyncHandler(controller.role));

module.exports = router;
