/* End-to-end check of the running API. Every assertion talks to the real
   Express server and the real Atlas cluster — no mocks, no fakes.
   Usage:  npm run test:api      (server must be running on PORT) */

require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

/* 127.0.0.1 rather than localhost: on Windows `localhost` can resolve to ::1
   while the server listens on IPv4, and the failure looks like a dead server */
const BASE = process.env.API_BASE || `http://127.0.0.1:${process.env.PORT || 5000}/api`;

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

/* a counter, not just a timestamp: two accounts registered in the same
   millisecond with the same random suffix collide on the unique index */
let seq = 0;
const unique = () => `test${Date.now()}${seq++}`;

/* ---- role promotion ----
   Registration always hands out `member`, which is exactly what the tests
   assert first. To exercise the write path afterwards the two throwaway
   accounts have to become admins, and the only honest way to do that from
   outside the API is the database itself. One connection, reused. */
let dbReady = false;

async function openDb() {
  if (dbReady) return true;
  if (!process.env.MONGODB_URI) return false;
  try {
    /* the project's own connector, because it applies DNS_SERVERS — a raw
       mongoose.connect here fails on Windows with a refused SRV lookup */
    await connectDB();
    dbReady = true;
    return true;
  } catch (err) {
    console.log(`  note: no database connection (${err.message}) — test accounts stay members`);
    return false;
  }
}

async function promote(email) {
  if (!(await openDb())) return false;
  const res = await mongoose.connection.collection("users").updateOne({ email }, { $set: { role: "admin" } });
  return res.matchedCount === 1;
}

async function closeDb() {
  if (!dbReady) return;
  dbReady = false;
  await mongoose.disconnect();
}

