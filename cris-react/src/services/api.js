/* =========================================================
   api.js — the only place that knows whether data is mock or real.

   USE_MOCK = true  → reads from src/data + localStorage with a
                      simulated 380–700ms latency, so the Loading
                      skeletons and Error/Retry states are real.
   USE_MOCK = false → hits the Express API via services/http.js.

   Every function below has the same signature in both modes, so
   nothing in components/pages has to change on switch day.
   ========================================================= */
import { projects as seedProjects, posts as seedPosts } from "../data/site";
import { byLang } from "../data/topics";
import { http, ApiError, TOKEN_KEY, SESSION_KEY, readToken } from "./http";
import {
  adaptProject,
  encodeProject,
  adaptSkill,
  encodeSkill,
  adaptPost,
  encodePost,
  adaptComment,
  encodeComment,
  adaptMessage,
  adaptUser,
  encodeMessage,
  unwrap,
} from "./adapters";

/* Default is mock so a fresh clone runs with no backend at all.
   Set VITE_USE_MOCK=false (see .env.local) to talk to Express. */
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

/* ---------- storage keys (kept from the static prototype) ---------- */
const SES_KEY = SESSION_KEY;
const PKEY = "cf.admin.projects";
const SKEY = "cf.admin.posts";
const KKEY = "cf.admin.skills";
const LKEY = "cf.admin.log";
const OUTBOX = "cf.outbox";
const MATCHES = "cf.debate.matches";
const commentsKey = (postId) => `cf.comments.${postId}`;

/* ---------- mock plumbing ---------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const latency = (base = 380) => base + Math.round(Math.random() * 320);

export function isFailureForced() {
  try {
    if (new URLSearchParams(window.location.search).get("fail") === "1") return true;
    return localStorage.getItem("cf.simulateFailure") === "1";
  } catch (e) {
    return false;
  }
}

export function setFailureForced(on) {
  try {
    if (on) localStorage.setItem("cf.simulateFailure", "1");
    else localStorage.removeItem("cf.simulateFailure");
  } catch (e) {
    /* ignore */
  }
}

async function mock(work, ms) {
  await wait(ms || latency());
  if (isFailureForced()) {
    throw new ApiError("Mock API is in failure mode — this is the error state you are seeing.", 0);
  }
  return work();
}

/* ---------- tiny storage helpers ---------- */
function readJSON(key, fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    return raw == null ? fallback : raw;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* quota / private mode: the UI still works, it just forgets */
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------- seeded stores ---------- */
function seedAdminProjects() {
  return seedProjects.map((p) => ({
    id: p.id,
    title: p.title,
    cat: p.cat,
    year: p.year,
    blurb: p.blurb,
    status: "live",
  }));
}

function seedAdminPosts() {
  return seedPosts.map((p, i) => ({
    id: p.id,
    title: p.title,
    cat: p.cat,
    date: p.dateLabel,
    status: i === seedPosts.length - 1 ? "draft" : "live",
  }));
}

const SEED_LOG = [
  { t: "Debate Simulator published", at: "2 days ago" },
  { t: "New post: Why I shipped an entire web app inside one HTML file", at: "4 days ago" },
  { t: "3 comments awaiting reply", at: "1 week ago" },
];

/* Mock-mode copy of the toolbox. The real build reads /api/skills — this
   only exists so `npm run dev` with no server still renders the section. */
const SEED_SKILLS = [
  ["React", "Frontend", 5],
  ["JavaScript", "Frontend", 5],
  ["TypeScript", "Frontend", 4],
  ["Tailwind", "Frontend", 4],
  ["HTML / CSS", "Frontend", 5],
  ["Vite", "Frontend", 4],
  ["Node.js", "Backend", 5],
  ["Express", "Backend", 4],
  ["MongoDB", "Backend", 4],
  ["Mongoose", "Backend", 4],
  ["REST API", "Backend", 5],
  ["JWT", "Backend", 4],
  ["Git", "Tools", 4],
  ["Postman", "Tools", 4],
  ["Vercel", "Tools", 4],
  ["Render", "Tools", 3],
  ["Figma", "Tools", 3],
  ["Linux", "Tools", 4],
].map(([name, category, level], i) => ({ id: "k-" + (i + 1), name, category, level, order: i + 1 }));

const SEED_COMMENTS = [
  {
    id: "c1",
    name: "Mia",
    at: "2 days ago",
    text: "The part about dead code being impossible to ignore in a single file — that is exactly why I stopped using one. It made me tidy, and I resented it.",
  },
  {
    id: "c2",
    name: "Devon",
    at: "5 days ago",
    text: "Curious how you handled the checker finding 348 problems. Did you rewrite them by hand or generate candidates?",
  },
];

function listOf(key, seedFn) {
  const raw = readJSON(key, null);
  if (Array.isArray(raw)) return raw;
  const seeded = seedFn();
  writeJSON(key, seeded);
  return seeded;
}

/* ---------- session ---------- */
export function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SES_KEY) || "null");
    if (!raw || typeof raw !== "object" || !raw.email) return null;
    return {
      name: String(raw.name || raw.email.split("@")[0]),
      email: String(raw.email),
      token: String(raw.token || ""),
    };
  } catch (e) {
    return null;
  }
}

