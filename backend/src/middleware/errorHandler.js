const isDev = process.env.NODE_ENV !== 'production';

/**
 * Centralized error handler.
 * - Never exposes stack traces or DB credentials in production.
 * - Maps known error types to appropriate HTTP status codes.
 * - Returns a consistent JSON shape: { success, message, errors? }
 */
const errorHandler = (err, req, res, next) => {
  // Always log internally (stack trace stays on server, never in response)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err.message);

  // ── Sequelize validation error ───────────────────────────────
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // ── Sequelize unique constraint ──────────────────────────────
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // ── Sequelize foreign key constraint ────────────────────────
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: related record does not exist',
    });
  }

  // ── Sequelize database connection error ──────────────────────
  if (err.name === 'SequelizeConnectionError' ||
      err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable. Please try again.',
    });
  }

  // ── Invalid integer / data type from Sequelize ───────────────
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
  }

  // ── JWT errors ───────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  // ── Multer file size limit ───────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.',
    });
  }

  // ── Multer unexpected field ──────────────────────────────────
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
    });
  }

  // ── SyntaxError from JSON body-parser ───────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }

  // ── Application-defined errors (err.status set manually) ────
  const status = err.status || err.statusCode || 500;

  // In production, never expose internal error details for 5xx
  const message =
    status < 500
      ? err.message || 'Bad request'
      : isDev
        ? err.message
        : 'An unexpected error occurred. Please try again later.';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
