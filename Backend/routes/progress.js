const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireRole('student'));

// ---- Diagnóstico ----
router.get('/diagnostic/status', asyncHandler(async (req, res) => {
  const done = await db.prepare('SELECT score_percent FROM diagnostic_results WHERE user_id = ?').get(req.user.id);
  res.json({ taken: !!done, score_percent: done ? done.score_percent : null });
}));

router.get('/diagnostic/questions', asyncHandler(async (req, res) => {
  const rows = await db.prepare('SELECT id, order_index, topic, prompt, options FROM diagnostic_questions ORDER BY order_index').all();
  res.json({ questions: rows.map(r => ({ ...r, options: JSON.parse(r.options) })) });
}));

router.post('/diagnostic/submit', asyncHandler(async (req, res) => {
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Respuestas inválidas' });
  const questions = await db.prepare('SELECT id, correct_index FROM diagnostic_questions').all();
  const map = Object.fromEntries(questions.map(q => [q.id, q.correct_index]));
  let correct = 0;
  answers.forEach(a => { if (map[a.id] === a.selected) correct++; });
  const percent = Math.round((correct / questions.length) * 100);
  await db.prepare(`INSERT INTO diagnostic_results (user_id, score_percent) VALUES (?,?)
              ON CONFLICT(user_id) DO UPDATE SET score_percent=excluded.score_percent, taken_at=CURRENT_TIMESTAMP`)
    .run(req.user.id, percent);
  res.json({ score_percent: percent, correct, total: questions.length });
}));

// ---- Mapa de ruta ----
router.get('/route', asyncHandler(async (req, res) => {
  const games = await db.prepare('SELECT * FROM games').all();
  const levels = await db.prepare('SELECT * FROM levels ORDER BY game_id, order_index').all();
  const progressRows = await db.prepare('SELECT * FROM student_progress WHERE user_id = ?').all(req.user.id);
  const progressByLevel = Object.fromEntries(progressRows.map(p => [p.level_id, p]));
  const points = await db.prepare('SELECT total_points FROM student_points WHERE user_id = ?').get(req.user.id);
  const achievements = await db.prepare(`SELECT a.id, a.name, a.icon, a.description, sa.earned_at
    FROM student_achievements sa JOIN achievements a ON a.id = sa.achievement_id WHERE sa.user_id = ?`).all(req.user.id);

  const result = games.map(g => ({
    ...g,
    levels: levels.filter(l => l.game_id === g.id).map(l => {
      const p = progressByLevel[l.id] || { stage: 'learn', unlocked: 0, completed: 0, best_score: 0 };
      return { ...l, progress: p };
    })
  }));

  res.json({ games: result, total_points: points ? points.total_points : 0, achievements });
}));

// ---- Etapa Aprende ----
router.get('/level/:id', asyncHandler(async (req, res) => {
  const level = await db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
  if (!level) return res.status(404).json({ error: 'Nivel no encontrado' });
  const prog = await db.prepare('SELECT * FROM student_progress WHERE user_id = ? AND level_id = ?').get(req.user.id, level.id);
  if (!prog || !prog.unlocked) return res.status(403).json({ error: 'Este nivel todavía está bloqueado' });
  res.json({ level, progress: prog });
}));

// ---- Retos (etapa Reta tu conocimiento) ----
router.get('/level/:id/challenges', asyncHandler(async (req, res) => {
  const prog = await db.prepare('SELECT * FROM student_progress WHERE user_id = ? AND level_id = ?').get(req.user.id, req.params.id);
  if (!prog || !prog.unlocked) return res.status(403).json({ error: 'Este nivel todavía está bloqueado' });
  const rows = await db.prepare('SELECT id, order_index, topic, prompt, options, hint, points FROM challenges WHERE level_id = ? ORDER BY order_index').all(req.params.id);
  res.json({ challenges: rows.map(r => ({ ...r, options: JSON.parse(r.options) })) });
}));

