const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const ApiError = require("../utils/ApiError");

/* GET /api/blog/:postId/comments — public.
   populate("author", "username") is what turns the ref into a name the
   frontend can render; without it every bubble is anonymous. */
async function list(req, res) {
  const post = await BlogPost.exists({ _id: req.params.postId });
  if (!post) throw ApiError.notFound("No post with that id.");

  const comments = await Comment.find({ post: req.params.postId })
    .populate("author", "username email")
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, count: comments.length, comments });
}

/* POST /api/blog/:postId/comments — protected. The author comes from the
   token, so the frontend no longer needs to send a display name. */
async function create(req, res) {
  const body = (req.body && (req.body.body || req.body.text)) || "";
  if (!String(body).trim()) throw ApiError.badRequest("A comment cannot be empty.");

  const post = await BlogPost.exists({ _id: req.params.postId });
  if (!post) throw ApiError.notFound("No post with that id.");

  const comment = await Comment.create({
    body: String(body).trim(),
    author: req.user._id,
    post: req.params.postId,
  });
  await comment.populate("author", "username email");

  res.status(201).json({ success: true, comment });
}

/* DELETE /api/blog/:postId/comments/:commentId — protected.
   Two people may delete: whoever wrote the comment, and whoever wrote
   the post it sits under. */
async function remove(req, res) {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw ApiError.notFound("No comment with that id.");

  const amAuthor = String(comment.author) === String(req.user._id);
  const post = await BlogPost.findById(comment.post).select("author");
  const amPostOwner = post && String(post.author) === String(req.user._id);

  if (!amAuthor && !amPostOwner) {
    throw ApiError.forbidden("You can only delete your own comments.");
  }

  await comment.deleteOne();
  res.json({ success: true, message: "Comment deleted.", id: String(comment._id) });
}

module.exports = { list, create, remove };
