// ============================================================
//  middleware/errorMiddleware.js
//  PURPOSE: Centralized error handling for the entire app
//
//  HOW IT WORKS:
//  Express has a special 4-parameter middleware for errors:
//  (err, req, res, next) — the `err` parameter is key.
//  When any controller calls next(error), Express skips all
//  normal middleware and jumps straight to this handler.
//
//  WHY CENTRALIZE ERRORS:
//  Instead of writing try/catch + res.status().json() in every
//  controller, we throw errors and handle them in one place.
//  This keeps controllers clean and consistent.
// ============================================================

// ---- 404 Handler — Route Not Found ----
// If a request reaches this point, no route matched it
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass to errorHandler below
};

// ---- Global Error Handler ----
// Must have exactly 4 parameters for Express to recognize it as error middleware
const errorHandler = (err, req, res, next) => {
  // Sometimes an error is thrown but status is still 200 — fix that
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // ---- Handle Specific MongoDB / Mongoose Errors ----

  // CastError: Invalid MongoDB ObjectId format
  // e.g. GET /api/tasks/not-a-valid-id
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found — invalid ID format';
  }

  // Duplicate key: e.g. registering with an email that already exists
  // MongoDB error code 11000 = duplicate key violation
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0]; // Which field caused the duplicate
    message = `${field} already exists — please use a different value`;
  }

  // Mongoose Validation Error: required fields missing, enum mismatch, etc.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Collect all validation messages into one string
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token — please log in again';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired — please log in again';
  }

  // ---- Send Error Response ----
  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development mode (hide in production)
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