function persistSession(session) {
  try {
    localStorage.setItem(SES_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_KEY, session.token);
  } catch (e) {
    /* ignore */
  }
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(SES_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* ignore */
  }
}

const makeToken = () => "mock." + Math.random().toString(36).slice(2) + Date.now().toString(36);

/* =========================================================
   public API
   ========================================================= */
export const api = {
  /* ---------------- auth ---------------- */
  auth: {
    async login({ email, password }) {
      if (!USE_MOCK) {
        const { data } = await http.post("/users/login", { email, password });
        return persistSession(adaptUser(data));
      }
      return mock(() => {
        if (String(password) === "wrongpass") {
          throw new ApiError("Those credentials do not match our records.", 401);
        }
        return persistSession({
          name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          email,
          token: makeToken(),
        });
      });
    },

    async register({ name, email, password }) {
      if (!USE_MOCK) {
        /* the spec's User model uses `username`, the form field is `name` */
        const { data } = await http.post("/users/register", { username: name, email, password });
        return persistSession(adaptUser(data));
      }
      return mock(() => persistSession({ name, email, token: makeToken() }));
    },

    async me() {
      if (!USE_MOCK) {
        const { data } = await http.get("/users/me");
        const session = adaptUser(data, readToken());
        return session && session.email ? session : null;
      }
      return readSession();
    },
  },

  /* ---------------- projects ---------------- */
  projects: {
    async list({ cat } = {}) {
      if (!USE_MOCK) {
        const { data } = await http.get("/projects", { params: cat && cat !== "All" ? { cat } : {} });
        return unwrap(data, "projects").map(adaptProject);
      }
      return mock(() => {
        const all = clone(seedProjects);
        return cat && cat !== "All" ? all.filter((p) => p.cat === cat) : all;
      });
    },

    async get(id) {
      if (!USE_MOCK) {
        const { data } = await http.get(`/projects/${id}`);
        return adaptProject(data.project || data);
      }
      return mock(() => {
        const found = seedProjects.find((p) => p.id === id);
        if (!found) throw new ApiError("We could not find a project with that id.", 404);
        return clone(found);
      });
    },
  },

  /* ---------------- skills ----------------
     The toolbox is a collection on the server, not a constant in Home.jsx,
     so adding a skill is a write through this same module. */
  skills: {
    async list({ category } = {}) {
      if (!USE_MOCK) {
        const { data } = await http.get("/skills", {
          params: category && category !== "All" ? { category } : {},
        });
        return unwrap(data, "skills").map(adaptSkill);
      }
      return mock(() => {
        const all = clone(SEED_SKILLS);
        return category && category !== "All" ? all.filter((s) => s.category === category) : all;
      });
    },
  },

  /* ---------------- posts ---------------- */
  posts: {
    async list({ cat } = {}) {
      if (!USE_MOCK) {
        const { data } = await http.get("/blog", { params: cat && cat !== "All" ? { cat } : {} });
        return unwrap(data, "posts").map(adaptPost);
      }
      return mock(() => {
        const all = clone(seedPosts);
        return cat && cat !== "All" ? all.filter((p) => p.cat === cat) : all;
      });
    },

    async get(id) {
      if (!USE_MOCK) {
        const { data } = await http.get(`/blog/${id}`);
        return adaptPost(data.post || data);
      }
      return mock(() => {
        const found = seedPosts.find((p) => p.id === id);
        if (!found) throw new ApiError("That post does not exist (or was renamed).", 404);
        return clone(found);
      });
    },

    async comments(postId) {
      if (!USE_MOCK) {
        const { data } = await http.get(`/blog/${postId}/comments`);
        return unwrap(data, "comments").map(adaptComment);
      }
      return mock(() => {
        const stored = readJSON(commentsKey(postId), null);
        return Array.isArray(stored) ? stored : clone(SEED_COMMENTS);
      }, 280);
    },

    async addComment(postId, { name, text }) {
      if (!USE_MOCK) {
        const { data } = await http.post(`/blog/${postId}/comments`, encodeComment(text));
        return adaptComment(data.comment || data);
      }
      return mock(() => {
        const stored = readJSON(commentsKey(postId), null);
        const list = Array.isArray(stored) ? stored : clone(SEED_COMMENTS);
        const comment = { id: "c" + Date.now(), name, at: "just now", text };
        const next = list.concat(comment);
        writeJSON(commentsKey(postId), next);
        return comment;
      }, 420);
    },
  },

  /* ---------------- contact ---------------- */
  contact: {
    async send(payload) {
      if (!USE_MOCK) {
        const { data } = await http.post("/contact", encodeMessage(payload));
        return adaptMessage(data.message || data) || { ok: true };
      }
      return mock(() => {
        const box = readJSON(OUTBOX, []);
        const list = Array.isArray(box) ? box : [];
        list.push({ ...payload, at: new Date().toISOString() });
        writeJSON(OUTBOX, list);
        return { ok: true };
      }, 520);
    },

    /* the inbox behind /admin — GET /api/contact is protected, so this
       only works with a token and only for the signed-in account */
    async list() {
      if (!USE_MOCK) {
        const { data } = await http.get("/contact");
        return unwrap(data, "messages").map(adaptMessage);
      }
      return mock(() => {
        const box = readJSON(OUTBOX, []);
        return (Array.isArray(box) ? box : []).map((m, i) => ({
          id: "m" + i,
          name: m.name || "Anonymous",
          email: m.email || "",
          msg: m.msg || m.message || "",
          read: false,
          at: m.at || "",
          createdAt: m.at || null,
        }));
      }, 320);
    },

    async markRead(id) {
      if (!USE_MOCK) {
        /* PUT, not PATCH: the Function Compute HTTP trigger refuses PATCH at the
           gateway (403) before the request reaches Express. Both verbs are wired
           to the same handler, so the contract is unchanged. */
        const { data } = await http.put(`/contact/${id}/read`);
        return adaptMessage(data.message || data);
      }
      return mock(() => ({ ok: true }), 220);
    },
  },

  /* ---------------- admin ---------------- */
  admin: {
    async projects() {
      if (!USE_MOCK) {
        const { data } = await http.get("/projects");
        return unwrap(data, "projects").map(adaptProject);
      }
      return mock(() => clone(listOf(PKEY, seedAdminProjects)), 320);
    },

    async posts() {
      if (!USE_MOCK) {
        const { data } = await http.get("/blog");
        return unwrap(data, "posts").map(adaptPost);
      }
      return mock(() => clone(listOf(SKEY, seedAdminPosts)), 320);
    },

    async skills() {
      if (!USE_MOCK) {
        const { data } = await http.get("/skills");
        return unwrap(data, "skills").map(adaptSkill);
      }
      return mock(() => clone(listOf(KKEY, () => SEED_SKILLS)), 320);
    },

    async log() {
      if (!USE_MOCK) {
        const { data } = await http.get("/admin/activity");
        return unwrap(data, "activity");
      }
      return mock(() => clone(listOf(LKEY, () => SEED_LOG)), 260);
    },

    async createProject(payload) {
      if (!USE_MOCK) {
        const { data } = await http.post("/projects", encodeProject(payload));
        return adaptProject(data.project || data);
      }
      return mock(() => {
        const list = listOf(PKEY, seedAdminProjects);
        const item = { ...payload, id: "p-" + Date.now() };
        const next = [item, ...list];
        writeJSON(PKEY, next);
        pushLog(`Created project “${item.title}”`);
        return item;
      }, 420);
    },

    async updateProject(id, payload) {
      if (!USE_MOCK) {
        const { data } = await http.put(`/projects/${id}`, encodeProject(payload));
        return adaptProject(data.project || data);
      }
      return mock(() => {
        const list = listOf(PKEY, seedAdminProjects).map((p) => (p.id === id ? { ...p, ...payload } : p));
        writeJSON(PKEY, list);
        pushLog(`Updated project “${payload.title}”`);
        return list.find((p) => p.id === id);
      }, 420);
    },

    async deleteProject(id) {
      if (!USE_MOCK) {
        const { data } = await http.delete(`/projects/${id}`);
        return data;
      }
      return mock(() => {
        const list = listOf(PKEY, seedAdminProjects);
        const victim = list.find((p) => p.id === id);
        writeJSON(PKEY, list.filter((p) => p.id !== id));
        if (victim) pushLog(`Deleted project “${victim.title}”`);
        return { ok: true };
      }, 380);
    },

    async createSkill(payload) {
      if (!USE_MOCK) {
        const { data } = await http.post("/skills", encodeSkill(payload));
        return adaptSkill(data.skill || data);
      }
      return mock(() => {
        const list = listOf(KKEY, () => SEED_SKILLS);
        const item = { ...payload, id: "k-" + Date.now() };
        writeJSON(KKEY, [...list, item]);
        pushLog(`Added skill “${item.name}”`);
        return item;
      }, 380);
    },

    async updateSkill(id, payload) {
      if (!USE_MOCK) {
        const { data } = await http.put(`/skills/${id}`, encodeSkill(payload));
        return adaptSkill(data.skill || data);
      }
      return mock(() => {
        const list = listOf(KKEY, () => SEED_SKILLS).map((s) => (s.id === id ? { ...s, ...payload } : s));
        writeJSON(KKEY, list);
        pushLog(`Updated skill “${payload.name}”`);
        return list.find((s) => s.id === id);
      }, 380);
    },

    async deleteSkill(id) {
      if (!USE_MOCK) {
        const { data } = await http.delete(`/skills/${id}`);
        return data;
      }
      return mock(() => {
        const list = listOf(KKEY, () => SEED_SKILLS);
        const victim = list.find((s) => s.id === id);
        writeJSON(KKEY, list.filter((s) => s.id !== id));
        if (victim) pushLog(`Removed skill “${victim.name}”`);
        return { ok: true };
      }, 340);
    },

    async createPost(payload) {
      if (!USE_MOCK) {
        const { data } = await http.post("/blog", encodePost(payload));
        return adaptPost(data.post || data);
      }
      return mock(() => {
        const list = listOf(SKEY, seedAdminPosts);
        const item = { ...payload, id: "n-" + Date.now() };
        writeJSON(SKEY, [item, ...list]);
        pushLog(`Created post “${item.title}”`);
        return item;
      }, 420);
    },

    async updatePost(id, payload) {
      if (!USE_MOCK) {
        const { data } = await http.put(`/blog/${id}`, encodePost(payload));
        return adaptPost(data.post || data);
      }
      return mock(() => {
        const list = listOf(SKEY, seedAdminPosts).map((p) => (p.id === id ? { ...p, ...payload } : p));
        writeJSON(SKEY, list);
        pushLog(`Updated post “${payload.title}”`);
        return list.find((p) => p.id === id);
      }, 420);
    },

    async deletePost(id) {
      if (!USE_MOCK) {
        const { data } = await http.delete(`/blog/${id}`);
        return data;
      }
      return mock(() => {
        const list = listOf(SKEY, seedAdminPosts);
        const victim = list.find((p) => p.id === id);
        writeJSON(SKEY, list.filter((p) => p.id !== id));
        if (victim) pushLog(`Deleted post “${victim.title}”`);
        return { ok: true };
      }, 380);
    },

    async counts() {
      if (!USE_MOCK) {
        const { data } = await http.get("/admin/stats");
        return data;
      }
      return mock(() => {
        const projects = listOf(PKEY, seedAdminProjects);
        const posts = listOf(SKEY, seedAdminPosts);
        let comments = 0;
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.indexOf("cf.comments.") === 0) {
              const arr = readJSON(key, []);
              if (Array.isArray(arr)) comments += arr.length;
            }
          }
        } catch (e) {
          /* ignore */
        }
        const box = readJSON(OUTBOX, []);
        return {
          projects: projects.length,
          skills: listOf(KKEY, () => SEED_SKILLS).length,
          posts: posts.length,
          comments,
          inbox: Array.isArray(box) ? box.length : 0,
        };
      }, 260);
    },
  },

  /* ---------------- debate ----------------
     The topic library ships with the client and match history is a
     per-browser record, so neither touches the API. The spec has no
     model for them; keep them out of the back-end contract. */
  debate: {
    async topics(lang = "en") {
      await wait(260);
      return clone(byLang(lang));
    },

    async saveMatch(match) {
      await wait(220);
      const list = readJSON(MATCHES, []);
      const next = (Array.isArray(list) ? list : []).concat({ ...match, at: new Date().toISOString() });
      writeJSON(MATCHES, next.slice(-40));
      return { ok: true };
    },
  },
};

function pushLog(text) {
  const list = listOf(LKEY, () => SEED_LOG);
  const next = [{ t: text, at: "just now" }, ...list].slice(0, 6);
  writeJSON(LKEY, next);
}

export const CATEGORIES = {
  projects: ["All", ...Array.from(new Set(seedProjects.map((p) => p.cat)))],
  posts: ["All", ...Array.from(new Set(seedPosts.map((p) => p.cat)))],
};

export { topics } from "../data/topics";
