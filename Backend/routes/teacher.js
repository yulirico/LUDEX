const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('teacher', 'admin'));

router.get('/summary', (req, res) => {
  const group = req.query.group || null;
  const students = group
    ? db.prepare("SELECT id, username, full_name, group_name FROM users WHERE role='student' AND group_name = ?").all(group)
    : db.prepare("SELECT id, username, full_name, group_name FROM users WHERE role='student'").all();

  const totalLevels = db.prepare('SELECT COUNT(*) c FROM levels').get().c;

  const rows = students.map(s => {
    const completedLevels = db.prepare('SELECT COUNT(*) c FROM student_progress WHERE user_id = ? AND completed = 1').get(s.id).c;
    const points = db.prepare('SELECT total_points FROM student_points WHERE user_id = ?').get(s.id);
    const attempts = db.prepare('SELECT correct FROM challenge_attempts WHERE user_id = ?').all(s.id);
    const accuracy = attempts.length ? Math.round((attempts.filter(a => a.correct).length / attempts.length) * 100) : null;
    return {
      ...s,
      completed_levels: completedLevels,
      total_levels: totalLevels,
      total_points: points ? points.total_points : 0,
      accuracy_percent: accuracy
    };
  });

  const withAcc = rows.filter(r => r.accuracy_percent !== null);
  const groupAverage = withAcc.length ? Math.round(withAcc.reduce((a, r) => a + r.accuracy_percent, 0) / withAcc.length) : null;

  const topicStats = db.prepare(`
    SELECT c.topic as topic, ca.correct as correct
    FROM challenge_attempts ca JOIN challenges c ON c.id = ca.challenge_id
  `).all();
  const byTopic = {};
  topicStats.forEach(t => {
    byTopic[t.topic] = byTopic[t.topic] || { total: 0, correct: 0 };
    byTopic[t.topic].total++;
    if (t.correct) byTopic[t.topic].correct++;
  });
  let hardestTopic = null, hardestRate = 101;
  Object.entries(byTopic).forEach(([topic, v]) => {
    const rate = (v.correct / v.total) * 100;
    if (rate < hardestRate) { hardestRate = rate; hardestTopic = topic; }
  });

  res.json({ students: rows, group_average_accuracy: groupAverage, hardest_topic: hardestTopic });
});

router.get('/student/:id', (req, res) => {
  const student = db.prepare("SELECT id, username, full_name, group_name FROM users WHERE id = ? AND role='student'").get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

  const progress = db.prepare(`
    SELECT sp.*, l.title, l.game_id FROM student_progress sp
    JOIN levels l ON l.id = sp.level_id WHERE sp.user_id = ? ORDER BY l.game_id, l.order_index
  `).all(student.id);

  const diagnostic = db.prepare('SELECT score_percent, taken_at FROM diagnostic_results WHERE user_id = ?').get(student.id);
  const achievements = db.prepare(`SELECT a.name, a.icon FROM student_achievements sa JOIN achievements a ON a.id = sa.achievement_id WHERE sa.user_id = ?`).all(student.id);
  const points = db.prepare('SELECT total_points FROM student_points WHERE user_id = ?').get(student.id);

  res.json({ student, progress, diagnostic: diagnostic || null, achievements, total_points: points ? points.total_points : 0 });
});

module.exports = router;