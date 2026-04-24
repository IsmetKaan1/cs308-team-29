const User = require('../models/User');

function requireRole(role) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user || user.role !== role) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      next();
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = requireRole;
