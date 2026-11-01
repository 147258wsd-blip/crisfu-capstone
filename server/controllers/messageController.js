const Message = require("../models/Message");
const ApiError = require("../utils/ApiError");

/* POST /api/contact — public. Visitors write without an account, which
   is the whole point of the model being detached from User. */
async function create(req, res) {
  const source = req.body || {};
  const payload = {
    name: String(source.name || "").trim(),
    email: String(source.email || "").trim(),
    message: String(source.message || source.msg || "").trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    throw ApiError.badRequest("Name, email and message are all required.");
  }

  const saved = await Message.create(payload);
  res.status(201).json({
    success: true,
    message: "Thanks — your message is in the database.",
    id: String(saved._id),
  });
}

/* GET /api/contact — protected. Read-only inbox for the dashboard,
   which is how you prove the form actually persists. */
async function list(req, res) {
  const messages = await Message.find().sort({ createdAt: -1 }).lean();
  const unread = messages.filter((m) => !m.read).length;
  res.json({ success: true, count: messages.length, unread, messages });
}

/* PATCH /api/contact/:id/read — protected */
async function markRead(req, res) {
  const updated = await Message.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );
  if (!updated) throw ApiError.notFound("No message with that id.");
  res.json({ success: true, message: updated });
}

module.exports = { create, list, markRead };
