/* =========================================================
   publish-pages.js — build the React app for GitHub Pages and
   push the result to the `gh-pages` branch.

   Why a separate build: the Function Compute default domain
   (https://*.fcapp.run) answers every request with
   `Content-Disposition: attachment`, so a browser downloads the
   page instead of rendering it. That header is added by the FC
   gateway and can only be removed by binding a custom domain,
   which needs an ICP filing. The API is unaffected — XHR ignores
   the header — so the fix is to serve the site from somewhere
   that renders HTML and let it call the API cross-origin.

   Usage:
     node scripts/publish-pages.js
     LIVE_API=https://other.host/api node scripts/publish-pages.js
   ========================================================= */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WEB_DIR = path.resolve(__dirname, "..");
const OUT = path.join(WEB_DIR, "dist");
const REPO_SUB = "crisfu-capstone"; // must match the GitHub repository name
const API = process.env.LIVE_API || "https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api";
const BRANCH = "gh-pages";

const log = (m) => console.log(`[pages] ${m}`);
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

/* ---------- 1. build with the sub-path baked in ---------- */

log(`building for /${REPO_SUB}/ -> ${API}`);
fs.rmSync(OUT, { recursive: true, force: true });
run("npm", ["run", "build"], {
  cwd: WEB_DIR,
  env: {
    ...process.env,
    /* bare segment, no leading slash — see the note in vite.config.js */
    VITE_BASE_SEG: REPO_SUB,
    VITE_API_URL: API,
    VITE_USE_MOCK: "false",
  },
});

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  throw new Error("build produced no index.html");
}

/* ---------- 2. GitHub Pages needs a SPA fallback ---------- */

/* any unknown path (including /blog/<id> on a hard refresh) is answered with
   this file at a 404 status, and the client router takes over from there */
fs.copyFileSync(path.join(OUT, "index.html"), path.join(OUT, "404.html"));
/* stops Jekyll from touching the output; harmless but avoids surprises */
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

/* ---------- 3. publish to the gh-pages branch ---------- */

const remote = execFileSync("git", ["-C", WEB_DIR, "remote", "get-url", "origin"], {
  encoding: "utf8",
}).trim();

const stat = fs.statSync(path.join(OUT, "index.html"));
log(`index.html ${stat.size} bytes, pushing to ${BRANCH}`);

fs.rmSync(path.join(OUT, ".git"), { recursive: true, force: true });
run("git", ["init", "-q", "-b", BRANCH], { cwd: OUT });
run("git", ["add", "-A"], { cwd: OUT });
run("git", ["-c", "user.name=Cris Fu", "-c", "user.email=cris@crisfu.dev", "commit", "-q", "-m", "Deploy the built site"], {
  cwd: OUT,
});
run("git", ["push", "-f", remote, `${BRANCH}:${BRANCH}`], { cwd: OUT });

log(`done -> https://<your-username>.github.io/${REPO_SUB}/`);
log("one-time step: repo Settings -> Pages -> Source: Deploy from a branch -> gh-pages -> / (root) -> Save");
