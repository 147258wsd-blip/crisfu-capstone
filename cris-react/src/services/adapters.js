/* =========================================================
   adapters.js — the translation layer between the Express API
   and the shapes the pages were written against.

   The Capstone spec fixes the database field names:
     Project   title, description, imageUrl, repoUrl, liveUrl, user
     BlogPost  title, content, author, timestamps
     Comment   body, author, post, timestamps
     Message   name, email, message
     User      username, email, password
   The pages, on the other hand, use a richer vocabulary (blurb,
   demo, body blocks, at, msg…). Everything that crosses the
   network passes through here, so no page has to care which
   naming convention the server uses.

   description / content are the only String columns that must
   carry structured data, so they hold a JSON payload and fall
   back to plain text when someone types into the database by
   hand. That keeps `required: true` satisfied and the detail
   pages intact.
   ========================================================= */

const str = (v, d = "") => (v == null || v === "" ? d : String(v));

/* Project covers are stored in the database as "/shots/xxx.png". That is
   correct when the site is served from the domain root, but a GitHub Pages
   project site lives under /<repo>/, so an absolute path would 404. Prefix
   relative paths with the build-time base; leave full URLs alone. */
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

export function assetUrl(u) {
  const raw = str(u);
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  return `${BASE}/${raw.replace(/^\/+/, "")}`;
}

/* list payloads may arrive as [] or { projects: [] } / { posts: [] } */
export function unwrap(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function parsePayload(text) {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return null;
  try {
    const v = JSON.parse(t);
    return v && typeof v === "object" ? v : null;
  } catch (e) {
    return null;
  }
}

/* ---------- dates ---------- */

const DAY = 86400000;

export function isoDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function dateLabel(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function relativeLabel(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "just now";
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(diff / 3600000);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(diff / DAY);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return dateLabel(d);
}

/* ---------- author ---------- */

/* the spec says comments/posts are populated with the author's
   username; tolerate a bare id or a plain string too */
export function authorName(value, fallback = "Reader") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return str(value.username || value.name || value.email, fallback);
}

/* ---------- user ---------- */

export function adaptUser(raw, token) {
  if (!raw) return null;
  const user = raw.user || raw;
  /* `role` arrived after the first deploy. A response without it comes from
     the older API, which had no gate at all — so treating that case as admin
     states the truth instead of locking the author out of their own
     dashboard while the function is still the previous version. Once the API
     always sends a role, the fallback never runs. */
  const role = str(user.role).toLowerCase();
  return {
    id: str(user._id || user.id),
    name: str(user.username || user.name || (user.email ? String(user.email).split("@")[0] : ""), "You"),
    email: str(user.email),
    role: role ? (role === "admin" ? "admin" : "member") : "admin",
    token: str(token || raw.token || raw.accessToken || user.token),
  };
}

/* ---------- project ---------- */

export function adaptProject(raw) {
  if (!raw) return null;
  const packed = parsePayload(raw.description);
  const d = packed && !Array.isArray(packed) ? packed : {};
  const plain = packed ? "" : str(raw.description);

  return {
    id: str(raw._id || raw.id),
    title: str(raw.title, "Untitled"),
    year: str(d.year || isoDate(raw.createdAt).slice(0, 4)),
    cat: str(d.cat, "Project"),
    blurb: str(d.blurb, plain.split(/\n{2,}/)[0] || ""),
    cover: Number(d.cover) || 1,
    coverLabel: str(d.coverLabel, d.cat || "Project"),
    tags: Array.isArray(d.tags) ? d.tags : [],
    role: str(d.role),
    stack: Array.isArray(d.stack) ? d.stack : [],
    timeline: str(d.timeline),
    problem: str(d.problem, plain),
    built: Array.isArray(d.built) ? d.built : [],
    learned: str(d.learned),
    demo: realLink(raw.liveUrl || d.demo),
    source: realLink(raw.repoUrl || d.source),
    imageUrl: assetUrl(raw.imageUrl || d.imageUrl),
    owner: authorName(raw.user, ""),
    status: str(d.status, raw.status || "live"),
    /* One honest sentence per project: how far it actually got. Rendered as
       "Current status" on the detail page and as a badge on the card. */
    statusNote: str(d.statusNote),
    /* Extra links that are not the two spec columns (repoUrl / liveUrl),
       e.g. an API reference. [{label, href}] */
    links: Array.isArray(d.links) ? d.links.filter((l) => l && l.label && l.href) : [],
    createdAt: raw.createdAt || null,
  };
}

/* A link only counts if it goes somewhere real. The seed used "#" as a
   placeholder, which rendered a button that did nothing. */
export function realLink(href) {
  const h = str(href).trim();
  if (!h || h === "#" || h === "javascript:void(0)") return "";
  return h;
}

/* page payload -> API payload (only the columns the spec defines) */
export function encodeProject(p = {}) {
  const packed = {
    blurb: str(p.blurb),
    problem: str(p.problem),
    built: Array.isArray(p.built) ? p.built : [],
    learned: str(p.learned),
    stack: Array.isArray(p.stack) ? p.stack : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    role: str(p.role),
    timeline: str(p.timeline),
    year: str(p.year),
    cat: str(p.cat, "Project"),
    cover: Number(p.cover) || 1,
    coverLabel: str(p.coverLabel, p.cat || "Project"),
    status: str(p.status, "live"),
    statusNote: str(p.statusNote),
    links: Array.isArray(p.links) ? p.links.filter((l) => l && l.label && l.href) : [],
  };
  return {
    title: str(p.title),
    description: JSON.stringify(packed),
    imageUrl: str(p.imageUrl),
    repoUrl: realLink(p.source),
    liveUrl: realLink(p.demo),
  };
}

/* ---------- blog post ---------- */

function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => {
      if (typeof b === "string") return b;
      if (!b) return "";
      if (b.type === "ul" || b.type === "ol") return (b.items || []).join(" ");
      if (b.type === "quote") return str(b.text);
      if (b.type === "h2" || b.type === "h3") return str(b.text);
      return str(b.text);
    })
    .filter(Boolean)
    .join(" ");
}

