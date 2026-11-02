const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/* Sign a token for a user id. The payload stays minimal on purpose —
   anything else (username, email) can change, and a stale claim in a
   token is worse than one extra database read. */
function signToken(userId) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/* Gate for every write endpoint. A missing, malformed, expired or
   orphaned token all produce the same 401 so the client's interceptor
   can clear the session and bounce to /login. */
async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Not authorised — no token provided."));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    /* the error middleware turns these into 401 with a nicer message */
    return next(err);
  }

  /* password is select:false, so this document never carries the hash */
  const user = await User.findById(payload.id);
  if (!user) {
    return next(ApiError.unauthorized("Not authorised — that account no longer exists."));
  }

  req.user = user;
  return next();
}

/* Ownership check. Loads the document once, verifies the caller owns it,
   and hands it to the controller via req.resource so we do not query twice. */
function owns(Model, { field = "user", param = "id", label = "resource" } = {}) {
  return async function ownership(req, res, next) {
    const doc = await Model.findById(req.params[param]);
    if (!doc) return next(ApiError.notFound(`No ${label} with that id.`));

    const owner = doc[field];
    if (!owner || String(owner) !== String(req.user._id)) {
      return next(ApiError.forbidden(`You can only change ${label}s you created.`));
    }

    req.resource = doc;
    return next();
  };
}

/* Second gate, mounted after protect on every write endpoint.
   `protect` only answers "is this a real, unexpired session?" — it says
   nothing about who the caller is. Without this check any visitor could
   register an account and publish to the portfolio, or read the inbox.
   403 rather than 401 on purpose: the session is valid, the permission
   is not, and the client should not clear the token and bounce to login. */
function requireAdmin(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized("Not authorised — no session."));
  if (req.user.role !== "admin") {
    return next(ApiError.forbidden("This account can read the site but not change it."));
  }
  return next();
}

module.exports = { signToken, protect, requireAdmin, owns };
