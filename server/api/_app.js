/**
 * Shared Vercel serverless entry point.
 *
 * Vercel invokes a Node function as `fn(req, res)` with the raw Node request.
 * An Express app *is* such a function, so `app(req, res)` handles the rest —
 * routing, body parsing, errors — exactly as it does under `app.listen`.
 *
 * The one thing Express cannot do for us here is hold a process open, so the
 * Mongo connection has to be established (and reused) per warm instance.
 * Serverless spins up a new instance for every cold start; without caching,
 * each one would open a fresh Atlas connection and we would hit the cluster's
 * connection limit. `global` survives across invocations of the same instance.
 *
 * Files starting with `_` are not turned into routes by Vercel, which is why
 * this helper lives here instead of being a fourth endpoint.
 */

const { app } = require("../server");
const { connectDB } = require("../config/db");

let inFlight = null;

function ensureConnected() {
  if (global.__cfDbState === "ready") return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = connectDB()
    .then(() => {
      global.__cfDbState = "ready";
    })
    .catch((err) => {
      /* let the next invocation retry instead of caching the failure forever */
      inFlight = null;
      global.__cfDbState = null;
      throw err;
    });

  return inFlight;
}

module.exports = async function handler(req, res) {
  try {
    await ensureConnected();
  } catch (err) {
    console.error("[api] database unavailable:", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        success: false,
        message: "Database unavailable. Check MONGODB_URI in the deployment environment.",
      })
    );
    return;
  }

  return app(req, res);
};
