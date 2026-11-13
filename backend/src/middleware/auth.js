const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verifies JWT and loads the current user from DB on every request.
 * - Rejects soft-deleted users (paranoid).
 * - Re-reads role from DB so role changes take effect immediately.
 * - Never trusts role from the token payload alone.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    // Always load fresh user from DB — catches soft-deletes and role changes
    const user = await User.findOne({
      where: { id: decoded.id },
      // paranoid: true is the default, so deleted users are excluded automatically
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found or has been deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Role-based access control middleware.
 * Always uses req.user.role (from DB), never the token payload.
 * Usage: requireRole('admin') or requireRole('owner', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

/**
 * Verifies the authenticated user owns the resource identified by req.params.id.
 * Pass a getter function that receives (req) and returns the ownerId of the resource.
 *
 * Usage:
 *   router.put('/:id', requireAuth, requireOwnership(async (req) => {
 *     const item = await Model.findByPk(req.params.id);
 *     return item?.ownerId;
 *   }), handler);
 *
 * Admins bypass this check automatically.
 */
const requireOwnership = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === 'admin') return next();

      const ownerId = await getOwnerId(req);
      if (!ownerId) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
      }
      if (Number(ownerId) !== Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireAuth, requireRole, requireOwnership };