function decodeBody(content) {
  const packed = parsePayload(content);
  if (Array.isArray(packed)) return packed;
  if (packed && Array.isArray(packed.body)) return packed.body;

  /* plain text: split on blank lines, treat #/## as headings */
  const parts = str(content)
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!parts.length) return [];
  return parts.map((t) => {
    const h = t.match(/^(#{2,3})\s+(.*)$/);
    if (h) return { type: "h2", text: h[2] };
    if (t.startsWith("> ")) return { type: "quote", text: t.slice(2) };
    return { type: "p", text: t };
  });
}

export function adaptPost(raw) {
  if (!raw) return null;
  const packed = parsePayload(raw.content);
  const body = decodeBody(raw.content);
  const text = blocksToText(body);
  const meta = packed && !Array.isArray(packed) ? packed : {};
  return {
    id: str(raw._id || raw.id),
    title: str(raw.title, "Untitled"),
    date: isoDate(raw.createdAt || raw.date),
    dateLabel: dateLabel(raw.createdAt || raw.date),
    cat: str(meta.cat, "Notes"),
    read: Number(meta.read) || Math.max(3, Math.round(text.length / 220)),
    excerpt: str(meta.excerpt, text.slice(0, 160)),
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    body,
    author: authorName(raw.author, "Cris"),
    status: str(meta.status, raw.status || "live"),
    comments: Array.isArray(raw.comments) ? raw.comments.map(adaptComment) : undefined,
    createdAt: raw.createdAt || null,
  };
}

export function encodePost(p = {}) {
  return {
    title: str(p.title),
    content: JSON.stringify({
      body: Array.isArray(p.body) ? p.body : [],
      excerpt: str(p.excerpt),
      cat: str(p.cat, "Notes"),
      tags: Array.isArray(p.tags) ? p.tags : [],
      read: Number(p.read) || 0,
      status: str(p.status, "live"),
    }),
  };
}

/* ---------- comment ---------- */

export function adaptComment(raw) {
  if (!raw) return null;
  return {
    id: str(raw._id || raw.id),
    name: authorName(raw.author, "Reader"),
    at: raw.createdAt ? relativeLabel(raw.createdAt) : str(raw.at, "just now"),
    text: str(raw.body || raw.text),
    createdAt: raw.createdAt || null,
  };
}

export function encodeComment(text) {
  return { body: str(text) };
}

/* ---------- skill ---------- */

/* The spec has no fixed Skill columns, so the model is deliberately small:
   name / category / level (1-5) / order. The home page only needs the
   grouped names, the dashboard needs the level to edit it. */
export function adaptSkill(raw) {
  if (!raw) return null;
  return {
    id: str(raw._id || raw.id),
    name: str(raw.name, "Untitled"),
    category: str(raw.category, "Other"),
    level: Math.min(5, Math.max(1, Number(raw.level) || 3)),
    order: Number(raw.order) || 0,
  };
}

export function encodeSkill(s = {}) {
  return {
    name: str(s.name),
    category: str(s.category, "Other"),
    level: Math.min(5, Math.max(1, Number(s.level) || 3)),
    order: Number(s.order) || 0,
  };
}

/* "Frontend, Backend, Tools" in a fixed order rather than alphabetically —
   the toolbox reads as a progression and a category added later should not
   silently jump to the front. */
export const SKILL_CATEGORIES = ["Frontend", "Backend", "Tools", "Design", "Other"];

export function groupSkills(list) {
  const buckets = new Map();
  for (const s of list || []) {
    const key = s.category || "Other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }

  const rank = (c) => {
    const i = SKILL_CATEGORIES.indexOf(c);
    return i === -1 ? SKILL_CATEGORIES.length : i;
  };

  return [...buckets.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([title, items]) => ({
      title,
      items: items.slice().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map((s) => s.name),
    }));
}

/* ---------- message ---------- */

export function encodeMessage(p = {}) {
  return {
    name: str(p.name),
    email: str(p.email),
    message: str(p.msg || p.message),
  };
}

export function adaptMessage(raw) {
  if (!raw) return null;
  return {
    id: str(raw._id || raw.id),
    name: str(raw.name, "Anonymous"),
    email: str(raw.email),
    msg: str(raw.message || raw.msg),
    read: Boolean(raw.read),
    at: raw.createdAt ? relativeLabel(raw.createdAt) : str(raw.at, ""),
    createdAt: raw.createdAt || null,
  };
}
