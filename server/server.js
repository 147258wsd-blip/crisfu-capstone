require("dotenv").config();
require("express-async-errors");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

/* ---------- security & plumbing ---------- */

/* the API only speaks JSON, so the strict defaults cost us nothing */
app.use(helmet());

/* Vite dev (5173), vite preview (4173) and anything listed in
   CLIENT_ORIGIN are allowed; `*` is the fallback for a fresh deployment
   where the frontend URL is not known yet. Requests with no Origin
   (curl, Postman, server-to-server) always pass. */
const allowlist = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowlist.length || allowlist.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* Render terminates TLS in front of us; trust its proxy header so
   req.protocol and rate-limit style logic behave. */
app.set("trust proxy", 1);

/* ---------- routes ---------- */

/* API responses are per-user and change on every write, so let no cache
   keep a copy. Without this a browser may reuse the ETag and show a
   stale comment thread right after posting one. */
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api", routes);

/* a plain root so hitting the deployed URL in a browser is not a 404 */
app.get("/", (req, res) => {
  res.json({ success: true, message: "Cris Fu API is running.", docs: "/api" });
});

app.use(notFound);
app.use(errorHandler);

/* ---------- boot ---------- */

async function start(port = process.env.PORT || 5000) {
  await connectDB();
  return app.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}/api (${process.env.NODE_ENV || "development"})`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error("[api] failed to start:", err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
