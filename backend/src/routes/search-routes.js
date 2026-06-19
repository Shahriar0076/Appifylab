const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/search-controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.search));

module.exports = router;
