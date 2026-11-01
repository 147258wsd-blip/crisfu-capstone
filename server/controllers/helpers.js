/* Shared helpers for the controllers. */

/* description / content carry a JSON payload from the frontend adapter,
   but may also be plain text someone typed straight into Atlas. Reading
   it should never throw. */
function readMeta(text) {
  if (typeof text !== "string") return {};
  const t = text.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return {};
  try {
    const value = JSON.parse(t);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (err) {
    return {};
  }
}

/* Only copy fields the schema actually declares. Without this a client
   could set `user` on a project and hand ownership to someone else. */
function pick(source, fields) {
  const out = {};
  for (const field of fields) {
    if (source && source[field] !== undefined) out[field] = source[field];
  }
  return out;
}

/* "3 minutes ago" for the admin activity feed. */
function relativeLabel(value) {
  const at = value ? new Date(value).getTime() : 0;
  if (!at) return "just now";
  const diff = Date.now() - at;
  if (diff < 60_000) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(at).toISOString().slice(0, 10);
}

module.exports = { readMeta, pick, relativeLabel };
