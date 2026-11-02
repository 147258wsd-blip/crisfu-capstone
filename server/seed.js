/* Seed the Atlas database with the content the frontend already ships.
   Idempotent: every record is upserted by title, so running it twice does
   not create duplicates. `npm run seed` */

require("dotenv").config();

const path = require("path");
const { connectDB, disconnectDB } = require("./config/db");
const User = require("./models/User");
const Project = require("./models/Project");
const BlogPost = require("./models/BlogPost");
const Comment = require("./models/Comment");
const Message = require("./models/Message");
const Skill = require("./models/Skill");

const data = require("./data/seed.json");

const OWNER = {
  username: process.env.SEED_USERNAME || "crisfu",
  email: process.env.SEED_EMAIL || "cris@crisfu.dev",
  password: process.env.SEED_PASSWORD || "crisfu2026",
};

/* frontend shape -> the columns the spec defines. description and
   content carry the rich payload as JSON, exactly like the browser's
   adapter does, so the public pages lose nothing in the round trip. */
function packProject(p) {
  return {
    title: p.title,
    description: JSON.stringify({
      blurb: p.blurb || "",
      problem: p.problem || "",
      built: p.built || [],
      learned: p.learned || "",
      stack: p.stack || [],
      tags: p.tags || [],
      role: p.role || "",
      timeline: p.timeline || "",
      year: p.year || "",
      cat: p.cat || "Project",
      cover: p.cover || 1,
      coverLabel: p.coverLabel || "Project",
      status: p.status || "live",
      statusNote: p.statusNote || "",
      links: p.links || [],
    }),
    imageUrl: p.imageUrl || "",
    repoUrl: p.source && p.source !== "#" ? p.source : "",
    liveUrl: p.demo && p.demo !== "#" ? p.demo : "",
  };
}

function packPost(p) {
  return {
    title: p.title,
    content: JSON.stringify({
      body: p.body || [],
      excerpt: p.excerpt || "",
      cat: p.cat || "Notes",
      tags: p.tags || [],
      read: p.read || 0,
      status: p.status || "live",
    }),
  };
}

/* stagger the timestamps so "newest first" returns the same order the
   site ships with, instead of reversing it as a bulk insert would */
const backdate = (index, stepDays = 6) => new Date(Date.now() - index * stepDays * 86400000);

async function seed() {
  await connectDB();

  console.log("[seed] target:", path.basename(process.env.MONGODB_URI || "?"));

  let owner = await User.findOne({ email: OWNER.email });
  if (!owner) {
    owner = await User.create(OWNER);
    console.log(`[seed] created owner ${OWNER.email} (password: ${OWNER.password})`);
  } else {
    console.log(`[seed] reusing owner ${OWNER.email}`);
  }

  let created = 0;
  let updated = 0;

  for (const [i, raw] of data.projects.entries()) {
    const doc = { ...packProject(raw), user: owner._id, createdAt: backdate(i) };
    const existed = await Project.findOne({ title: doc.title }).select("_id");
    await Project.findOneAndUpdate(
      { title: doc.title },
      { $set: doc },
      { upsert: true, timestamps: false, setDefaultsOnInsert: true }
    );
    existed ? updated++ : created++;
  }
  console.log(`[seed] projects: ${created} created, ${updated} updated`);

  created = 0;
  updated = 0;
  for (const [i, raw] of data.posts.entries()) {
    const doc = { ...packPost(raw), author: owner._id, createdAt: backdate(i) };
    const existed = await BlogPost.findOne({ title: doc.title }).select("_id");
    await BlogPost.findOneAndUpdate(
      { title: doc.title },
      { $set: doc },
      { upsert: true, timestamps: false, setDefaultsOnInsert: true }
    );
    existed ? updated++ : created++;
  }
  console.log(`[seed] posts: ${created} created, ${updated} updated`);

  /* The toolbox used to be a constant in Home.jsx. It is a collection now,
     so it is upserted by (user, name) — running the seed twice must not
     double the grid. */
  if (Array.isArray(data.skills) && data.skills.length) {
    created = 0;
    updated = 0;
    for (const raw of data.skills) {
      const existed = await Skill.findOne({ user: owner._id, name: raw.name }).select("_id");
      await Skill.findOneAndUpdate(
        { user: owner._id, name: raw.name },
        { $set: { category: raw.category, level: raw.level, order: raw.order || 0, user: owner._id } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      existed ? updated++ : created++;
    }
    console.log(`[seed] skills: ${created} created, ${updated} updated`);
  }

  /* a couple of comments on the newest post, so the blog does not open
     on an empty thread — only inserted when the thread is empty */
  const firstPost = await BlogPost.findOne().sort({ createdAt: -1 });
  if (firstPost && (await Comment.countDocuments({ post: firstPost._id })) === 0) {
    await Comment.create([
      { body: "The single-file constraint is what makes this readable. No build step, no excuses.", author: owner._id, post: firstPost._id },
      { body: "Bookmarked — the scoring rubric is a much better idea than a plain keyword match.", author: owner._id, post: firstPost._id },
    ]);
    console.log("[seed] comments: 2 created");
  }

  if ((await Message.countDocuments()) === 0) {
    await Message.create([
      { name: "Ada L.", email: "ada@example.com", message: "Saw the debate simulator — how did you handle scoring fairness?" },
      { name: "Marco R.", email: "marco@example.com", message: "Would you be open to a short chat about the capstone?" },
    ]);
    console.log("[seed] messages: 2 created");
  }

  const counts = {
    users: await User.countDocuments(),
    projects: await Project.countDocuments(),
    skills: await Skill.countDocuments(),
    posts: await BlogPost.countDocuments(),
    comments: await Comment.countDocuments(),
    messages: await Message.countDocuments(),
  };
  console.log("[seed] done:", counts);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error("[seed] failed:", err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
