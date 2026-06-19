const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/post-controller");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(controller.list));
router.get("/saved", asyncHandler(controller.saved));
router.post("/", upload.single("image"), upload.normalize, asyncHandler(controller.create));
router.patch("/:postId", asyncHandler(controller.update));
router.delete("/:postId", asyncHandler(controller.remove));
router.get("/:postId/comments", asyncHandler(controller.comments));
router.post("/:postId/comments", upload.single("image"), upload.normalize, asyncHandler(controller.comment));
router.patch("/comments/:commentId", asyncHandler(controller.updateComment));
router.delete("/comments/:commentId", asyncHandler(controller.removeComment));
router.post("/comments/:commentId/share", asyncHandler(controller.shareComment));
router.post("/:postId/share", asyncHandler(controller.share));
router.post("/:postId/subscription", asyncHandler(controller.subscription));
router.post("/:postId/save", asyncHandler(controller.save));
router.post("/:postId/hide", asyncHandler(controller.hide));
router.post("/reactions/:targetType/:targetId", asyncHandler(controller.react));

module.exports = router;
