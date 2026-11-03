/* Repair the one known defect: missing ':' between db username and password.
   Only touches the credential segment, leaves password bytes untouched. */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const raw = fs.readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);
const idx = lines.findIndex((l) => l.startsWith("MONGODB_URI="));
if (idx === -1) {
  console.log("FAIL  no MONGODB_URI");
  process.exit(1);
}

const PREFIX = "mongodb+srv://";
let uri = lines[idx].slice("MONGODB_URI=".length).trim();
const USER = "3858293197_db_user";

if (!uri.startsWith(PREFIX + USER)) {
  console.log("FAIL  URI does not start with " + PREFIX + USER + " — refusing to edit automatically");
  process.exit(1);
}

const rest = uri.slice(PREFIX.length + USER.length);
if (rest.startsWith(":")) {
  console.log("nothing to fix: the colon is already there");
} else {
  uri = PREFIX + USER + ":" + rest;
  lines[idx] = "MONGODB_URI=" + uri;
  fs.writeFileSync(envPath, lines.join("\n"), "utf8");
  console.log("added the missing colon");
}

/* re-mask to confirm */
const mask = uri
  .split("")
  .map((c) => (/[a-z]/.test(c) ? "a" : /[A-Z]/.test(c) ? "A" : /[0-9]/.test(c) ? "9" : c))
  .join("");
console.log("structure after fix:", mask);

const at = uri.lastIndexOf("@");
const cred = uri.slice(PREFIX.length, at);
const colon = cred.indexOf(":");
console.log("credentials -> user:", cred.slice(0, colon), "| password length:", cred.length - colon - 1);
