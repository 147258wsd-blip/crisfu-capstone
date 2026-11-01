const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const ApiError = require("../utils/ApiError");
const { readMeta, pick } = require("./helpers");

const FIELDS = ["title", "content"];

/* GET /api/blog — public */
async function list(req, res) {
  const posts = await BlogPost.find()
    .populate("author", "username email")
    .sort({ createdAt: -1 })
    .lean();

  const cat = req.query.cat;
  const visible = cat && cat !== "All" ? posts.filter((p) => readMeta(p.content).cat === cat) : posts;

  res.json({ success: true, count: visible.length, posts: visible });
}

/* GET /api/blog/:id — public. Comment count comes along so the detail
   page does not need a second round-trip to show "3 replies". */
async function get(req, res) {
  const post = await BlogPost.findById(req.params.id).populate("author", "username email").lean();
  if (!post) throw ApiError.notFound("No post with that id.");

  const commentCount = await Comment.countDocuments({ post: post._id });
  res.json({ success: true, post: { ...post, commentCount } });
}

/* POST /api/blog — protected */
async function create(req, res) {
  const body = pick(req.body, FIELDS);
  if (!body.title || !body.content) {
    throw ApiError.badRequest("A post needs a title and some content.");
  }

  const post = await BlogPost.create({ ...body, author: req.user._id });
  await post.populate("author", "username email");

  res.status(201).json({ success: true, post });
}

/* PUT/PATCH /api/blog/:id — protected + ownership */
async function update(req, res) {
  const post = req.resource;
  Object.assign(post, pick(req.body, FIELDS));

  await post.save();
  await post.populate("author", "username email");

  res.json({ success: true, post });
}

/* DELETE /api/blog/:id — protected + ownership. Comments go with it,
   otherwise they linger as orphans no page can ever reach. */
async function remove(req, res) {
  const post = req.resource;
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();

  res.json({ success: true, message: "Post deleted.", id: String(post._id) });
}

module.exports = { list, get, create, update, remove, FIELDS };
