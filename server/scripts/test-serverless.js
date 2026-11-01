/**
 * Verifies the Vercel serverless wrapper without deploying.
 *
 * Vercel calls a Node function as `fn(req, res)` and keeps the original URL in
 * `req.url`. This harness reproduces exactly that: a bare `http.createServer`
 * whose callback picks the same handler file Vercel would pick, then hands it
 * the untouched request. If Express answers correctly here, the only thing
 * left to trust on the platform is its routing table.
 *
 * It also proves the connection cache works — the second request must reuse
 * the first one's Mongo connection instead of dialling Atlas again.
 *
 *   npm run test:serverless
 */

require("dotenv").config();
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const http = require("http");
const path = require("path");
const mongoose = require("mongoose");

const indexHandler = require(path.join(__dirname, "..", "api", "index.js"));
const slugHandler = require(path.join(__dirname, "..", "api", "[...slug].js"));

/* Vercel's file router: /api -> api/index.js, /api/** -> api/[...slug].js */
const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];
  const handler = pathname === "/api" || pathname === "/api/" ? indexHandler : slugHandler;
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error("[harness] handler threw:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, message: err.message }));
  });
});

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.log(`  FAIL ${name} — ${err.message}`);
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log(`\nserverless harness on ${base}\n`);

  const login = () =>
    fetch(`${base}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cris@crisfu.dev", password: "crisfu2026" }),
    });

  await check("GET /api/health -> 200 ok", async () => {
    const r = await fetch(`${base}/api/health`);
    eq(r.status, 200, "status");
    const body = await r.json();
    eq(body.status, "ok", "body.status");
  });

  await check("GET /api -> 200 endpoint map", async () => {
    const r = await fetch(`${base}/api`);
    eq(r.status, 200, "status");
    const body = await r.json();
    if (!body.endpoints || !body.endpoints.projects) throw new Error("endpoint map missing");
    eq(body.endpoints.projects.length, 5, "projects endpoint count");
  });

  await check("GET /api/projects -> 200 non-empty list", async () => {
    const r = await fetch(`${base}/api/projects`);
    eq(r.status, 200, "status");
    const body = await r.json();
    if (!Array.isArray(body.projects)) throw new Error(`expected projects[], got ${typeof body.projects}`);
    if (body.projects.length < 6) throw new Error(`expected seeded projects, got ${body.projects.length}`);
  });

  await check("GET /api/blog -> 200 non-empty list", async () => {
    const r = await fetch(`${base}/api/blog`);
    eq(r.status, 200, "status");
    const body = await r.json();
    if (!Array.isArray(body.posts) || body.posts.length < 5) throw new Error("seeded posts missing");
  });

  let token = "";
  await check("POST /api/users/login -> 200 + token", async () => {
    const r = await login();
    eq(r.status, 200, "status");
    const body = await r.json();
    if (!body.token) throw new Error("no token in response");
    token = body.token;
  });

  await check("POST /api/users/login wrong password -> 401", async () => {
    const r = await fetch(`${base}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cris@crisfu.dev", password: "definitely-wrong" }),
    });
    eq(r.status, 401, "status");
  });

  await check("GET /api/users/me with token -> 200 owner", async () => {
    const r = await fetch(`${base}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    eq(r.status, 200, "status");
    const body = await r.json();
    const user = body.data || body.user || body;
    eq(user.email, "cris@crisfu.dev", "email");
  });

  await check("GET /api/users/me without token -> 401", async () => {
    const r = await fetch(`${base}/api/users/me`);
    eq(r.status, 401, "status");
  });

  await check("GET /api/unknown -> 404 JSON", async () => {
    const r = await fetch(`${base}/api/unknown`);
    eq(r.status, 404, "status");
    const body = await r.json();
    eq(body.success, false, "body.success");
  });

  await check("error shape is { success:false, message }", async () => {
    const r = await fetch(`${base}/api/users/me`);
    const body = await r.json();
    if (typeof body.message !== "string" || !body.message) throw new Error("message missing");
  });

  await check("second request reuses the cached connection", async () => {
    if (global.__cfDbState !== "ready") throw new Error("connection cache not set");
    const before = mongoose.connection.readyState;
    await fetch(`${base}/api/health`);
    eq(mongoose.connection.readyState, before, "readyState drifted");
    eq(global.__cfDbState, "ready", "cache flag");
  });

  await check("parallel requests all succeed", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => fetch(`${base}/api/projects`).then((r) => r.status))
    );
    const bad = results.filter((s) => s !== 200);
    if (bad.length) throw new Error(`statuses: ${results.join(",")}`);
  });

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
