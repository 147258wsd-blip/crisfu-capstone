/**
 * Alibaba Cloud Function Compute (FC 3.0) entry point.
 *
 * FC 3.0 built-in runtimes do not hand you a Node `http.Server`; an HTTP
 * trigger turns the request into an `event` JSON object and expects a
 * `{statusCode, headers, body}` object back. Express cannot run on that,
 * so this file provides the missing glue:
 *
 *   1. GET/HEAD requests that are not under /api are answered straight from
 *      the `public/` folder (the Vite build). Doing it here instead of via
 *      express.static keeps the hot path down to a single fs.readFile and
 *      avoids depending on Node's `send` module, which needs a real
 *      ServerResponse.
 *   2. Everything else is rebuilt into a Node `IncomingMessage`-shaped
 *      readable plus an `ServerResponse`-shaped collector, and handed to the
 *      very same handler Vercel uses (`api/_app.js`), so routing, auth,
 *      validation and error shapes stay identical to local development.
 *
 * Handler name in the FC console: `api/fc.handler` — the file keeps its
 * `api/` prefix because every other entry point lives there, and because
 * STATIC_ROOT below resolves `..` from this file's directory.
 */

const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");

const { createResponse } = require("./_fc-response");
const appHandler = require("./_app");

/* ---------- static files ---------- */

const STATIC_ROOT = path.resolve(
  __dirname,
  "..",
  process.env.FC_STATIC_ROOT || "public"
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const BINARY = /^image\/|^font\/|woff|octet-stream/;

function isBinary(type) {
  return BINARY.test(type || "");
}

function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const clean = path.posix.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const abs = path.join(root, clean);
  return abs.startsWith(root) ? abs : null;
}

function readStatic(urlPath) {
  if (!fs.existsSync(path.join(STATIC_ROOT, "index.html"))) return null;

  const abs = safeJoin(STATIC_ROOT, urlPath);
  if (abs) {
    try {
      const stat = fs.statSync(abs);
      if (stat.isFile()) {
        const type = MIME[path.extname(abs).toLowerCase()] || "application/octet-stream";
        return {
          type,
          body: fs.readFileSync(abs),
          cache: urlPath.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
        };
      }
    } catch {
      /* fall through to the SPA document */
    }
  }

  /* unknown path that is not a file: hand it to the client-side router */
  return {
    type: MIME[".html"],
    body: fs.readFileSync(path.join(STATIC_ROOT, "index.html")),
    cache: "no-cache",
  };
}

function staticResult(urlPath) {
  const hit = readStatic(urlPath);
  if (!hit) return null;
  const binary = isBinary(hit.type);
  return {
    statusCode: 200,
    headers: {
      "content-type": hit.type,
      "content-length": String(hit.body.length),
      "cache-control": hit.cache,
    },
    isBase64Encoded: binary,
    body: binary ? hit.body.toString("base64") : hit.body.toString("utf8"),
  };
}

/* ---------- event -> Node req/res ---------- */

function parseEvent(event) {
  if (!event) return {};
  if (typeof event === "string" || Buffer.isBuffer(event)) {
    try {
      return JSON.parse(event.toString());
    } catch {
      return {};
    }
  }
  return event;
}

