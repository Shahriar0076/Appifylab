const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/network-controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);
router.get("/people", asyncHandler(controller.people));
router.get("/friends", asyncHandler(controller.friends));
router.get("/requests", asyncHandler(controller.requests));
router.post("/people/:userId/follow", asyncHandler(controller.follow));
router.post("/people/:userId/request", asyncHandler(controller.request));
router.delete("/people/:userId/friend", asyncHandler(controller.removeFriend));
router.post("/people/:userId/ignore", asyncHandler(controller.ignore));
router.patch("/requests/:requestId", asyncHandler(controller.respond));

module.exports = router;
