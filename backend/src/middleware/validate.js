/**
 * Shared validation helpers used across all routes.
 * Keeps validation DRY and consistent.
 */
const { validationResult, param, query } = require('express-validator');

/**
 * Run after express-validator chains.
 * Returns 400 with structured errors if any check failed.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * Validates that :id route param is a positive integer.
 * Usage: router.get('/:id', validateId, handler)
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidation,
];

/**
 * Validates common pagination query params.
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  handleValidation,
];

module.exports = { handleValidation, validateId, validatePagination };
