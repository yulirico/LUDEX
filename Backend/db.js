const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'ludex.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
  group_name TEXT DEFAULT '6-A',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS levels (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  lesson_body TEXT NOT NULL,
  math_connection TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  level_id TEXT NOT NULL REFERENCES levels(id),
  order_index INTEGER NOT NULL,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  hint TEXT NOT NULL,
  points INTEGER DEFAULT 20
);

CREATE TABLE IF NOT EXISTS diagnostic_questions (
  id TEXT PRIMARY KEY,
  order_index INTEGER NOT NULL,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS student_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  level_id TEXT NOT NULL REFERENCES levels(id),
  stage TEXT NOT NULL DEFAULT 'learn' CHECK(stage IN ('learn','practice','challenge','done')),
  unlocked INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  correct INTEGER NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  score_percent INTEGER NOT NULL,
  taken_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_achievements (
  user_id INTEGER NOT NULL REFERENCES users(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  earned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS student_points (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  total_points INTEGER NOT NULL DEFAULT 0
);
`);

module.exports = db;