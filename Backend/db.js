const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', error => {
  console.error('Error inesperado en la conexión con PostgreSQL:', error);
});

function prepareQuery(sql, params) {
  let query = sql;
  const values = [];

  let index = 0;
  query = query.replace(/\?/g, () => {
    values.push(params[index]);
    index += 1;
    return `$${index}`;
  });
  if (index !== params.length) {
    throw new Error(`La consulta esperaba ${index} parámetros y recibió ${params.length}`);
  }

  return { query, values };
}

const db = {
  prepare(sql) {
    return {
      async get(...params) {
        const prepared = prepareQuery(sql, params);
        const result = await pool.query(prepared.query, prepared.values);
        return result.rows[0];
      },
      async all(...params) {
        const prepared = prepareQuery(sql, params);
        const result = await pool.query(prepared.query, prepared.values);
        return result.rows;
      },
      async run(...params) {
        const prepared = prepareQuery(sql, params);
        const result = await pool.query(prepared.query, prepared.values);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows[0] ? result.rows[0].id : undefined
        };
      }
    };
  },
  async initialize() {
    if (!process.env.DATABASE_URL) {
      throw new Error('Falta configurar DATABASE_URL con la URL de la base de datos PostgreSQL.');
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
        group_name TEXT DEFAULT '6-A',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        game_id TEXT NOT NULL REFERENCES games(id),
        level_id TEXT NOT NULL REFERENCES levels(id),
        stage TEXT NOT NULL DEFAULT 'learn' CHECK(stage IN ('learn','practice','challenge','done')),
        unlocked INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, level_id)
      );
      CREATE TABLE IF NOT EXISTS challenge_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        challenge_id TEXT NOT NULL REFERENCES challenges(id),
        correct INTEGER NOT NULL,
        attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS diagnostic_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        score_percent INTEGER NOT NULL,
        taken_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
        earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, achievement_id)
      );
      CREATE TABLE IF NOT EXISTS student_points (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        total_points INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
  async close() {
    await pool.end();
  }
};

module.exports = db;
