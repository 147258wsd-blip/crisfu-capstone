const express = require("express");
const { protect, owns } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const Project = require("../models/Project");
const ctrl = require("../controllers/projectController");

const router = express.Router();

/* public */
router.get("/", ctrl.list);
router.get("/:id", validId("id"), ctrl.get);

/* protected — ownership is checked before the controller runs */
router.post("/", protect, ctrl.create);
router.put("/:id", protect, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.update);
router.patch("/:id", protect, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.update);
router.delete("/:id", protect, validId("id"), owns(Project, { field: "user", label: "project" }), ctrl.remove);

module.exports = router;
