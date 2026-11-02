const express = require("express");
const { protect, owns } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const Skill = require("../models/Skill");
const ctrl = require("../controllers/skillController");

const router = express.Router();

/* public — the toolbox on the home page reads this */
router.get("/", ctrl.list);
router.get("/:id", validId("id"), ctrl.get);

/* protected — ownership is checked before the controller runs */
router.post("/", protect, ctrl.create);
router.put("/:id", protect, validId("id"), owns(Skill, { field: "user", label: "skill" }), ctrl.update);
/* Function Compute's HTTP trigger rejects PATCH at the gateway, so the
   client sends PUT. Both verbs are mounted so the API stays REST-correct
   when it is run somewhere that allows PATCH. */
router.patch("/:id", protect, validId("id"), owns(Skill, { field: "user", label: "skill" }), ctrl.update);
router.delete("/:id", protect, validId("id"), owns(Skill, { field: "user", label: "skill" }), ctrl.remove);

module.exports = router;
