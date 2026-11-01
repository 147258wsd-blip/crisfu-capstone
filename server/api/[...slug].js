/* `GET|POST /api/**` — every route below the /api prefix.
 *
 * Vercel keeps the original URL in `req.url` for a catch-all function, so the
 * Express router still sees `/api/projects/…` and matches it the same way it
 * does locally. The slug itself is never read. */
module.exports = require("./_app");
