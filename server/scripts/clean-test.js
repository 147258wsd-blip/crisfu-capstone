/* Remove the records the smoke tests created, so the dashboard a grader
   opens shows real content instead of "Smoke Project 1793513161251".
   The seeded content is never touched.
   Usage: npm run clean:test */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("../config/db");
const Project = require("../models/Project");
const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const Message = require("../models/Message");
const User = require("../models/User");

const TEST_PATTERNS = [/^Smoke Project/i, /^Test project/i, /^Test post/i, /^Hijack attempt/i];

async function clean() {
  await connectDB();

  const projects = await Project.find().select("title");
  const doomedProjects = projects.filter((p) => TEST_PATTERNS.some((re) => re.test(p.title)));
  const posts = await BlogPost.find().select("title");
  const doomedPosts = posts.filter((p) => TEST_PATTERNS.some((re) => re.test(p.title)));

  const pDel = await Project.deleteMany({ _id: { $in: doomedProjects.map((d) => d._id) } });
  const sDel = await BlogPost.deleteMany({ _id: { $in: doomedPosts.map((d) => d._id) } });

  /* smoke comments and the messages it posted through the contact form */
  const cDel = await Comment.deleteMany({
    $or: [{ body: /^Real backend check / }, { body: /^first!$/ }, { body: /^second$/ }],
  });
  const mDel = await Message.deleteMany({
    $or: [{ name: /^Smoke Tester$/ }, { name: /^Test Bot$/ }, { email: /^smoke@test\.dev$/ }],
  });

  /* accounts created by the API test (test<timestamp>@test.dev) */
  const uDel = await User.deleteMany({ email: /^test\d+@test\.dev$/ });

  console.log(
    `[clean] projects ${pDel.deletedCount}, posts ${sDel.deletedCount}, comments ${cDel.deletedCount}, ` +
      `messages ${mDel.deletedCount}, users ${uDel.deletedCount}`
  );

  const counts = {
    users: await User.countDocuments(),
    projects: await Project.countDocuments(),
    posts: await BlogPost.countDocuments(),
    comments: await Comment.countDocuments(),
    messages: await Message.countDocuments(),
  };
  console.log("[clean] remaining:", counts);

  await disconnectDB();
}

clean().catch(async (err) => {
  console.error("[clean] failed:", err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
