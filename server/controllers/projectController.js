const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");
const { readMeta, pick } = require("./helpers");

const FIELDS = ["title", "description", "imageUrl", "repoUrl", "liveUrl"];

/* GET /api/projects — public.
   ?cat= filters on the category stored inside the description payload;
   the public page already filters client-side, this just keeps the API
   honest about the parameter it advertises. */
async function list(req, res) {
  const projects = await Project.find()
    .populate("user", "username email")
    .sort({ createdAt: -1 })
    .lean();

  const cat = req.query.cat;
  const visible = cat && cat !== "All" ? projects.filter((p) => readMeta(p.description).cat === cat) : projects;

  res.json({ success: true, count: visible.length, projects: visible });
}

/* GET /api/projects/:id — public */
async function get(req, res) {
  const project = await Project.findById(req.params.id).populate("user", "username email").lean();
  if (!project) throw ApiError.notFound("No project with that id.");
  res.json({ success: true, project });
}

/* POST /api/projects — protected. The owner is taken from the token,
   never from the body. */
async function create(req, res) {
  const body = pick(req.body, FIELDS);
  if (!body.title || !body.description) {
    throw ApiError.badRequest("A project needs at least a title and a description.");
  }

  const project = await Project.create({ ...body, user: req.user._id });
  await project.populate("user", "username email");

  res.status(201).json({ success: true, project });
}

/* PUT/PATCH /api/projects/:id — protected + ownership (middleware) */
async function update(req, res) {
  const project = req.resource;
  Object.assign(project, pick(req.body, FIELDS));

  await project.save();
  await project.populate("user", "username email");

  res.json({ success: true, project });
}

/* DELETE /api/projects/:id — protected + ownership (middleware) */
async function remove(req, res) {
  const project = req.resource;
  await project.deleteOne();
  res.json({ success: true, message: "Project deleted.", id: String(project._id) });
}

module.exports = { list, get, create, update, remove, FIELDS };
