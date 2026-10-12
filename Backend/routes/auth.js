const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  const passwordMatches = user && await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, group_name: user.group_name }
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await db.prepare('SELECT id, username, full_name, role, group_name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
}));

module.exports = router;