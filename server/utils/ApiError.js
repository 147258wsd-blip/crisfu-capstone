/* Every failure the API raises on purpose goes through this class, so the
   error middleware can tell "expected" (400/401/403/404) apart from a bug
   (500) and respond with a consistent JSON body either way. */
class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message = "Not authorised. Please sign in.") {
    return new ApiError(message, 401);
  }

  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(message, 403);
  }

  static notFound(message = "Resource not found.") {
    return new ApiError(message, 404);
  }

  static conflict(message) {
    return new ApiError(message, 409);
  }
}

module.exports = ApiError;
