const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, username, full_name, gender FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender });
});

router.put('/', authenticate, (req, res) => {
  const { username, fullName, gender } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  db.prepare('UPDATE users SET username = ?, full_name = ?, gender = ? WHERE id = ?')
    .run(username, fullName, gender, req.user.id);

  const user = db.prepare('SELECT id, email, username, full_name, gender FROM users WHERE id = ?').get(req.user.id);
  res.json({ id: user.id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender });
});

router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
