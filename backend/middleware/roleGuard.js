const User = require('../models/User');

function requireRole(...roles) {
  const allowed = roles.flat();
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user || !allowed.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      req.userRole = user.role;
      next();
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = requireRole;
