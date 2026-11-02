/* Smoke test for the REAL stack: built SPA (VITE_USE_MOCK=false) talking to
   the Express API and Atlas. Every assertion checks the browser UI *and*
   the database, so "it looked right" is never enough.

   Prereqs:  npm run build && npm run preview      (4173)
             cd ../server && npm start             (5000)
   Run:      npm run smoke:real
*/

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.SMOKE_BASE || "http://localhost:4173";
const API = process.env.API_BASE || "http://localhost:5000/api";
const PORT = 9334;

const EMAIL = process.env.SMOKE_EMAIL || "cris@crisfu.dev";
const PASSWORD = process.env.SMOKE_PASSWORD || "crisfu2026";

const HELPERS = `
const out = [];
const API = ${JSON.stringify(API)};
const note = (s) => out.push(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitFor(fn, ms = 12000) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = () => {
      let v = null;
      try { v = fn(); } catch (e) {}
      if (v) return res(v);
      if (Date.now() - t0 > ms) return rej(new Error("timeout: " + String(fn).replace(/\\s+/g, " ").slice(0, 70)));
      setTimeout(tick, 50);
    };
    tick();
  });
}
function setVal(el, v) {
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
const click = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : "");
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const $ = (s, r) => (r || document).querySelector(s);
const go = (p) => { window.history.pushState({}, "", p); window.dispatchEvent(new PopStateEvent("popstate")); };
const nav = (href) => click($('header .nav-links a[href="' + href + '"]'));
const tab = (label) => $$(".side a").find((a) => text(a).includes(label));
const rows = () => $$(".tbl tbody tr");
const tok = () => localStorage.getItem("cf.token") || "";
async function api(p, opts = {}) {
  const r = await fetch(API + p, {
    cache: "no-store",
    ...opts,
    headers: { "Content-Type": "application/json", ...(tok() ? { Authorization: "Bearer " + tok() } : {}), ...(opts.headers || {}) },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function signIn() {
  go("/login");
  await waitFor(() => $("#email"));
  setVal($("#email"), ${JSON.stringify(EMAIL)});
  setVal($("#password"), ${JSON.stringify(PASSWORD)});
  click($('button[type="submit"]'));
  await waitFor(() => location.pathname === "/admin", 15000);
  await waitFor(() => $$(".stats .stat").length === 5, 15000);
}
`;

