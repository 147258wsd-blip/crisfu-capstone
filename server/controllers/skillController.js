const Skill = require("../models/Skill");
const ApiError = require("../utils/ApiError");
const { pick } = require("./helpers");

const FIELDS = ["name", "category", "level", "order"];

/* GET /api/skills — public.
   ?category=Frontend narrows the list, ?minLevel=4 drops the weaker ones.
   Both are plain filters on indexed fields, so the endpoint stays useful
   to a client that only wants one column of the toolbox. */
async function list(req, res) {
  const query = {};

  if (req.query.category && req.query.category !== "All") {
    query.category = req.query.category;
  }

  const minLevel = Number(req.query.minLevel);
  if (Number.isFinite(minLevel) && minLevel > 0) {
    query.level = { $gte: minLevel };
  }

  const skills = await Skill.find(query).populate("user", "username email").sort({ category: 1, order: 1, name: 1 }).lean();

  res.json({ success: true, count: skills.length, skills });
}

/* GET /api/skills/:id — public */
async function get(req, res) {
  const skill = await Skill.findById(req.params.id).populate("user", "username email").lean();
  if (!skill) throw ApiError.notFound("No skill with that id.");
  res.json({ success: true, skill });
}

/* POST /api/skills — protected. The owner comes from the token, never
   from the body, so a client cannot plant a skill on someone else. */
async function create(req, res) {
  const body = pick(req.body, FIELDS);
  if (!body.name || !String(body.name).trim()) {
    throw ApiError.badRequest("A skill needs a name.");
  }

  const skill = await Skill.create({ ...body, user: req.user._id });
  await skill.populate("user", "username email");

  res.status(201).json({ success: true, skill });
}

/* PUT/PATCH /api/skills/:id — protected + ownership (middleware) */
async function update(req, res) {
  const skill = req.resource;
  Object.assign(skill, pick(req.body, FIELDS));

  await skill.save();
  await skill.populate("user", "username email");

  res.json({ success: true, skill });
}

/* DELETE /api/skills/:id — protected + ownership (middleware) */
async function remove(req, res) {
  const skill = req.resource;
  await skill.deleteOne();
  res.json({ success: true, message: "Skill deleted.", id: String(skill._id) });
}

module.exports = { list, get, create, update, remove, FIELDS };
