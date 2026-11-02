const express = require("express");
const { protect, requireAdmin, owns } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const Project = require("../models/Project");
const ctrl = require("../controllers/projectController");

const router = express.Router();

/* public */
router.get("/", ctrl.list);
router.get("/:id", validId("id"), ctrl.get);

/* protected — admin only. Ownership is checked on top of the role, so even
   an admin cannot edit a record another author owns. */
router.post("/", protect, requireAdmin, ctrl.create);
router.put("/:id", protect, requireAdmin, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.update);
router.patch("/:id", protect, requireAdmin, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.update);
router.delete("/:id", protect, requireAdmin, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.remove);

module.exports = router;
