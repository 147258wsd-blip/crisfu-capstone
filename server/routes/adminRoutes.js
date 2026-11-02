const express = require("express");
const { protect, requireAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

const router = express.Router();

/* These numbers describe the whole site, so they are not "your" statistics —
   they belong to the author. Admin only. */
router.use(protect, requireAdmin);

router.get("/stats", ctrl.stats);
router.get("/activity", ctrl.activity);

module.exports = router;
