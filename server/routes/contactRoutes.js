const express = require("express");
const { protect, requireAdmin } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const ctrl = require("../controllers/messageController");

const router = express.Router();

/* public — anyone can send a message */
router.post("/", ctrl.create);

/* the inbox is admin-only: these are other people's names, addresses and
   private text, so a session alone is not enough proof the caller may read
   them. A `member` account gets 403 here. */
router.get("/", protect, requireAdmin, ctrl.list);
/* PUT and PATCH both mark a message read. The deployed Function Compute HTTP
   trigger rejects PATCH at the gateway (403, before Express sees it), so the
   client sends PUT; PATCH stays for API clients that reach Express directly. */
router.put("/:id/read", protect, requireAdmin, validId("id"), ctrl.markRead);
router.patch("/:id/read", protect, requireAdmin, validId("id"), ctrl.markRead);

module.exports = router;
