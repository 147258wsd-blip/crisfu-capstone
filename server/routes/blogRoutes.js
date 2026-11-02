const express = require("express");
const { protect, requireAdmin, owns } = require("../middleware/auth");
const { validId } = require("../middleware/validate");
const BlogPost = require("../models/BlogPost");
const ctrl = require("../controllers/blogController");
const comments = require("../controllers/commentController");

const router = express.Router();

/* public */
router.get("/", ctrl.list);
router.get("/:id", validId("id"), ctrl.get);

/* comments — listing is public, writing needs a session. Commenting is the
   one write a signed-in reader is allowed to make; the author is taken from
   the token, never from the body. */
router.get("/:postId/comments", validId("postId"), comments.list);
router.post("/:postId/comments", protect, validId("postId"), comments.create);
router.delete("/:postId/comments/:commentId", protect, validId("postId", "commentId"), comments.remove);

/* posts — admin only, then ownership */
router.post("/", protect, requireAdmin, ctrl.create);
router.put("/:id", protect, requireAdmin, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.update);
router.patch("/:id", protect, requireAdmin, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.update);
router.delete("/:id", protect, requireAdmin, validId("id"), owns(BlogPost, { field: "author", label: "post" }), ctrl.remove);

module.exports = router;
