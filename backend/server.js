const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'cs308-team-29-secret-key';

app.use(cors());
app.use(express.json());

// Auth middleware
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
app.post('/api/register', (req, res) => {
  const { email, username, fullName, gender, password } = req.body;

  if (!email || !username || !fullName || !gender || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, username, full_name, gender, password) VALUES (?, ?, ?, ?, ?)'
  ).run(email, username, fullName, gender, hash);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, email, username, fullName, gender } });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender }
  });
});

// Get profile
app.get('/api/profile', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, username, full_name, gender FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender });
});

// Update profile
app.put('/api/profile', authenticate, (req, res) => {
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

// Change password
app.put('/api/profile/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
