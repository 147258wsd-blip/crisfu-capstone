const Project = require("../models/Project");
const Skill = require("../models/Skill");
const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const Message = require("../models/Message");
const { relativeLabel } = require("./helpers");

/* GET /api/admin/stats — protected.
   The dashboard renders five numbers; counting them server-side means
   the browser never has to download every document to add them up. */
async function stats(req, res) {
  const [projects, skills, posts, comments, inbox] = await Promise.all([
    Project.countDocuments(),
    Skill.countDocuments(),
    BlogPost.countDocuments(),
    Comment.countDocuments(),
    Message.countDocuments(),
  ]);

  res.json({ success: true, projects, skills, posts, comments, inbox });
}

/* GET /api/admin/activity — protected.
   A merged feed instead of four separate lists: one query per model,
   sorted in memory, trimmed to the ten newest events. */
async function activity(req, res) {
  const [projects, posts, comments, messages] = await Promise.all([
    Project.find().select("title createdAt").sort({ createdAt: -1 }).limit(6).lean(),
    BlogPost.find().select("title createdAt").sort({ createdAt: -1 }).limit(6).lean(),
    Comment.find().select("body createdAt").sort({ createdAt: -1 }).limit(6).lean(),
    Message.find().select("name createdAt").sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const events = [
    ...projects.map((p) => ({ at: p.createdAt, t: `Project published — ${p.title}` })),
    ...posts.map((p) => ({ at: p.createdAt, t: `New post — ${p.title}` })),
    ...comments.map((c) => ({
      at: c.createdAt,
      t: `Comment — ${String(c.body).slice(0, 60)}${String(c.body).length > 60 ? "…" : ""}`,
    })),
    ...messages.map((m) => ({ at: m.createdAt, t: `Message from ${m.name}` })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 10)
    .map((e) => ({ t: e.t, at: relativeLabel(e.at) }));

  res.json({ success: true, count: events.length, activity: events });
}

module.exports = { stats, activity };
