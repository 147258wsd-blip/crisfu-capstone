/* One-off content upgrade for the six project records.

   Why this exists: every project shipped with repoUrl "#", and the demo
   button on two of them pointed at files that were never deployed. A dead
   button is worse than no button — it tells a reader the work is broken
   rather than unfinished. This script rewrites the six records so that

     - every link is a URL that actually resolves (or is empty)
     - each project says how far it really got (live / prototype / concept)
     - the capstone sits first, because it is the graded artefact

   Idempotent: matched by title, safe to run twice.
   Run: node scripts/upgrade-projects.js
*/

require("dotenv").config();

const path = require("path");
const { connectDB, disconnectDB } = require("../config/db");
const Project = require("../models/Project");

const SITE = "https://147258wsd-blip.github.io/crisfu-capstone";
const REPO = "https://github.com/147258wsd-blip/crisfu-capstone";

/* Newest first. createdAt drives the list order, so the capstone gets the
   freshest timestamp and the rest step back a week at a time. */
const PATCHES = [
  {
    title: "Portfolio & Blog",
    status: "live",
    statusNote:
      "Deployed and testable end to end: register, log in, comment, send the contact form, then read it in the admin inbox. 27 endpoints, 68 automated assertions, all green.",
    demo: `${SITE}/`,
    source: REPO,
    links: [{ label: "API reference", href: `${SITE}/api-docs.html` }],
    role: "Solo — schema, API, client, deployment",
    timeline: "3 weeks · Nov 2026",
    extra: {
      built: [
        "React 18 SPA (Vite) with eight routes, deep links that survive a hard refresh, skeleton and error states on every fetch.",
        "Express REST API on Alibaba Cloud Function Compute: 27 endpoints across users, projects, skills, posts, comments, messages and matches.",
        "MongoDB Atlas via Mongoose — five collections plus skills, populate on reads, cascade delete for comments.",
        "JWT auth with bcrypt hashing, a protect middleware, and owner-only checks on every write route (403 for anyone else).",
        "Admin dashboard: CRUD for projects, posts and skills, an unread inbox, and counters served by one /admin/stats query.",
      ],
    },
  },
  {
    title: "Debate Simulator",
    status: "prototype",
    statusNote:
      "Runs: the single-file build is playable in the browser and the scoring behaves as described. Not a product — no accounts, no server, progress stays in localStorage.",
    demo: `${SITE}/debate-simulator/`,
    source: `${REPO}/blob/main/prototypes/debate-simulator.html`,
    extra: {
      timeline: "2 weeks · Oct 2026",
      role: "Solo — design, logic, scoring",
    },
  },
  {
    title: "Campus Marketplace",
    status: "concept",
    statusNote:
      "Design concept only. The data model and upload flow are thought through; there is no running build, so read the list below as scope rather than finished features.",
    demo: "",
    source: "",
    extra: { timeline: "Concept · 2026" },
  },
  {
    title: "Course Scheduler",
    status: "concept",
    statusNote:
      "Concept only — the grid, the conflict rules and the keyboard fallback are specified, nothing is implemented yet.",
    demo: "",
    source: "",
    extra: { timeline: "Concept · 2026" },
  },
  {
    title: "Screen Time Dashboard",
    status: "concept",
    statusNote:
      "Concept only. The chart ideas exist as sketches; no ingest pipeline or chart has been written.",
    demo: "",
    source: "",
    extra: { timeline: "Concept · 2025" },
  },
  {
    title: "Habit CLI",
    status: "concept",
    statusNote:
      "Concept only — commands and file format are specified, there is no working binary.",
    demo: "",
    source: "",
    extra: { timeline: "Concept · 2025" },
  },
];

async function run() {
  await connectDB();
  console.log("[upgrade] target:", path.basename(process.env.MONGODB_URI || "?"));

  let touched = 0;
  for (let i = 0; i < PATCHES.length; i += 1) {
    const patch = PATCHES[i];
    const doc = await Project.findOne({ title: patch.title });
    if (!doc) {
      console.log(`[upgrade] skip (not found): ${patch.title}`);
      continue;
    }

    let payload = {};
    try {
      payload = JSON.parse(doc.description);
    } catch (e) {
      payload = {};
    }

    const merged = {
      ...payload,
      ...(patch.extra || {}),
      status: patch.status,
      statusNote: patch.statusNote,
      links: patch.links || [],
    };

    await Project.updateOne(
      { _id: doc._id },
      {
        $set: {
          description: JSON.stringify(merged),
          repoUrl: patch.source || "",
          liveUrl: patch.demo || "",
        },
      }
    );
    /* createdAt drives the list order, and Mongoose treats it as immutable
       (timestamps: true silently drops it from $set), so move it through the
       raw collection. The capstone must sit first — it is the graded artefact. */
    await Project.collection.updateOne(
      { _id: doc._id },
      { $set: { createdAt: new Date(Date.now() - i * 6 * 86400000) } }
    );
    touched += 1;
    console.log(
      `[upgrade] ${patch.title.padEnd(24)} ${patch.status.padEnd(10)} repo=${patch.source ? "yes" : "—"}  demo=${patch.demo ? "yes" : "—"}`
    );
  }

  const total = await Project.countDocuments();
  console.log(`[upgrade] updated ${touched} of ${total} projects`);
  await disconnectDB();
}

run().catch(async (err) => {
  console.error("[upgrade] failed:", err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
