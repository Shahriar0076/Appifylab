const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/profile-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);
router.patch("/me", upload.fields([{ name: "avatar", maxCount: 1 }, { name: "cover", maxCount: 1 }]), upload.normalize, asyncHandler(controller.update));
router.get("/:userId/posts", asyncHandler(controller.posts));
router.get("/:userId", asyncHandler(controller.get));

module.exports = router;