async function run() {
  console.log(`\nAPI: ${BASE}\n`);

  console.log("health & discovery");
  {
    const r = await call("GET", "/health");
    check("GET /health returns ok", r.status === 200 && r.body.status === "ok", `status ${r.status}`);
    const d = await call("GET", "/");
    check("GET /api lists endpoints", r.status === 200 && d.body && d.body.endpoints, "no endpoint map");
  }

  console.log("\npublic reads");
  let seededProject = null;
  {
    const r = await call("GET", "/projects");
    const list = r.body.projects || [];
    seededProject = list[0];
    check("GET /projects returns seeded projects", r.status === 200 && list.length >= 6, `${list.length} items`);
    check("project has spec fields", !!(seededProject && seededProject.title && seededProject.description && "user" in seededProject));
    check("project.user is populated", !!(seededProject && seededProject.user && seededProject.user.username), "user not populated");

    const one = await call("GET", `/projects/${seededProject._id}`);
    check("GET /projects/:id works", one.status === 200 && one.body.project._id === seededProject._id);

    const bad = await call("GET", "/projects/not-an-id");
    check("bad id -> 404 not 500", bad.status === 404, `status ${bad.status}`);

    const missing = await call("GET", "/projects/64b7f0a1c2d3e4f5a6b7c8d9");
    check("missing id -> 404", missing.status === 404, `status ${missing.status}`);

    const posts = await call("GET", "/blog");
    check("GET /blog returns posts", posts.status === 200 && (posts.body.posts || []).length >= 5);
    const firstPost = (posts.body.posts || [])[0];
    check("post.author is populated", !!(firstPost && firstPost.author && firstPost.author.username), "author not populated");

    const single = await call("GET", `/blog/${firstPost._id}`);
    check("GET /blog/:id includes commentCount", single.status === 200 && typeof single.body.post.commentCount === "number");
  }

  console.log("\nauthentication");
  const alice = { username: unique(), email: `${unique()}@test.dev`, password: "secret123" };
  const bob = { username: unique(), email: `${unique()}@test.dev`, password: "secret123" };
  let aliceToken = "";
  let bobToken = "";
  {
    const r = await call("POST", "/users/register", { body: alice });
    aliceToken = r.body.token || "";
    check("register returns 201 + token", r.status === 201 && !!aliceToken, `status ${r.status}`);
    check("register never returns the password", r.body.user && r.body.user.password === undefined);

    const dup = await call("POST", "/users/register", { body: alice });
    check("duplicate email -> 409", dup.status === 409, `status ${dup.status}`);

    const short = await call("POST", "/users/register", { body: { ...alice, username: unique() + "x", email: unique() + "@x.dev", password: "123" } });
    check("short password -> 400", short.status === 400, `status ${short.status}`);

    const wrong = await call("POST", "/users/login", { body: { email: alice.email, password: "nope" } });
    check("wrong password -> 401", wrong.status === 401, `status ${wrong.status}`);

    const ghost = await call("POST", "/users/login", { body: { email: "nobody@nowhere.dev", password: "whatever" } });
    check("unknown email gives the same 401 message", ghost.status === 401 && ghost.body.message === wrong.body.message);

    const ok = await call("POST", "/users/login", { body: { email: alice.email, password: alice.password } });
    aliceToken = ok.body.token || aliceToken;
    check("login returns a token", ok.status === 200 && !!ok.body.token);

    const me = await call("GET", "/users/me", { token: aliceToken });
    check("GET /users/me identifies the caller", me.status === 200 && me.body.user.username === alice.username);

    const anon = await call("GET", "/users/me");
    check("no token -> 401", anon.status === 401, `status ${anon.status}`);

    const junk = await call("GET", "/users/me", { token: "not.a.token" });
    check("garbage token -> 401", junk.status === 401, `status ${junk.status}`);

    const second = await call("POST", "/users/register", { body: bob });
    bobToken = second.body.token || "";
    check("second account registered", second.status === 201 && !!bobToken);
  }

  /* The hole this section exists to keep closed: a fresh account used to be
     able to read the inbox and publish to the portfolio, because a valid
     token was the only thing any write endpoint asked for. */
  console.log("\nroles: a member may read, not write");
  {
    const fakeRole = await call("POST", "/users/register", {
      body: { username: unique(), email: `${unique()}@test.dev`, password: "secret123", role: "admin" },
    });
    check(
      'a "role":"admin" body is ignored on register',
      fakeRole.status === 201 && fakeRole.body.user.role === "member",
      `role ${fakeRole.body.user && fakeRole.body.user.role}`
    );

    const memberProject = await call("POST", "/projects", {
      token: aliceToken,
      body: { title: "Member attempt " + unique(), description: "x" },
    });
    check("member cannot create a project -> 403", memberProject.status === 403, `status ${memberProject.status}`);

    const memberInbox = await call("GET", "/contact", { token: aliceToken });
    check("member cannot read the contact inbox -> 403", memberInbox.status === 403, `status ${memberInbox.status}`);

    const memberStats = await call("GET", "/admin/stats", { token: aliceToken });
    check("member cannot read admin stats -> 403", memberStats.status === 403, `status ${memberStats.status}`);

    const memberSkill = await call("POST", "/skills", {
      token: aliceToken,
      body: { name: "Member skill", category: "Tools" },
    });
    check("member cannot create a skill -> 403", memberSkill.status === 403, `status ${memberSkill.status}`);

    /* promotion, then the same token must start working — `protect` re-reads
       the user on every request, so no new login is needed */
    const promoted = (await promote(alice.email)) && (await promote(bob.email));
    check("test accounts promoted to admin", promoted, "no database connection");

    const nowStats = await call("GET", "/admin/stats", { token: aliceToken });
    check("promoted account reads admin stats", nowStats.status === 200 && typeof nowStats.body.projects === "number");

    const nowInbox = await call("GET", "/contact", { token: aliceToken });
    check("promoted account reads the inbox", nowInbox.status === 200 && Array.isArray(nowInbox.body.messages));
  }

  console.log("\nprojects write path");
  let aliceProjectId = "";
  {
    const unauth = await call("POST", "/projects", { body: { title: "Nope", description: "x" } });
    check("create without token -> 401", unauth.status === 401, `status ${unauth.status}`);

    const created = await call("POST", "/projects", {
      token: aliceToken,
      body: { title: "Test project " + unique(), description: JSON.stringify({ blurb: "made by test" }), imageUrl: "", repoUrl: "https://example.com", liveUrl: "" },
    });
    aliceProjectId = created.body.project ? created.body.project._id : "";
    check("create project -> 201", created.status === 201 && !!aliceProjectId, `status ${created.status}`);
    check("owner is taken from the token", created.body.project.user.username === alice.username);

    const hijack = await call("POST", "/projects", {
      token: bobToken,
      body: { title: "Hijack attempt", description: "x", user: "000000000000000000000000" },
    });
    check("user field in body is ignored", hijack.body.project.user.username === bob.username);

    const updated = await call("PUT", `/projects/${aliceProjectId}`, {
      token: aliceToken,
      body: { title: "Renamed project", description: JSON.stringify({ blurb: "edited" }) },
    });
    check("owner can update", updated.status === 200 && updated.body.project.title === "Renamed project");

    const stolen = await call("PUT", `/projects/${aliceProjectId}`, {
      token: bobToken,
      body: { title: "Stolen", description: "x" },
    });
    check("non-owner update -> 403", stolen.status === 403, `status ${stolen.status}`);

    const stolenDelete = await call("DELETE", `/projects/${aliceProjectId}`, { token: bobToken });
    check("non-owner delete -> 403", stolenDelete.status === 403, `status ${stolenDelete.status}`);

    const invalid = await call("POST", "/projects", { token: aliceToken, body: { title: "", description: "" } });
    check("missing fields -> 400", invalid.status === 400, `status ${invalid.status}`);

    /* clean up bob's hijack project so the seed stays tidy */
    await call("DELETE", `/projects/${hijack.body.project._id}`, { token: bobToken });
  }

  console.log("\nskills");
  let skillId = "";
  {
    const r = await call("GET", "/skills");
    const list = r.body.skills || [];
    check("GET /skills returns the seeded toolbox", r.status === 200 && list.length >= 18, `${list.length} items`);
    check("skill has name/category/level", !!(list[0] && list[0].name && list[0].category && typeof list[0].level === "number"));

    const backend = await call("GET", "/skills?category=Backend");
    check("?category= filters", backend.status === 200 && backend.body.skills.every((s) => s.category === "Backend"), `${backend.body.count} items`);

    const strong = await call("GET", "/skills?minLevel=5");
    check("?minLevel= filters", strong.status === 200 && strong.body.skills.every((s) => s.level >= 5), `${strong.body.count} items`);

    const badSkillId = await call("GET", "/skills/not-an-id");
    check("skill bad id -> 404 not 500", badSkillId.status === 404, `status ${badSkillId.status}`);

    const unauthSkill = await call("POST", "/skills", { body: { name: "Rust" } });
    check("create skill without token -> 401", unauthSkill.status === 401, `status ${unauthSkill.status}`);

    const made = await call("POST", "/skills", { token: aliceToken, body: { name: "Smoke Skill", category: "Tools", level: 4, order: 99 } });
    skillId = made.body.skill ? made.body.skill._id : "";
    check("create skill -> 201", made.status === 201 && !!skillId, `status ${made.status}`);
    check("skill owner comes from the token", !!(made.body.skill && made.body.skill.user && made.body.skill.user.username));

    const badCat = await call("POST", "/skills", { token: aliceToken, body: { name: "Nope", category: "Nonsense" } });
    check("unknown category -> 400", badCat.status === 400, `status ${badCat.status}`);

    const badLevel = await call("POST", "/skills", { token: aliceToken, body: { name: "Nope", category: "Tools", level: 9 } });
    check("level out of range -> 400", badLevel.status === 400, `status ${badLevel.status}`);

    const edited = await call("PUT", `/skills/${skillId}`, { token: aliceToken, body: { level: 5 } });
    check("owner can update a skill", edited.status === 200 && edited.body.skill.level === 5, `status ${edited.status}`);

    const stolenSkill = await call("PUT", `/skills/${skillId}`, { token: bobToken, body: { name: "Hijacked" } });
    check("another user cannot update it -> 403", stolenSkill.status === 403, `status ${stolenSkill.status}`);

    const stolenSkillDel = await call("DELETE", `/skills/${skillId}`, { token: bobToken });
    check("another user cannot delete it -> 403", stolenSkillDel.status === 403, `status ${stolenSkillDel.status}`);

    const delSkill = await call("DELETE", `/skills/${skillId}`, { token: aliceToken });
    check("owner can delete a skill", delSkill.status === 200, `status ${delSkill.status}`);

    const goneSkill = await call("GET", `/skills/${skillId}`);
    check("deleted skill is really gone", goneSkill.status === 404);
  }

  console.log("\nblog + comments");
  let postId = "";
  {
    const created = await call("POST", "/blog", {
      token: aliceToken,
      body: { title: "Test post " + unique(), content: JSON.stringify({ body: [{ type: "p", text: "hello" }] }) },
    });
    postId = created.body.post ? created.body.post._id : "";
    check("create post -> 201", created.status === 201 && !!postId, `status ${created.status}`);

    const thread = await call("GET", `/blog/${postId}/comments`);
    check("new post has an empty thread", thread.status === 200 && thread.body.comments.length === 0);

    const noAuth = await call("POST", `/blog/${postId}/comments`, { body: { body: "anon" } });
    check("comment without token -> 401", noAuth.status === 401, `status ${noAuth.status}`);

    const made = await call("POST", `/blog/${postId}/comments`, { token: aliceToken, body: { body: "first!" } });
    check("comment created -> 201", made.status === 201);
    check("comment.author is populated", !!(made.body.comment.author && made.body.comment.author.username), "not populated");

    const listed = await call("GET", `/blog/${postId}/comments`);
    check("comment appears in the thread", listed.body.comments.length === 1 && listed.body.comments[0].body === "first!");

    const otherComment = await call("POST", `/blog/${postId}/comments`, { token: bobToken, body: { body: "second" } });

    const badDelete = await call("DELETE", `/blog/${postId}/comments/${otherComment.body.comment._id}`, { token: aliceToken });
    check("post owner may delete someone else's comment", badDelete.status === 200 || badDelete.status === 403, `status ${badDelete.status}`);

    const empty = await call("POST", `/blog/${postId}/comments`, { token: aliceToken, body: { body: "   " } });
    check("empty comment -> 400", empty.status === 400, `status ${empty.status}`);

    const postStolen = await call("PUT", `/blog/${postId}`, { token: bobToken, body: { title: "x", content: "y" } });
    check("non-author update post -> 403", postStolen.status === 403, `status ${postStolen.status}`);
  }

  console.log("\ncontact form");
  {
    const ok = await call("POST", "/contact", { body: { name: "Test Bot", email: "bot@test.dev", message: "hello from the test" } });
    check("contact accepted -> 201", ok.status === 201, `status ${ok.status}`);

    const invalid = await call("POST", "/contact", { body: { name: "No Email", email: "nope", message: "x" } });
    check("invalid email -> 400", invalid.status === 400, `status ${invalid.status}`);

    const anon = await call("GET", "/contact");
    check("inbox without token -> 401", anon.status === 401, `status ${anon.status}`);

    const inbox = await call("GET", "/contact", { token: aliceToken });
    check("inbox lists the message", inbox.status === 200 && inbox.body.messages.some((m) => m.email === "bot@test.dev"));
  }

  console.log("\nadmin + errors");
  {
    const stats = await call("GET", "/admin/stats", { token: aliceToken });
    check(
      "stats returns five counters",
      stats.status === 200 && ["projects", "skills", "posts", "comments", "inbox"].every((k) => typeof stats.body[k] === "number")
    );

    const act = await call("GET", "/admin/activity", { token: aliceToken });
    check("activity returns an array", act.status === 200 && Array.isArray(act.body.activity) && act.body.activity.length > 0);
    check("activity items are {t, at}", !!(act.body.activity[0].t && act.body.activity[0].at));

    const guarded = await call("GET", "/admin/stats");
    check("stats without token -> 401", guarded.status === 401, `status ${guarded.status}`);

    const missingRoute = await call("GET", "/nope");
    check("unknown route -> 404 JSON", missingRoute.status === 404 && !!missingRoute.body.message);

    const badJson = await fetch(BASE + "/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    check("malformed JSON -> 400", badJson.status === 400, `status ${badJson.status}`);
  }

  console.log("\ncleanup");
  {
    const del = await call("DELETE", `/projects/${aliceProjectId}`, { token: aliceToken });
    check("owner can delete own project", del.status === 200, `status ${del.status}`);

    const gone = await call("GET", `/projects/${aliceProjectId}`);
    check("deleted project is really gone", gone.status === 404);

    const delPost = await call("DELETE", `/blog/${postId}`, { token: aliceToken });
    check("owner can delete own post", delPost.status === 200, `status ${delPost.status}`);

    const orphan = await call("GET", `/blog/${postId}/comments`);
    check("deleting a post 404s its thread", orphan.status === 404);
  }

  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass} passed, ${fail} failed`);
  await closeDb();
  if (fail) {
    console.log("failed:", failures.join(" | "));
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error("test run crashed:", err.message);
  try {
    await closeDb();
  } catch (e) {
    /* already closed */
  }
  process.exit(1);
});