router.post('/challenges/:id/attempt', asyncHandler(async (req, res) => {
  const { selected } = req.body || {};
  const challenge = await db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
  const prog = await db.prepare('SELECT * FROM student_progress WHERE user_id = ? AND level_id = ?').get(req.user.id, challenge.level_id);
  if (!prog || !prog.unlocked) return res.status(403).json({ error: 'Este nivel todavía está bloqueado' });

  const correct = selected === challenge.correct_index;
  await db.prepare('INSERT INTO challenge_attempts (user_id, challenge_id, correct) VALUES (?,?,?)')
    .run(req.user.id, challenge.id, correct ? 1 : 0);

  if (correct) {
    await db.prepare(`INSERT INTO student_points (user_id, total_points) VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE
                SET total_points = student_points.total_points + EXCLUDED.total_points`)
      .run(req.user.id, challenge.points);
  }

  res.json({ correct, explanation: challenge.explanation, correct_index: challenge.correct_index });
}));

// ---- Avanzar de etapa / completar nivel ----
const STAGE_ORDER = ['learn', 'practice', 'challenge', 'done'];

router.post('/level/:id/advance-stage', asyncHandler(async (req, res) => {
  const level = await db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
  if (!level) return res.status(404).json({ error: 'Nivel no encontrado' });
  const prog = await db.prepare('SELECT * FROM student_progress WHERE user_id = ? AND level_id = ?').get(req.user.id, level.id);
  if (!prog || !prog.unlocked) return res.status(403).json({ error: 'Este nivel todavía está bloqueado' });

  const currentIdx = STAGE_ORDER.indexOf(prog.stage);
  const nextStage = STAGE_ORDER[Math.min(currentIdx + 1, STAGE_ORDER.length - 1)];
  const nowCompleted = nextStage === 'done' ? 1 : prog.completed;

  await db.prepare('UPDATE student_progress SET stage = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND level_id = ?')
    .run(nextStage, nowCompleted, req.user.id, level.id);

  let unlockedNext = null;
  let newAchievements = [];

  if (nextStage === 'done') {
    const next = await db.prepare('SELECT * FROM levels WHERE game_id = ? AND order_index = ?')
      .get(level.game_id, level.order_index + 1);
    if (next) {
      await db.prepare('UPDATE student_progress SET unlocked = 1 WHERE user_id = ? AND level_id = ?')
        .run(req.user.id, next.id);
      unlockedNext = next.id;
    }

    const hasFirst = await db.prepare('SELECT 1 FROM student_achievements WHERE user_id = ? AND achievement_id = ?')
      .get(req.user.id, 'first-level');
    if (!hasFirst) {
      await db.prepare('INSERT INTO student_achievements (user_id, achievement_id) VALUES (?, ?)').run(req.user.id, 'first-level');
      newAchievements.push('first-level');
    }
    const specific = { 'chess-2': 'chess-knight', 'domino-1': 'domino-double' }[level.id];
    if (specific) {
      const has = await db.prepare('SELECT 1 FROM student_achievements WHERE user_id = ? AND achievement_id = ?').get(req.user.id, specific);
      if (!has) {
        await db.prepare('INSERT INTO student_achievements (user_id, achievement_id) VALUES (?, ?)').run(req.user.id, specific);
        newAchievements.push(specific);
      }
    }
  }

  res.json({ stage: nextStage, completed: !!nowCompleted, unlocked_next_level: unlockedNext, new_achievements: newAchievements });
}));

// ---- Resultados de un nivel ----
router.get('/level/:id/results', asyncHandler(async (req, res) => {
  const level = await db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
  if (!level) return res.status(404).json({ error: 'Nivel no encontrado' });
  const challengeIds = await db.prepare('SELECT id, topic FROM challenges WHERE level_id = ?').all(level.id);
  const idList = challengeIds.map(c => c.id);
  let attempts = [];
  if (idList.length) {
    const placeholders = idList.map(() => '?').join(',');
    attempts = await db.prepare(`SELECT challenge_id, correct FROM challenge_attempts
      WHERE user_id = ? AND challenge_id IN (${placeholders}) ORDER BY attempted_at DESC`).all(req.user.id, ...idList);
  }
  const latestByChallenge = {};
  attempts.forEach(a => { if (!(a.challenge_id in latestByChallenge)) latestByChallenge[a.challenge_id] = a.correct; });
  const total = idList.length;
  const correctCount = Object.values(latestByChallenge).filter(Boolean).length;
  const scorePercent = total ? Math.round((correctCount / total) * 100) : 0;

  res.json({ level, correct: correctCount, total, score_percent: scorePercent });
}));

module.exports = router;