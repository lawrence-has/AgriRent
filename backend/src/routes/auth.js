const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { uploadProfilePicture } = require('../middleware/upload');

const router = express.Router();

// ── Rate limiters ────────────────────────────────────────────────

/**
 * Strict limit on login attempts — 10 per 15 minutes per IP.
 * Prevents brute-force password attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true, // only count failures
});

/**
 * Registration limit — 5 accounts per hour per IP.
 * Prevents mass account creation.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
});

// ── Token generator ──────────────────────────────────────────────
// Token only contains id — role is always re-read from DB via requireAuth
const generateToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ──────────────────────────────────────
router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').normalizeEmail().isEmail().withMessage('Valid email address is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .isLength({ max: 128 }).withMessage('Password must be less than 128 characters'),
    body('role').isIn(['farmer', 'owner']).withMessage('Role must be farmer or owner'),
    body('phone').optional().trim()
      .isLength({ max: 20 }).withMessage('Phone must be 20 characters or less'),
    body('address').optional().trim(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, email, password, role, phone, address } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        // Uniform response — don't reveal whether email exists (account enumeration)
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }

      const user = await User.create({
        name: name.trim(),
        email,
        password, // hashed by model hook
        role,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      });

      const token = generateToken(user);
      res.status(201).json({ success: true, token, user });
    } catch (error) {
      next(error);
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────────
router.post(
  '/login',
  loginLimiter,
  [
    body('email').normalizeEmail().isEmail().withMessage('Valid email address is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Use a consistent error message — don't reveal which field is wrong
      const INVALID_MSG = 'Invalid email or password';

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Still compare to prevent timing attacks
        await User.build({ password: 'dummy' }).comparePassword(password).catch(() => {});
        return res.status(401).json({ success: false, message: INVALID_MSG });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: INVALID_MSG });
      }

      const token = generateToken(user);
      res.json({ success: true, token, user });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  // req.user already has password stripped via toJSON()
  res.json({ success: true, user: req.user });
});

// ── PUT /api/auth/me ─────────────────────────────────────────────
router.put(
  '/me',
  requireAuth,
  uploadProfilePicture,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone').optional().trim()
      .isLength({ max: 20 }).withMessage('Phone must be 20 characters or less'),
    body('address').optional().trim(),
    // Password change requires current password verification
    body('newPassword').optional()
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
      .isLength({ max: 128 }).withMessage('New password must be less than 128 characters'),
    body('currentPassword')
      .if(body('newPassword').exists())
      .notEmpty().withMessage('Current password is required to change your password'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, phone, address, currentPassword, newPassword } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone?.trim() || null;
      if (address !== undefined) updates.address = address?.trim() || null;
      if (req.file) updates.profilePicture = `/uploads/profiles/${req.file.filename}`;

      // Password change — verify current password first
      if (newPassword) {
        const freshUser = await User.findByPk(req.user.id);
        const isMatch = await freshUser.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
        updates.password = newPassword; // hashed by model beforeUpdate hook
      }

      // Explicitly block email and role changes via this endpoint
      // Email changes would require re-verification; role changes require admin
      if (req.body.email || req.body.role) {
        return res.status(400).json({
          success: false,
          message: 'Email and role cannot be changed through this endpoint',
        });
      }

      await req.user.update(updates);
      res.json({ success: true, user: req.user });
    } catch (error) {
      next(error);
    }
  }
);

// ── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  // JWT is stateless — client removes token. We acknowledge the logout.
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
