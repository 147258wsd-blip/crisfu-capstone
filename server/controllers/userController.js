const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../middleware/auth");

/* POST /api/users/register */
async function register(req, res) {
  const { username, name, email, password } = req.body || {};
  const handle = (username || name || "").trim();

  if (!handle || !email || !password) {
    throw ApiError.badRequest("Username, email and password are all required.");
  }
  if (String(password).length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters.");
  }

  const taken = await User.findOne({
    $or: [{ email: String(email).toLowerCase() }, { username: handle }],
  });
  if (taken) {
    const which = String(taken.email).toLowerCase() === String(email).toLowerCase() ? "email" : "username";
    throw ApiError.conflict(`That ${which} is already registered. Try signing in instead.`);
  }

  const user = await User.create({ username: handle, email, password });
  const token = signToken(user._id);

  res.status(201).json({ success: true, token, user: user.toSafeJSON() });
}

/* POST /api/users/login */
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw ApiError.badRequest("Email and password are required.");

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");

  /* Same message for "no such account" and "wrong password" — telling them
     apart would let anyone enumerate registered emails. */
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Those credentials do not match our records.");
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: user.toSafeJSON() });
}

/* GET /api/users/me — also the frontend's token re-validation call */
async function me(req, res) {
  res.json({ success: true, user: req.user.toSafeJSON() });
}

module.exports = { register, login, me };
