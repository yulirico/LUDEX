const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, username, full_name, role, group_name, created_at FROM users ORDER BY role, full_name').all();
  res.json({ users: rows });
});

router.post('/users', (req, res) => {
  const { username, password, full_name, role, group_name } = req.body || {};
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash, full_name, role, group_name) VALUES (?,?,?,?,?)')
    .run(username, hash, full_name, role, group_name || null);

  if (role === 'student') {
    db.prepare('INSERT OR IGNORE INTO student_points (user_id, total_points) VALUES (?, 0)').run(info.lastInsertRowid);
    const levels = db.prepare('SELECT id, game_id, order_index FROM levels').all();
    const insProg = db.prepare('INSERT OR IGNORE INTO student_progress (user_id, game_id, level_id, unlocked) VALUES (?,?,?,?)');
    levels.forEach(l => insProg.run(info.lastInsertRowid, l.game_id, l.id, l.order_index === 1 ? 1 : 0));
  }

  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/users/:id', (req, res) => {
  const { full_name, role, group_name, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role), group_name = COALESCE(?, group_name) WHERE id = ?')
    .run(full_name, role, group_name, req.params.id);

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  db.prepare('DELETE FROM student_progress WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM student_points WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM student_achievements WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM challenge_attempts WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM diagnostic_results WHERE user_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
});

router.get('/content', (req, res) => {
  const levels = db.prepare('SELECT * FROM levels ORDER BY game_id, order_index').all();
  const challenges = db.prepare('SELECT * FROM challenges ORDER BY level_id, order_index').all()
    .map(c => ({ ...c, options: JSON.parse(c.options) }));
  res.json({ levels, challenges });
});

router.put('/content/challenges/:id', (req, res) => {
  const { prompt, options, correct_index, explanation, hint, points } = req.body || {};
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
  db.prepare(`UPDATE challenges SET
    prompt = COALESCE(?, prompt),
    options = COALESCE(?, options),
    correct_index = COALESCE(?, correct_index),
    explanation = COALESCE(?, explanation),
    hint = COALESCE(?, hint),
    points = COALESCE(?, points)
    WHERE id = ?`)
    .run(prompt, options ? JSON.stringify(options) : null, correct_index, explanation, hint, points, req.params.id);
  res.json({ ok: true });
});

module.exports = router;