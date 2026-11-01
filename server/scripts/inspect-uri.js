/* Print a structural mask of the URI: letters -> a, digits -> 9,
   punctuation kept. Lets us see where '@', ':', '/' sit without
   revealing the actual password. */
const fs = require("fs");
const path = require("path");

const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("MONGODB_URI="));
const uri = line.slice("MONGODB_URI=".length).trim().replace(/^["']|["']$/g, "");

const mask = uri
  .split("")
  .map((c) => {
    if (/[a-z]/.test(c)) return "a";
    if (/[A-Z]/.test(c)) return "A";
    if (/[0-9]/.test(c)) return "9";
    return c;
  })
  .join("");

console.log("原串长度:", uri.length);
console.log("结构掩码:");
console.log(mask);

const ats = [...uri].reduce((acc, c, i) => (c === "@" ? acc.concat(i) : acc), []);
console.log("\n@ 出现位置:", ats.join(", ") || "无");
console.log(": 出现位置:", [...uri].reduce((acc, c, i) => (c === ":" ? acc.concat(i) : acc), []).join(", ") || "无");
