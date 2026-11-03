/* Exercise all five models against the real Atlas database:
   create -> validate -> populate -> delete. Leaves no residue. */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/db");

const User = require("../models/User");
const Project = require("../models/Project");
const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const Message = require("../models/Message");

const TAG = "__selftest__";
let failed = 0;

function ok(label, cond, extra = "") {
  if (cond) console.log(`PASS  ${label}${extra ? "  " + extra : ""}`);
  else {
    failed++;
    console.log(`FAIL  ${label}  ${extra}`);
  }
}

(async () => {
  await connectDB();

  /* --- clean any leftovers from a previous run --- */
  const oldUser = await User.findOne({ username: TAG });
  if (oldUser) {
    const oldPosts = await BlogPost.find({ author: oldUser._id }).select("_id");
    await Comment.deleteMany({ post: { $in: oldPosts.map((p) => p._id) } });
    await BlogPost.deleteMany({ author: oldUser._id });
    await Project.deleteMany({ user: oldUser._id });
    await User.deleteOne({ _id: oldUser._id });
  }

  /* --- User --- */
  const user = await User.create({
    username: TAG,
    email: "selftest@example.com",
    password: "secret123",
  });
  ok("user created", !!user._id, user._id.toString());

  const stored = await User.findById(user._id).select("+password");
  ok("password hashed (60-char bcrypt)", /^\$2[aby]\$/.test(stored.password), stored.password.slice(0, 7) + "...");
  ok("correct password verifies", await stored.comparePassword("secret123"));
  ok("wrong password rejected", !(await stored.comparePassword("wrong")));

  const plain = await User.findById(user._id);
  ok("password is not returned by default", plain.password === undefined);

  let dupErr = null;
  try {
    await User.create({ username: TAG, email: "other@example.com", password: "secret123" });
  } catch (e) {
    dupErr = e;
  }
  ok("username unique index enforced", dupErr && dupErr.code === 11000);

  let shortErr = null;
  try {
    await User.create({ username: TAG + "2", email: "short@example.com", password: "123" });
  } catch (e) {
    shortErr = e;
  }
  ok("short password rejected by validation", !!shortErr);

  /* --- Project --- */
  const project = await Project.create({
    title: "Self test project",
    description: JSON.stringify({ blurb: "hello", tags: ["a"] }),
    imageUrl: "/shots/campus.svg",
    repoUrl: "https://github.com/x/y",
    liveUrl: "https://example.com",
    user: user._id,
  });
  ok("project created", !!project._id);

  const populated = await Project.findById(project._id).populate("user", "username");
  ok("Project.populate(user) brings back username", populated.user && populated.user.username === TAG,
     populated.user ? populated.user.username : "(null)");

  let reqErr = null;
  try {
    await Project.create({ title: "no owner", description: "x" });
  } catch (e) {
    reqErr = e;
  }
  ok("project without a user is rejected", !!reqErr);

  /* --- BlogPost + Comment --- */
  const post = await BlogPost.create({
    title: "Self test post",
    content: JSON.stringify({ body: [{ type: "p", text: "hi" }] }),
    author: user._id,
  });
  ok("post created", !!post._id);

  const comment = await Comment.create({ body: "nice post", author: user._id, post: post._id });
  ok("comment created", !!comment._id);

  const withAuthor = await Comment.findById(comment._id).populate("author", "username");
  ok("Comment.populate(author) brings back username", withAuthor.author && withAuthor.author.username === TAG);

  const commentsOfPost = await Comment.find({ post: post._id }).populate("author", "username");
  ok("comments queryable by post", commentsOfPost.length === 1, `${commentsOfPost.length} found`);

  /* --- Message --- */
  const msg = await Message.create({ name: "Visitor", email: "v@example.com", message: "Hello there" });
  ok("message created", !!msg._id && msg.read === false);
  await Message.deleteOne({ _id: msg._id });

  /* --- cleanup --- */
  await Comment.deleteMany({ post: post._id });
  await BlogPost.deleteOne({ _id: post._id });
  await Project.deleteOne({ _id: project._id });
  await User.deleteOne({ _id: user._id });

  const residue = await Promise.all([
    User.countDocuments({ username: TAG }),
    Project.countDocuments({ title: "Self test project" }),
    BlogPost.countDocuments({ title: "Self test post" }),
  ]);
  ok("test data cleaned up", residue.every((n) => n === 0), residue.join("/"));

  const indexes = await Project.collection.indexes();
  console.log("      Project indexes:", indexes.map((i) => i.name).join(", "));

  await disconnectDB();
  console.log(failed === 0 ? "\nDONE  all five models work" : `\nFAILED  ${failed} check(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(async (err) => {
  console.error("ERROR", err.message);
  try {
    await disconnectDB();
  } catch (e) {
    /* ignore */
  }
  process.exit(1);
});
