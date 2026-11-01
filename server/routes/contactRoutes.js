const express = require("express");
const { protect } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const ctrl = require("../controllers/messageController");

const router = express.Router();

router.post("/", ctrl.create);

/* the inbox is admin-only — this is where you prove a submission was saved */
router.get("/", protect, ctrl.list);
router.patch("/:id/read", protect, validId("id"), ctrl.markRead);

module.exports = router;