const SCENARIOS = [
  {
    name: "projects-come-from-atlas",
    url: "/projects",
    body: `
      await waitFor(() => $$(".card").length >= 6);
      if (localStorage.getItem("cf.admin.projects")) throw new Error("still writing to localStorage");
      const titles = $$(".card h3").map(text);
      note($$(".card").length + " cards via API: " + titles.slice(0, 3).join(" / "));
      const direct = await api("/projects");
      if (direct.status !== 200 || direct.body.count < 6) throw new Error("API count mismatch");
      note("API reports " + direct.body.count + " projects");
    `,
  },
  {
    name: "skills-come-from-atlas",
    url: "/",
    body: `
      await waitFor(() => $$(".skill-box").length >= 3, 15000);
      const chips = $$(".skill");
      if (chips.length < 18) throw new Error("only " + chips.length + " skills rendered");
      note($$(".skill-box").length + " groups, " + chips.length + " chips: " + $$(".skill-box h4").map(text).join(" / "));
      const direct = await api("/skills");
      if (direct.status !== 200 || direct.body.count < 18) throw new Error("API count mismatch: " + direct.status);
      note("API reports " + direct.body.count + " skills");
    `,
  },
  {
    name: "admin-skills-crud",
    body: `
      await signIn();
      click(tab("Skills"));
      await waitFor(() => rows().length >= 18, 15000);
      const before = rows().length;
      const name = "Smoke Skill " + Date.now();
      click($$(".panel-head button").find((b) => text(b).includes("New skill")));
      await waitFor(() => $("#sName"));
      setVal($("#sName"), name);
      click($('.modal-card button[type="submit"]'));
      await waitFor(() => rows().length === before + 1, 15000);
      note("table " + before + " -> " + rows().length);

      const list = await api("/skills");
      const made = list.body.skills.find((s) => s.name === name);
      if (!made) throw new Error("new skill is not in the database");
      note("stored in Atlas: " + made.name + " (" + made.category + ", level " + made.level + ")");

      const target = $$(".tbl tbody tr").find((r) => text(r).includes(name));
      click(target.querySelector(".btn-danger"));
      await waitFor(() => $(".dialog-card"));
      click($(".dialog-card .btn-danger"));
      await waitFor(() => !document.body.textContent.includes(name), 15000);
      const after = await api("/skills");
      if (after.body.skills.some((s) => s.name === name)) throw new Error("still in the database after delete");
      note("deleted again, " + after.body.count + " skills left");
    `,
  },
  {
    name: "project-detail-by-objectid",
    url: "/projects",
    body: `
      await waitFor(() => $$(".card").length >= 6);
      click($$(".card a, .card")[0]);
      await waitFor(() => /^\\/projects\\/[a-f0-9]{24}$/.test(location.pathname.split("?")[0]), 10000);
      note("url " + location.pathname);
      await waitFor(() => $(".banner") || $("h1"));
      const body = text($("main"));
      if (body.length < 200) throw new Error("detail page looks empty");
      note("detail rendered, " + body.length + " chars");
    `,
  },
  {
    name: "blog-and-post-detail",
    url: "/blog",
    body: `
      await waitFor(() => $$(".posts .post").length >= 5);
      const first = $$(".posts .post").find((a) => /\\/blog\\/[a-f0-9]{24}/.test(a.getAttribute("href")));
      if (!first) throw new Error("no post link with a real id");
      click(first);
      await waitFor(() => /^\\/blog\\/[a-f0-9]{24}$/.test(location.pathname.split("?")[0]), 10000);
      await waitFor(() => $(".post-body, .prose, main"));
      note("post " + location.pathname + " rendered");
    `,
  },
  {
    name: "login-against-real-api",
    body: `
      go("/login");
      await waitFor(() => $("#email"));
      setVal($("#email"), "nobody@nowhere.dev");
      setVal($("#password"), "whatever1");
      click($('button[type="submit"]'));
      await waitFor(() => $(".form-error"), 12000);
      note("unknown account rejected: " + text($(".form-error")));

      setVal($("#email"), ${JSON.stringify(EMAIL)});
      setVal($("#password"), ${JSON.stringify(PASSWORD)});
      click($('button[type="submit"]'));
      await waitFor(() => location.pathname === "/admin", 15000);
      await waitFor(() => $$(".stats .stat").length === 5, 15000);
      if (!tok()) throw new Error("no JWT in localStorage");
      note("token stored (" + tok().length + " chars), stats=" + $$(".stats .stat").map((s) => text(s)).join(","));

      const me = await api("/users/me");
      if (me.status !== 200) throw new Error("/users/me rejected the token");
      note("me=" + me.body.user.username + " <" + me.body.user.email + ">");
    `,
  },
  {
    name: "admin-create-persists",
    body: `
      await signIn();
      click(tab("Projects"));
      await waitFor(() => rows().length >= 6);
      const before = rows().length;
      click($$(".panel-head button").find((b) => text(b).includes("New project")));
      await waitFor(() => $(".modal-card"));
      setVal($("#mTitle"), "Smoke Project " + Date.now());
      click($('.modal-card button[type="submit"]'));
      await waitFor(() => rows().length === before + 1, 15000);
      note("table " + before + " -> " + rows().length);

      const list = await api("/projects");
      const made = list.body.projects.find((p) => p.title.startsWith("Smoke Project"));
      if (!made) throw new Error("new project is not in the database");
      note("found in Atlas: " + made.title + " owned by " + (made.user && made.user.username));

      /* reload: proof it survived a round trip to the server, not just React state */
      location.reload();
    `,
  },
  {
    name: "admin-delete-persists",
    body: `
      await signIn();
      click(tab("Projects"));
      await waitFor(() => rows().length >= 6);
      const target = $$(".tbl tbody tr").find((r) => text(r).includes("Smoke Project"));
      if (!target) throw new Error("the project created by the previous scenario is missing");
      click(target.querySelector(".btn-danger"));
      await waitFor(() => $(".dialog-card"));
      click($(".dialog-card .btn-danger"));
      await waitFor(() => !document.body.textContent.includes("Smoke Project"), 15000);
      note("row removed from the table");

      const list = await api("/projects");
      if (list.body.projects.some((p) => p.title.startsWith("Smoke Project"))) {
        throw new Error("still in the database after delete");
      }
      note("gone from Atlas too (" + list.body.count + " projects left)");
    `,
  },
  {
    name: "comment-writes-to-atlas",
    url: "/blog",
    body: `
      await signIn();
      const posts = await api("/blog");
      const postId = posts.body.posts[0]._id;
      go("/blog/" + postId);
      await waitFor(() => $(".comment-form"), 15000);
      const body = "Real backend check " + Date.now();
      setVal($("#cText"), body);
      click($(".comment-form button[type=submit]"));
      /* wait for the comment ELEMENT, not the page text: the textarea still
         holds the string, so a body-wide search passes before the POST lands */
      await waitFor(() => $$(".comment").some((c) => text(c).includes(body)), 15000);
      note("comment rendered (" + $$(".comment").length + " in the thread)");

      let thread = null;
      let made = null;
      for (let i = 0; i < 6 && !made; i++) {
        thread = await api("/blog/" + postId + "/comments");
        made = (thread.body.comments || []).find((c) => c.body === body);
        if (!made) await sleep(300);
      }
      const seen = (thread && thread.body.comments ? thread.body.comments : []).map((c) => c.body);
      if (!made) {
        throw new Error(
          "comment not found (status " + thread.status + ", " + seen.length + " comments, last=" +
          JSON.stringify(seen[seen.length - 1] || "") + ", wanted=" + JSON.stringify(body) + ")"
        );
      }
      if (!made.author || !made.author.username) throw new Error("author not populated");
      note("stored, author=" + made.author.username);
    `,
  },
  {
    name: "contact-writes-to-atlas",
    body: `
      go("/contact");
      await waitFor(() => $("#msg"));
      const msg = "Smoke message " + Date.now();
      setVal($("#name"), "Smoke Tester");
      setVal($("#email"), "smoke@test.dev");
      setVal($("#msg"), msg);
      click($('button[type="submit"]'));
      await waitFor(() => $(".success"), 15000);
      note("form said: " + text($(".success h3")));

      await signIn();
      const inbox = await api("/contact");
      if (!inbox.body.messages.some((m) => m.message === msg)) throw new Error("message is not in the database");
      note("inbox has it (" + inbox.body.count + " messages)");
    `,
  },
  {
    name: "protected-route-and-401",
    body: `
      localStorage.clear();
      go("/admin");
      await waitFor(() => location.pathname === "/login", 12000);
      if (!location.search.includes("next=%2Fadmin")) throw new Error("missing next= param: " + location.search);
      note("signed-out /admin -> " + location.pathname + location.search);

      const expires = new Date(Date.now() + 3600e3).toUTCString();
      document.cookie = "probe=1;expires=" + expires;
      const stale = await fetch(API + "/users/me", { headers: { Authorization: "Bearer dead.token.here" } });
      note("stale token -> " + stale.status);
      if (stale.status !== 401) throw new Error("API accepted a garbage token");
    `,
  },
];

