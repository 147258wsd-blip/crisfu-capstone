const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

const router = express.Router();

router.use(protect);

router.get("/stats", ctrl.stats);
router.get("/activity", ctrl.activity);

module.exports = router;
