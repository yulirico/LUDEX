const bcrypt = require('bcryptjs');
const db = require('./db');

async function upsertUser(username, fullName, role, group, password = 'ludex123') {
  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return exists.id;
  const hash = bcrypt.hashSync(password, 10);
  const info = await db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, group_name) VALUES (?,?,?,?,?) RETURNING id'
  ).run(username, hash, fullName, role, group || null);
  return info.lastInsertRowid;
}

async function main() {
await db.initialize();

// --- usuarios de ejemplo (contraseña para todos: ludex123) ---
await upsertUser('admin', 'Administrador Ludex', 'admin', null, process.env.ADMIN_PASSWORD || 'ludex123');
await upsertUser('docente.6a', 'Wilfer Escalante', 'teacher', '6-A');
await upsertUser('ana.martinez', 'Ana Martínez', 'student', '6-A');
await upsertUser('luis.torres', 'Luis Torres', 'student', '6-A');

// --- juegos ---
await db.prepare("INSERT INTO games (id, name) VALUES ('chess','Ajedrez') ON CONFLICT DO NOTHING").run();
await db.prepare("INSERT INTO games (id, name) VALUES ('domino','Dominó') ON CONFLICT DO NOTHING").run();

// --- niveles de ajedrez ---
const chessLevels = [
  {
    id: 'chess-1', order_index: 1, title: 'Nivel 1: El peón y la torre',
    lesson_title: 'El peón avanza y la torre domina líneas rectas',
    lesson_body: 'El peón se mueve una casilla hacia adelante (dos en su primer movimiento) y captura en diagonal. La torre se mueve en línea recta, tantas casillas como quiera, mientras no haya piezas en el camino.',
    math_connection: 'Desde el centro del tablero, una torre puede llegar hasta 14 casillas distintas en un solo movimiento. Cuenta cuántas casillas domina desde una esquina.'
  },
  {
    id: 'chess-2', order_index: 2, title: 'Nivel 2: El caballo',
    lesson_title: 'El caballo se mueve en forma de L',
    lesson_body: 'Salta dos casillas en línea recta y una hacia un lado. Es la única pieza que puede saltar sobre otras piezas.',
    math_connection: 'Desde el centro del tablero el caballo puede llegar a 8 casillas distintas. Desde una esquina, ¿a cuántas llega? Compara los dos resultados.'
  }
];
const insLevel = db.prepare(`INSERT INTO levels
  (id, game_id, order_index, title, lesson_title, lesson_body, math_connection)
  VALUES (?,'chess',?,?,?,?,?)
  ON CONFLICT DO NOTHING`);
await Promise.all(chessLevels.map(l => insLevel.run(
  l.id, l.order_index, l.title, l.lesson_title, l.lesson_body, l.math_connection
)));

// --- niveles de dominó ---
const dominoLevels = [
  {
    id: 'domino-1', order_index: 1, title: 'Nivel 1: Encajar fichas',
    lesson_title: 'Cada ficha tiene dos mitades con puntos del 0 al 6',
    lesson_body: 'Para jugar una ficha, uno de sus lados debe tener el mismo número que un extremo abierto de la mesa. Si no tienes una ficha que encaje, pasas el turno.',
    math_connection: 'Antes de jugar una ficha, suma los puntos de sus dos lados. Esa suma te ayuda a decidir qué ficha te conviene más soltar primero.'
  }
];
const insLevelD = db.prepare(`INSERT INTO levels
  (id, game_id, order_index, title, lesson_title, lesson_body, math_connection)
  VALUES (?,'domino',?,?,?,?,?)
  ON CONFLICT DO NOTHING`);
await Promise.all(dominoLevels.map(l => insLevelD.run(
  l.id, l.order_index, l.title, l.lesson_title, l.lesson_body, l.math_connection
)));

// --- retos (challenge stage) ---
const challenges = [
  {
    id: 'ch-chess-1-1', level_id: 'chess-1', order_index: 1, topic: 'Lógica · Conteo',
    prompt: 'Una torre está en la esquina a1 de un tablero vacío de 8x8. ¿En cuántas casillas distintas se puede mover en un solo turno?',
    options: JSON.stringify(['7', '14', '8', '21']), correct_index: 1,
    explanation: 'Desde a1 puede recorrer las 7 casillas de su columna y las 7 de su fila: 7 + 7 = 14.',
    hint: 'Cuenta por separado la fila y la columna, luego suma.', points: 20
  },
  {
    id: 'ch-chess-1-2', level_id: 'chess-1', order_index: 2, topic: 'Matemáticas · Suma',
    prompt: 'Si un peón blanco avanza 2 casillas en su primer turno y luego 1 casilla más, ¿cuántas casillas avanzó en total?',
    options: JSON.stringify(['2', '3', '4', '1']), correct_index: 1,
    explanation: '2 casillas en el primer movimiento más 1 casilla después: 2 + 1 = 3.',
    hint: 'Suma los dos movimientos.', points: 15
  },
  {
    id: 'ch-chess-2-1', level_id: 'chess-2', order_index: 1, topic: 'Lógica · Conteo',
    prompt: 'Un caballo está en el centro de un tablero vacío. ¿A cuántas casillas distintas puede saltar?',
    options: JSON.stringify(['6', '8', '4', '10']), correct_index: 1,
    explanation: 'Desde el centro, el caballo tiene las 8 combinaciones de la forma en L disponibles.',
    hint: 'Dibuja las 8 formas de "2 y 1" alrededor del caballo.', points: 20
  },
  {
    id: 'ch-domino-1-1', level_id: 'domino-1', order_index: 1, topic: 'Estadística y probabilidad',
    prompt: 'Un dominó doble-seis tiene 28 fichas en total. Si sacas una ficha al azar, ¿cuál es la probabilidad de que sea un doble (mismo número en ambos lados)?',
    options: JSON.stringify(['1/2', '1/4', '1/7', '7/14']), correct_index: 1,
    explanation: 'Hay 7 fichas dobles (0-0 a 6-6) de 28 en total: 7/28 se simplifica a 1/4.',
    hint: 'Cuenta cuántas fichas dobles hay en total (del 0-0 al 6-6).', points: 25
  },
  {
    id: 'ch-domino-1-2', level_id: 'domino-1', order_index: 2, topic: 'Matemáticas · Suma',
    prompt: 'Tienes la ficha [6|2]. Un extremo de la mesa muestra un 2. ¿Cuánto suman los dos lados de tu ficha?',
    options: JSON.stringify(['6', '8', '4', '12']), correct_index: 1,
    explanation: '6 + 2 = 8.',
    hint: 'Suma los dos números de la ficha.', points: 15
  }
];
const insChallenge = db.prepare(`INSERT INTO challenges
  (id, level_id, order_index, topic, prompt, options, correct_index, explanation, hint, points)
  VALUES (?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT DO NOTHING`);
await Promise.all(challenges.map(c => insChallenge.run(
  c.id, c.level_id, c.order_index, c.topic, c.prompt, c.options, c.correct_index, c.explanation, c.hint, c.points
)));

// --- diagnóstico inicial ---
const diag = [
  { id: 'd1', order_index: 1, topic: 'Lógica · Patrones', prompt: '¿Qué número sigue: 2, 4, 8, 16, ?', options: JSON.stringify(['24','32','20','18']), correct_index: 1 },
  { id: 'd2', order_index: 2, topic: 'Matemáticas', prompt: '¿Cuánto es 7 + 5?', options: JSON.stringify(['11','12','13','10']), correct_index: 1 },
  { id: 'd3', order_index: 3, topic: 'Ajedrez básico', prompt: '¿Cuántas casillas tiene un tablero de ajedrez?', options: JSON.stringify(['32','48','64','100']), correct_index: 2 },
  { id: 'd4', order_index: 4, topic: 'Dominó básico', prompt: '¿Cuántas fichas tiene un dominó doble-seis completo?', options: JSON.stringify(['28','24','36','21']), correct_index: 0 },
  { id: 'd5', order_index: 5, topic: 'Lógica', prompt: 'Si hoy es martes, ¿qué día será dentro de 3 días?', options: JSON.stringify(['Jueves','Viernes','Sábado','Miércoles']), correct_index: 1 }
];
const insDiag = db.prepare(`INSERT INTO diagnostic_questions
  (id, order_index, topic, prompt, options, correct_index) VALUES (?,?,?,?,?,?)
  ON CONFLICT DO NOTHING`);
await Promise.all(diag.map(d => insDiag.run(
  d.id, d.order_index, d.topic, d.prompt, d.options, d.correct_index
)));

// --- logros ---
const achievements = [
  { id: 'first-level', name: 'Primer nivel', icon: '🏆', description: 'Completaste tu primer nivel.' },
  { id: 'chess-knight', name: 'Caballo saltarín', icon: '♞', description: 'Aprendiste el movimiento del caballo.' },
  { id: 'domino-double', name: 'Doble seis', icon: '🁛', description: 'Superaste el reto de probabilidad del dominó.' }
];
const insAch = db.prepare('INSERT INTO achievements (id, name, icon, description) VALUES (?,?,?,?) ON CONFLICT DO NOTHING');
await Promise.all(achievements.map(a => insAch.run(a.id, a.name, a.icon, a.description)));

// --- inicializar progreso de estudiantes de ejemplo: nivel 1 desbloqueado ---
const students = await db.prepare("SELECT id FROM users WHERE role='student'").all();
const levels = await db.prepare('SELECT id, game_id, order_index FROM levels').all();
const insProg = db.prepare(`INSERT INTO student_progress (user_id, game_id, level_id, unlocked) VALUES (?,?,?,?) ON CONFLICT DO NOTHING`);
const insPoints = db.prepare('INSERT INTO student_points (user_id, total_points) VALUES (?, 0) ON CONFLICT DO NOTHING');
await Promise.all(students.flatMap(s => [
  insPoints.run(s.id),
  ...levels.map(l => insProg.run(s.id, l.game_id, l.id, l.order_index === 1 ? 1 : 0))
]));

console.log('Seed completado. Usuarios demo (contraseña: ludex123):');
console.log(' - admin / ludex123 (administrador)');
console.log(' - docente.6a / ludex123 (docente)');
console.log(' - ana.martinez / ludex123 (estudiante)');
console.log(' - luis.torres / ludex123 (estudiante)');
}

main()
  .catch(error => {
    console.error('No se pudo inicializar la base de datos:', error);
    process.exitCode = 1;
  })
  .finally(() => db.close());