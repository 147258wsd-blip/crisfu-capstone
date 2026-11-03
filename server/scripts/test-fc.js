/**
 * Local check for the Alibaba Cloud FC adapter.
 *
 * Builds the exact `event` payload FC 3.0 sends for an HTTP trigger and feeds
 * it to `api/fc.js`, so the whole path — base64 bodies, header casing, static
 * files, SPA fallback, Express routing, auth — is exercised before anything is
 * uploaded to the console.
 *
 * Run from `server/`:  npm run test:fc
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

/* in the repo the built site lives next door; in the deploy zip it is public/ */
if (!process.env.FC_STATIC_ROOT) {
  const dist = path.resolve(__dirname, "../../cris-react/dist");
  if (fs.existsSync(dist)) process.env.FC_STATIC_ROOT = dist;
}

const { handler } = require("../api/fc");

let pass = 0;
let fail = 0;

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      pass += 1;
      console.log(`  PASS  ${name}`);
    })
    .catch((err) => {
      fail += 1;
      console.log(`  FAIL  ${name}\n        ${err.message}`);
    });
}

function eq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function makeEvent(method, url, { headers = {}, body, json } = {}) {
  const [rawPath, qs] = url.split("?");
  const queryParameters = {};
  if (qs) {
    for (const pair of qs.split("&")) {
      const [k, v = ""] = pair.split("=");
      queryParameters[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  const outHeaders = { ...headers };
  if (json !== undefined) {
    outHeaders["Content-Type"] = "application/json";
  }
  const raw = json !== undefined ? JSON.stringify(json) : body || "";
  return {
    version: "v1",
    rawPath,
    headers: outHeaders,
    queryParameters,
    body: raw,
    isBase64Encoded: false,
    requestContext: {
      accountId: "1234",
      domainName: "test.cn-hangzhou.fcapp.run",
      domainPrefix: "test",
      requestId: "req-test",
      time: new Date().toISOString(),
      timeEpoch: String(Date.now()),
      http: { method, path: rawPath, protocol: "HTTP/1.1", sourceIp: "1.2.3.4", userAgent: "fc-test" },
    },
  };
}

const json = (res) => JSON.parse(res.body);

(async () => {
  console.log("FC adapter");

  await check("GET /api/health -> 200 ok", async () => {
    const r = await handler(makeEvent("GET", "/api/health"), {});
    eq(r.statusCode, 200, "status");
    eq(json(r).status, "ok", "payload");
    if (!String(r.headers["content-type"]).includes("application/json")) {
      throw new Error("content-type should be json");
    }
  });

  await check("GET /api/projects -> 200 with seeded rows", async () => {
    const r = await handler(makeEvent("GET", "/api/projects"), {});
    eq(r.statusCode, 200, "status");
    const items = json(r).projects;
    if (!Array.isArray(items) || items.length < 6) {
      throw new Error(`expected >=6 projects, got ${Array.isArray(items) ? items.length : typeof items}`);
    }
  });

  await check("GET /api/nope -> 404 with the shared error shape", async () => {
    const r = await handler(makeEvent("GET", "/api/nope"), {});
    eq(r.statusCode, 404, "status");
    eq(json(r).success, false, "success flag");
  });

  await check("POST /api/projects without a token -> 401", async () => {
    const r = await handler(
      makeEvent("POST", "/api/projects", { json: { title: "x", blurb: "y" } }),
      {}
    );
    eq(r.statusCode, 401, "status");
    eq(json(r).success, false, "success flag");
  });

  await check("POST /api/users/login wrong password -> 401", async () => {
    const r = await handler(
      makeEvent("POST", "/api/users/login", { json: { email: "cris@crisfu.dev", password: "nope" } }),
      {}
    );
    eq(r.statusCode, 401, "status");
  });

  await check("POST /api/users/login correct -> 200 with a token", async () => {
    const r = await handler(
      makeEvent("POST", "/api/users/login", {
        json: { email: "cris@crisfu.dev", password: "crisfu2026" },
      }),
      {}
    );
    eq(r.statusCode, 200, "status");
    if (!json(r).token) throw new Error("no token in response");
  });

  await check("GET / -> 200 html (Vite build)", async () => {
    const r = await handler(makeEvent("GET", "/", { headers: { Accept: "text/html" } }), {});
    eq(r.statusCode, 200, "status");
    if (!String(r.headers["content-type"]).includes("text/html")) throw new Error("not html");
    if (!r.body.includes("<div id=\"root\">")) throw new Error("index.html marker missing");
  });

  await check("GET /portfolio -> 200 html (SPA fallback)", async () => {
    const r = await handler(makeEvent("GET", "/portfolio"), {});
    eq(r.statusCode, 200, "status");
    if (!r.body.includes("<div id=\"root\">")) throw new Error("SPA document not returned");
  });

  /* `/api-docs.html` is a page in public/, but its path starts with "/api",
     which used to route it into Express and return a JSON 404. The prefix
     check has to be `/api` or `/api/`, not a bare startsWith. */
  await check("GET /api-docs.html -> 200 html (docs page, not the API)", async () => {
    const r = await handler(makeEvent("GET", "/api-docs.html"), {});
    eq(r.statusCode, 200, "status");
    if (!String(r.headers["content-type"]).includes("text/html")) throw new Error("not html");
    if (!/api reference|endpoints/i.test(r.body)) throw new Error("docs page content missing");
  });

  await check("GET /api still reaches Express (not the static handler)", async () => {
    const r = await handler(makeEvent("GET", "/api"), {});
    eq(r.statusCode, 200, "status");
    if (!String(r.headers["content-type"]).includes("json")) throw new Error("expected the JSON endpoint map");
  });

  await check("GET /assets/<hashed>.js -> 200 immutable js", async () => {
    const dir = path.join(process.env.FC_STATIC_ROOT, "assets");
    const file = fs.readdirSync(dir).find((f) => f.endsWith(".js"));
    if (!file) throw new Error("no built js asset found");
    const r = await handler(makeEvent("GET", `/assets/${file}`), {});
    eq(r.statusCode, 200, "status");
    if (!String(r.headers["content-type"]).includes("javascript")) throw new Error("wrong type");
    if (!String(r.headers["cache-control"]).includes("immutable")) throw new Error("no long cache");
  });

  await check("binary asset is returned base64-encoded", async () => {
    const dir = path.join(process.env.FC_STATIC_ROOT, "shots");
    if (!fs.existsSync(dir)) return;
    const file = fs.readdirSync(dir).find((f) => /\.(png|jpe?g|webp)$/i.test(f));
    if (!file) return;
    const r = await handler(makeEvent("GET", `/shots/${file}`), {});
    eq(r.statusCode, 200, "status");
    eq(r.isBase64Encoded, true, "base64 flag");
    const bytes = Buffer.from(r.body, "base64");
    if (!bytes.length) throw new Error("empty body");
  });

  await check("path traversal is contained", async () => {
    const r = await handler(makeEvent("GET", "/../../server/.env"), {});
    if (r.statusCode === 200 && r.body.includes("MONGODB_URI=")) {
      throw new Error("leaked .env through the static handler");
    }
  });

  await check("OPTIONS /api/projects -> preflight answered", async () => {
    const r = await handler(
      makeEvent("OPTIONS", "/api/projects", {
        headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
      }),
      {}
    );
    if (r.statusCode >= 400) throw new Error(`preflight failed with ${r.statusCode}`);
  });

  await check("query string survives the rebuild", async () => {
    const r = await handler(makeEvent("GET", "/api/projects?limit=2"), {});
    eq(r.statusCode, 200, "status");
  });

  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