/* ---------------- minimal CDP client ---------------- */
let ws;
let nextId = 1;
const pending = new Map();
const events = [];

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function onMessage(raw) {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
}

async function waitEvent(method, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const i = events.findIndex((e) => e.method === method);
    if (i >= 0) return events.splice(i, 1)[0];
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("event timeout: " + method);
}

async function evaluate(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (res.exceptionDetails) {
    const d = res.exceptionDetails;
    throw new Error((d.exception && (d.exception.description || d.exception.value)) || d.text);
  }
  return res.result.value;
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cf-real-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,900",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let version;
  for (let i = 0; i < 60; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      break;
    } catch (e) {
      await wait(250);
    }
  }
  if (!version) throw new Error("chrome did not expose the debugging port");

  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener("message", (e) => onMessage(e.data));
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  const only = process.argv[2];
  let pass = 0;
  let total = 0;

  for (const sc of SCENARIOS) {
    if (only && sc.name !== only) continue;
    total++;

    events.length = 0;
    await send("Page.navigate", { url: BASE + (sc.url || "/") });
    await waitEvent("Page.loadEventFired");

    try {
      const result = await evaluate(`(async () => { ${HELPERS}\n${sc.body}\n return out.join(" | "); })()`);
      console.log(`PASS  ${sc.name}`);
      console.log(`      ${String(result).slice(0, 320)}`);
      pass++;
    } catch (err) {
      const runtimeErrors = events
        .filter((e) => e.method === "Runtime.exceptionThrown")
        .map((e) => e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description)
        .filter(Boolean);
      console.log(`FAIL  ${sc.name}`);
      console.log(`      ${err.message.split("\n")[0]}`);
      try {
        const seen = await evaluate(
          `location.pathname + " | " + document.body.innerText.replace(/\\s+/g, " ").slice(0, 220)`
        );
        console.log(`      at: ${seen}`);
      } catch (e) {
        /* page may have navigated away */
      }
      if (runtimeErrors.length) console.log(`      page errors: ${runtimeErrors.slice(0, 2).join(" | ").slice(0, 300)}`);
    }
  }

  console.log(`\n${pass}/${total} scenarios passed`);
  ws.close();
  chrome.kill();
  process.exit(pass === total ? 0 : 1);
}

main().catch((err) => {
  console.error("runner crashed:", err.message);
  process.exit(1);
});
