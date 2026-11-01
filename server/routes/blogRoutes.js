const express = require("express");
const { protect, owns } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const BlogPost = require("../models/BlogPost");
const ctrl = require("../controllers/blogController");
const comments = require("../controllers/commentController");

const router = express.Router();

/* public */
router.get("/", ctrl.list);
router.get("/:id", validId("id"), ctrl.get);

/* comments — listing is public, writing needs a session */
router.get("/:postId/comments", validId("postId"), comments.list);
router.post("/:postId/comments", protect, validId("postId"), comments.create);
router.delete("/:postId/comments/:commentId", protect, validId("postId", "commentId"), comments.remove);

/* protected — ownership is checked before the controller runs */
router.post("/", protect, ctrl.create);
router.put("/:id", protect, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.update);
router.patch("/:id", protect, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.update);
router.delete("/:id", protect, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.remove);

module.exports = router;
