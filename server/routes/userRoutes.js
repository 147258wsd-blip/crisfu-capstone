const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/userController");

const router = express.Router();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", protect, ctrl.me);

module.exports = router;
