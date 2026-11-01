/* Static check: every real request in api.js must hit one of the endpoints
   the Capstone spec defines. Catches the classic "path drifted" bug without
   needing a server. Run: node scripts/check-api.cjs */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "services", "api.js");
const src = fs.readFileSync(file, "utf8");

const SPEC = [
  ["POST", "/users/register"],
  ["POST", "/users/login"],
  ["GET", "/users/me"],
  ["GET", "/projects"],
  ["GET", "/projects/:id"],
  ["POST", "/projects"],
  ["PUT", "/projects/:id"],
  ["DELETE", "/projects/:id"],
  ["POST", "/contact"],
  ["GET", "/blog"],
  ["GET", "/blog/:id"],
  ["POST", "/blog"],
  ["PUT", "/blog/:id"],
  ["DELETE", "/blog/:id"],
  ["GET", "/blog/:postId/comments"],
  ["POST", "/blog/:postId/comments"],
];

const OPTIONAL = [["GET", "/admin/stats"], ["GET", "/admin/activity"]];

const normalize = (p) =>
  p
    .replace(/\$\{[^}]+\}/g, ":id")
    .replace(/\/:id\/comments/g, "/:postId/comments")
    .replace(/\/:id$/g, "/:id");

const calls = [];
const re = /http\.(get|post|put|delete)\(\s*[`"']([^`"']+)[`"']/g;
let m;
while ((m = re.exec(src))) {
  calls.push([m[1].toUpperCase(), normalize(m[2])]);
}

const key = ([method, p]) => `${method} ${p}`;
const known = new Set([...SPEC, ...OPTIONAL].map(key));
const seen = new Set(calls.map(key));

const unknown = [...seen].filter((k) => !known.has(k));
const missing = SPEC.map(key).filter((k) => !seen.has(k));

console.log("requests found:", seen.size);
[...seen].sort().forEach((k) => console.log("  " + k + (known.has(k) ? "" : "   <-- NOT IN SPEC")));

if (missing.length) {
  console.log("\nspec endpoints the UI never calls:");
  missing.forEach((k) => console.log("  " + k));
}
console.log("\nunknown:", unknown.length, "| uncovered spec endpoints:", missing.length);

process.exit(unknown.length ? 1 : 0);
