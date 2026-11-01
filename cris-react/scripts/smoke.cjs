/* Smoke test for the built SPA.
   Start a preview server first:  npm run build && npm run preview
   Then:                          npm run smoke
   Override CHROME_PATH / SMOKE_BASE if needed.
   Talks to headless Chrome over the DevTools protocol so it can wait for
   async React state instead of racing the page's load event. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.SMOKE_BASE || "http://localhost:4173";
const PORT = 9333;

const HELPERS = `
const out = [];
const note = (s) => out.push(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitFor(fn, ms = 8000) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = () => {
      let v = null;
      try { v = fn(); } catch (e) {}
      if (v) return res(v);
      if (Date.now() - t0 > ms) return rej(new Error("timeout: " + String(fn).replace(/\\s+/g, " ").slice(0, 60)));
      setTimeout(tick, 40);
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
const chip = (label) => $$(".filters .chip").find((c) => text(c).startsWith(label));
const tab = (label) => $$(".side a").find((a) => text(a).includes(label));
const rows = () => $$(".tbl tbody tr");
`;

const SCENARIOS = [
  {
    name: "home",
    body: `
      await waitFor(() => $$(".proj-grid .card").length === 3);
      await waitFor(() => $$(".posts .post").length === 3);
      if ($$(".skel-card").length) throw new Error("skeleton still visible");
      if (!text($(".hero h1")).includes("Cris Fu")) throw new Error("hero missing");
      if (!text($(".terminal .tbody")).includes("focus.json")) throw new Error("terminal missing");
      note("hero + terminal ok");
      note("3 project cards, 3 post rows");
    `,
  },
  {
    name: "skeleton",
    body: `
      nav("/projects");
      await waitFor(() => $$(".skel-card").length >= 6, 3000);
      note("skeleton cards=" + $$(".skel-card").length);
      await waitFor(() => $$(".proj-grid .card").length === 6);
      if ($$(".skel-card").length) throw new Error("skeleton not removed");
      note("skeleton replaced by real cards");
    `,
  },
  {
    name: "deep-link",
    url: "/blog/jwt-storage",
    body: `
      await waitFor(() => $(".article-head h1"));
      note("direct URL renders: " + text($(".article-head h1")).slice(0, 40));
      if (!location.pathname.endsWith("/blog/jwt-storage")) throw new Error("url changed: " + location.pathname);
      await waitFor(() => $$(".comment").length === 2);
      note("comments loaded on deep link");
    `,
  },
  {
    name: "projects-filter",
    body: `
      nav("/projects");
      await waitFor(() => $$(".proj-grid .card").length === 6);
      if ($$(".filters .chip").length !== 4) throw new Error("chips=" + $$(".filters .chip").length);
      click(chip("Frontend"));
      await waitFor(() => $$(".proj-grid .card").length === 2);
      click(chip("All"));
      await waitFor(() => $$(".proj-grid .card").length === 6);
      note("6 -> Frontend 2 -> 6");
    `,
  },
  {
    name: "project-detail",
    body: `
      nav("/projects");
      await waitFor(() => $$(".proj-grid .card").length === 6);
      const first = $(".proj-grid .card");
      const title = text($("h3", first));
      click(first);
      await waitFor(() => $(".detail-head h1"));
      if (!text($(".detail-head h1")).includes(title.split(" ↗")[0])) throw new Error("wrong title");
      await waitFor(() => $(".meta-grid .v"));
      if (!text($(".prose")).includes("The problem")) throw new Error("prose missing");
      note("detail renders: " + title);
      go("/projects/no-such-project");
      await waitFor(() => $(".state-box.err"));
      if (!text($(".state-box.err")).includes("404")) throw new Error("no 404 badge");
      note("unknown id -> 404 error state");
    `,
  },
  {
    name: "blog-and-comments",
    body: `
      nav("/blog");
      await waitFor(() => $$(".posts .post").length === 5);
      if (!document.body.textContent.includes("5 posts")) throw new Error("count line missing");
      click($$(".posts .post")[0]);
      await waitFor(() => $(".article-head h1"));
      await waitFor(() => $$(".comment").length === 2);
      if (!$(".comment-gate")) throw new Error("gate missing when logged out");
      if ($$(".comment-form").length) throw new Error("form should be hidden");
      note("5 posts, 2 comments, gate shown");
    `,
  },
  {
    name: "login-and-comment",
    body: `
      nav("/login");
      await waitFor(() => $("#email"));
      setVal($("#email"), "bad-email");
      setVal($("#password"), "123");
      click($('button[type="submit"]'));
      await sleep(150);
      if (!$$(".field.invalid").length) throw new Error("validation did not fire");
      note("validation ok");

      setVal($("#email"), "cris@school.edu");
      setVal($("#password"), "wrongpass");
      click($('button[type="submit"]'));
      await waitFor(() => $(".form-error"));
      note("rejected sign-in shows: " + text($(".form-error")));

      setVal($("#password"), "secret123");
      click($('button[type="submit"]'));
      await waitFor(() => location.pathname === "/admin", 10000);
      await waitFor(() => $$(".stats .stat").length === 4);
      note("login -> /admin, 4 stats, nav=" + text($("header .nav-cta")));

      go("/blog/single-html-file");
      await waitFor(() => $(".comment-form"));
      setVal($("#cText"), "A short but substantive reply.");
      click($(".comment-form button[type=submit]"));
      await waitFor(() => $$(".comment").length === 3);
      note("comment 2 -> 3");
    `,
  },
  {
    name: "admin-crud",
    preload: `localStorage.setItem("cf.session", JSON.stringify({name:"Cris Fu",email:"hello@crisfu.dev",token:"t"})); localStorage.setItem("cf.token","t"); localStorage.removeItem("cf.admin.projects");`,
    body: `
      go("/admin");
      await waitFor(() => $$(".stats .stat").length === 4);
      click(tab("Projects"));
      await waitFor(() => rows().length === 6);
      note("rows=6");

      click($$(".panel-head button").find((b) => text(b).includes("New project")));
      await waitFor(() => $(".modal-card"));
      setVal($("#mTitle"), "Test Project");
      click($('.modal-card button[type="submit"]'));
      await waitFor(() => rows().length === 7);
      if (!document.body.textContent.includes("Test Project")) throw new Error("new row missing");
      note("create -> 7");

      click($$(".tbl tbody tr")[0].querySelector(".btn-danger"));
      await waitFor(() => $(".dialog-card"));
      click($(".dialog-card .btn-danger"));
      await waitFor(() => rows().length === 6);
      note("confirm dialog + delete -> 6");
    `,
  },
  {
    name: "admin-gate",
    body: `
      go("/admin");
      await waitFor(() => location.pathname === "/login");
      if (!location.search.includes("next=%2Fadmin")) throw new Error("no next= param: " + location.search);
      note("signed-out /admin -> " + location.pathname + location.search);
    `,
  },
  {
    name: "contact",
    body: `
      go("/contact");
      await waitFor(() => $("#msg"));
      click($('button[type="submit"]'));
      await sleep(150);
      if (!$$(".field.invalid").length) throw new Error("contact validation missing");
      setVal($("#name"), "Ada");
      setVal($("#email"), "ada@example.com");
      setVal($("#msg"), "I would like to talk about an internship.");
      click($('button[type="submit"]'));
      await waitFor(() => $(".success"));
      note("success: " + text($(".success h3")));
    `,
  },
  {
    name: "error-and-retry",
    body: `
      localStorage.setItem("cf.simulateFailure", "1");
      nav("/projects");
      await waitFor(() => $(".state-box.err"));
      if (!$(".state-box.err .btn-primary")) throw new Error("no retry button");
      note("error state shown");
      localStorage.removeItem("cf.simulateFailure");
      click($(".state-box.err .btn-primary"));
      await waitFor(() => $$(".proj-grid .card").length === 6, 10000);
      note("retry recovered");
    `,
  },
  {
    name: "debate-lang",
    body: `
      go("/debate");
      await waitFor(() => $$(".pick").length === 4);
      const en = text($$(".pick")[0]);
      note("en card: " + en.slice(0, 28) + " | buttons: " + $$(".lang-switch button").map((b) => text(b)).join(","));

      const zhBtn = $$(".lang-switch button")[1];
      if (!zhBtn) throw new Error("no language switch");
      if (!/100/.test(text(zhBtn))) throw new Error("zh count missing: " + text(zhBtn));
      click(zhBtn);

      await waitFor(() => $$(".pick").length === 4 && /[\\u4e00-\\u9fa5]/.test(text($$(".pick")[0])), 8000);
      const zh = text($$(".pick")[0]);
      note("zh card: " + zh.slice(0, 20) + " | switched ok");

      /* cards must not stay on the table after a language switch */
      if (text($$(".pick")[0]) === en) throw new Error("deck did not redeal");
      const cats = new Set($$(".pick").map((c) => text(c)));
      if (cats.size !== 4) throw new Error("duplicate cards: " + cats.size);
    `,
  },
  {
    name: "debate",
    body: `
      go("/debate");
      await waitFor(() => $$(".pick").length === 4);
      note("4 topics dealt");
      click($$(".pick")[0]);
      await sleep(80);
      click($(".stance.s-p"));
      await sleep(80);
      const startBtn = $(".setup-foot .btn-primary");
      if (startBtn.disabled) throw new Error("start still disabled");
      click(startBtn);
      await waitFor(() => $(".scorebar"));
      note("battle started");

      setVal($(".composer input"), "Reading is good because books build knowledge, so students learn faster.");
      click($(".composer .btn-primary"));
      await waitFor(() => $(".dm.you"));
      await waitFor(() => $(".dm.dm-c .txt"), 10000);
      const reply = text($(".dm.dm-c .txt"));
      if (!reply.endsWith(".")) throw new Error("unfinished sentence: " + reply.slice(-25));
      const q = reply.match(/["“]([^"”]+)["”]/);
      note("bot reply ok" + (q ? ", quoted=" + q[1] : ", no quote"));
      if (!/\\b(because|so|since|for example)\\b/i.test(reply)) note("warn: reply has no reasoning marker");

      for (let i = 0; i < 4; i++) {
        await waitFor(() => $(".result") || !$(".composer .btn-primary").disabled, 12000);
        if ($(".result")) break;
        setVal($(".composer input"), "I still think this matters because the other side ignores the cost, so the rule should change.");
        click($(".composer .btn-primary"));
        await sleep(250);
      }
      await waitFor(() => $(".result"), 15000);
      note("result: " + text($(".result h2")) + " | " + text($(".result .final")));
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cf-cdp-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: "ignore" });

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

  const only = process.argv[2];
  let pass = 0;
  let total = 0;

  for (const sc of SCENARIOS) {
    if (only && sc.name !== only) continue;
    total++;

    events.length = 0;
    await send("Page.navigate", { url: BASE + (sc.url || "/") });
    await waitEvent("Page.loadEventFired");
    await evaluate(`localStorage.clear(); sessionStorage.clear(); true`);
    // reload so the app boots with an empty store (AuthProvider reads once, on mount)
    events.length = 0;
    await send("Page.reload", {});
    await waitEvent("Page.loadEventFired");

    if (sc.preload) {
      await evaluate(sc.preload + "; true");
      events.length = 0;
      await send("Page.reload", {});
      await waitEvent("Page.loadEventFired");
    }

    try {
      const result = await evaluate(`(async () => { ${HELPERS}\n${sc.body}\n return out.join(" | "); })()`);
      console.log(`PASS  ${sc.name}`);
      console.log(`      ${String(result).slice(0, 300)}`);
      pass++;
    } catch (err) {
      const runtimeErrors = events
        .filter((e) => e.method === "Runtime.exceptionThrown")
        .map((e) => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
        .slice(0, 2);
      console.log(`FAIL  ${sc.name}`);
      console.log(`      ${err.message}`);
      if (runtimeErrors.length) console.log(`      runtime: ${runtimeErrors.join(" / ").slice(0, 300)}`);
    }
  }

  console.log(`\n${pass}/${total} scenarios passed`);
  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error("HARNESS ERROR", e);
  process.exit(1);
});
