const express = require("express");
const { protect } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const ctrl = require("../controllers/messageController");

const router = express.Router();

router.post("/", ctrl.create);

/* the inbox is admin-only — this is where you prove a submission was saved */
router.get("/", protect, ctrl.list);
/* PUT and PATCH both mark a message read. The deployed Function Compute HTTP
   trigger rejects PATCH at the gateway (403, before Express sees it), so the
   client sends PUT; PATCH stays for API clients that reach Express directly. */
router.put("/:id/read", protect, validId("id"), ctrl.markRead);
router.patch("/:id/read", protect, validId("id"), ctrl.markRead);

module.exports = router;
