/**
 * Build the upload package for Alibaba Cloud Function Compute.
 *
 * FC wants a zip whose ROOT is the function root, containing the handler file,
 * the dependencies and (for this project) the compiled frontend. This script
 * assembles exactly that in `fc-build/` and then zips it, so the console only
 * ever sees one file to upload.
 *
 * Layout produced:
 *
 *   fc-api.zip
 *   ├── fc.js            <- handler: fc.handler
 *   ├── api/             <- _app.js (shared with Vercel) + _fc-response.js
 *   ├── config/ models/ controllers/ routes/ middleware/ utils/
 *   ├── node_modules/    <- production dependencies, offline copy
 *   └── public/          <- Vite build, served by fc.js
 *
 * Usage (from server/):
 *   npm run pack:fc              rebuild the frontend, then zip
 *   npm run pack:fc -- --fresh   same, after wiping node_modules first
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SERVER_DIR = path.resolve(__dirname, "..");
const REPO_DIR = path.resolve(SERVER_DIR, "..");
const WEB_DIR = path.join(REPO_DIR, "cris-react");
const STAGE = path.join(REPO_DIR, "fc-build");
const ZIP = path.join(REPO_DIR, "fc-api.zip");

const SKIP_TOP = new Set([
  ".env",
  ".env.local",
  ".env.mock",
  ".env.example",
  "node_modules",
  "scripts",
  "Dockerfile",
  ".dockerignore",
  "railway.toml",
  "vercel.json",
]);

function log(msg) {
  console.log(`[pack] ${msg}`);
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function buildFrontend() {
  log("building the frontend (VITE_API_URL=/api, mock off)");
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    cwd: WEB_DIR,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, VITE_API_URL: "/api", VITE_USE_MOCK: "false" },
  });
}

function copyServer() {
  log("copying the API");
  for (const entry of fs.readdirSync(SERVER_DIR, { withFileTypes: true })) {
    if (SKIP_TOP.has(entry.name)) continue;
    if (entry.name.endsWith(".md")) continue;
    const from = path.join(SERVER_DIR, entry.name);
    const to = path.join(STAGE, entry.name);
    fs.cpSync(from, to, { recursive: true });
  }

  const modules = path.join(SERVER_DIR, "node_modules");
  if (!fs.existsSync(modules)) {
    throw new Error("server/node_modules is missing — run `npm ci` in server/ first");
  }
  log("copying node_modules (this is the slow part, ~20s)");
  fs.cpSync(modules, path.join(STAGE, "node_modules"), { recursive: true });
}

function copyBuild() {
  const dist = path.join(WEB_DIR, "dist");
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("cris-react/dist is missing — the frontend build did not run");
  }
  log("copying the compiled site into public/");
  fs.cpSync(dist, path.join(STAGE, "public"), { recursive: true });
}

function zip() {
  rmrf(ZIP);
  log("zipping");
  if (process.platform === "win32") {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Compress-Archive -Path '${STAGE}\\*' -DestinationPath '${ZIP}' -Force -CompressionLevel Optimal`,
      ],
      { stdio: "inherit" }
    );
  } else {
    execFileSync("zip", ["-qr", ZIP, "."], { cwd: STAGE, stdio: "inherit" });
  }
}

function report() {
  const size = fs.statSync(ZIP).size;
  const mb = (size / 1024 / 1024).toFixed(1);
  let files = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else files += 1;
    }
  };
  walk(STAGE);

  console.log("");
  log(`done: ${path.relative(REPO_DIR, ZIP)}  (${mb} MB, ${files} files)`);
  log("console settings:");
  console.log("       运行环境   Node.js 20");
  console.log("       处理器     fc.handler");
  console.log("       内存/超时  512 MB / 30 秒");
  console.log("       触发器     HTTP 触发器，认证方式选「无需认证」");
  if (size > 100 * 1024 * 1024) {
    console.log("");
    log("WARNING: over 100 MB — the console upload will be rejected.");
  }
}

function main() {
  if (process.argv.includes("--fresh")) {
    log("wiping server/node_modules");
    rmrf(path.join(SERVER_DIR, "node_modules"));
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--omit=dev"], {
      cwd: SERVER_DIR,
      stdio: "inherit",
      shell: true,
    });
  }

  rmrf(STAGE);
  fs.mkdirSync(STAGE, { recursive: true });
  buildFrontend();
  copyServer();
  copyBuild();
  zip();
  report();
}

main();