function buildRequest(ev) {
  const http = (ev.requestContext && ev.requestContext.http) || {};
  const method = String(http.method || ev.httpMethod || "GET").toUpperCase();

  let url = ev.rawPath || http.path || "/";
  if (!url.startsWith("/")) url = "/" + url;

  const qp = ev.queryParameters || {};
  const search = Object.keys(qp)
    .map((k) => {
      const v = qp[k];
      if (Array.isArray(v)) {
        return v.map((one) => `${encodeURIComponent(k)}=${encodeURIComponent(one)}`).join("&");
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .filter(Boolean)
    .join("&");
  if (search) url += (url.includes("?") ? "&" : "?") + search;

  const rawHeaders = ev.headers || {};
  const headers = {};
  for (const key of Object.keys(rawHeaders)) {
    const value = rawHeaders[key];
    headers[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  let body = ev.body == null ? "" : ev.body;
  if (ev.isBase64Encoded) body = Buffer.from(String(body), "base64").toString("utf8");
  const bodyBuffer = Buffer.from(body, "utf8");
  if (bodyBuffer.length && !headers["content-length"]) {
    headers["content-length"] = String(bodyBuffer.length);
  }

  const req = new Readable({ read() {} });
  req.push(bodyBuffer.length ? bodyBuffer : null);
  req.push(null);

  req.method = method;
  req.url = url;
  req.originalUrl = url;
  req.headers = headers;
  req.rawHeaders = Object.keys(rawHeaders).reduce((acc, k) => {
    const v = rawHeaders[k];
    return acc.concat([k, Array.isArray(v) ? v.join(", ") : String(v)]);
  }, []);
  req.httpVersion = "1.1";
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;
  req.complete = true;
  req.aborted = false;
  req.readable = true;
  req.socket = {
    remoteAddress: http.sourceIp || "0.0.0.0",
    encrypted: String(http.protocol || "").toUpperCase() === "HTTPS",
    writable: true,
    destroyed: false,
    on: () => req.socket,
    once: () => req.socket,
    addListener: () => req.socket,
    removeListener: () => req.socket,
    emit: () => false,
  };
  req.connection = req.socket;
  return req;
}

async function handleHttp(ev, context) {
  const http = (ev.requestContext && ev.requestContext.http) || {};
  const method = String(http.method || ev.httpMethod || "GET").toUpperCase();
  const rawPath = ev.rawPath || http.path || "/";

  /* Static assets and the SPA document never reach Express. The API lives
     under `/api/` exactly — a bare `startsWith("/api")` also swallowed
     `/api-docs.html`, which is a page in public/, not an endpoint. */
  const isApiRoute = rawPath === "/api" || rawPath.startsWith("/api/");
  if ((method === "GET" || method === "HEAD") && !isApiRoute) {
    const hit = staticResult(rawPath);
    if (hit) return hit;
  }

  const req = buildRequest(ev);
  const res = createResponse();
  req.res = res;
  res.req = req;

  if (context && context.requestId) res.setHeader("X-Request-Id", context.requestId);

  /* Express 4 does not await async controllers: `app(req, res)` returns the
     moment routing is dispatched, while the database round-trip is still in
     flight. Waiting for res.end() — not for app() — is what makes the body
     exist by the time we serialise the response. */
  const done = new Promise((resolve) => {
    res.on("finish", () => resolve("finish"));
    res.on("close", () => resolve("close"));
  });

  const guard = new Promise((resolve) => setTimeout(() => resolve("timeout"), 20000));

  try {
    appHandler(req, res).catch((err) => {
      console.error("[fc] handler rejected:", err && err.stack ? err.stack : err);
      if (!res.finished) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ success: false, message: "Internal server error" }));
      }
    });
  } catch (err) {
    if (!res.finished) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ success: false, message: "Internal server error" }));
    }
  }

  const outcome = await Promise.race([done, guard]);
  if (outcome === "timeout") console.error("[fc] response not finished within 20s:", rawPath);

  /* last-resort guard so a forgotten res.end() never leaves the caller hanging */
  if (!res.finished) res.end();

  return res._fcResult();
}

async function handler(event, context) {
  /* the console may create this as a Web function, in which case FC passes
     (req, res, context) with real-ish HTTP objects — Express eats those */
  if (
    context &&
    typeof context.setHeader === "function" &&
    event &&
    typeof event.method === "string"
  ) {
    return appHandler(event, context);
  }

  const ev = parseEvent(event);
  try {
    return await handleHttp(ev, context);
  } catch (err) {
    console.error("[fc] unhandled:", err && err.stack ? err.stack : err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      isBase64Encoded: false,
      body: JSON.stringify({ success: false, message: "Internal server error" }),
    };
  }
}

module.exports = { handler, handleHttp, buildRequest, createResponse };
