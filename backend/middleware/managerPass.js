const MANAGER_PASS = process.env.MANAGER_PASS || '1234';

module.exports = function managerPass(req, res, next) {
  const provided = req.headers['x-manager-pass'];
  if (!provided || provided !== MANAGER_PASS) {
    return res.status(401).json({ error: 'Manager authentication required.' });
  }
  next();
};

module.exports.MANAGER_PASS = MANAGER_PASS;
