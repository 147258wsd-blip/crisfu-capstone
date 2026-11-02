const express = require("express");

const userRoutes = require("./userRoutes");
const projectRoutes = require("./projectRoutes");
const skillRoutes = require("./skillRoutes");
const blogRoutes = require("./blogRoutes");
const contactRoutes = require("./contactRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

/* a flat map of the whole surface — this is what the README documents */
router.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Cris Fu — Capstone API",
    version: "1.0.0",
    endpoints: {
      users: ["POST /api/users/register", "POST /api/users/login", "GET /api/users/me"],
      projects: [
        "GET /api/projects",
        "GET /api/projects/:id",
        "POST /api/projects",
        "PUT /api/projects/:id",
        "DELETE /api/projects/:id",
      ],
      skills: [
        "GET /api/skills",
        "GET /api/skills/:id",
        "POST /api/skills",
        "PUT /api/skills/:id",
        "DELETE /api/skills/:id",
      ],
      blog: [
        "GET /api/blog",
        "GET /api/blog/:id",
        "POST /api/blog",
        "PUT /api/blog/:id",
        "DELETE /api/blog/:id",
      ],
      comments: [
        "GET /api/blog/:postId/comments",
        "POST /api/blog/:postId/comments",
        "DELETE /api/blog/:postId/comments/:commentId",
      ],
      contact: ["POST /api/contact", "GET /api/contact", "PUT /api/contact/:id/read"],
      admin: ["GET /api/admin/stats", "GET /api/admin/activity"],
    },
  });
});

router.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", uptime: Math.round(process.uptime()), at: new Date().toISOString() });
});

router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/skills", skillRoutes);
router.use("/blog", blogRoutes);
router.use("/contact", contactRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
