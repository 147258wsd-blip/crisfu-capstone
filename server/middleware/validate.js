const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

/* A bad-looking id should be a 404 ("no such project"), not a 500 from
   Mongoose's CastError — the frontend already renders a friendly
   "we could not find that" state for 404s. */
function validId(...params) {
  return function checkId(req, res, next) {
    for (const p of params) {
      if (!mongoose.isValidObjectId(req.params[p])) {
        return next(ApiError.notFound("No resource matches that id."));
      }
    }
    return next();
  };
}

module.exports = { validId };
