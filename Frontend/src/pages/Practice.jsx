import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { api } from '../api';
import ChessBoard from '../components/ChessBoard';
import { DominoTile, PIPS } from '../components/DominoTile';

export default function Practice() {
  const { levelId } = useParams();
  const [level, setLevel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLevel(null);
    api.level(levelId).then(r => setLevel(r.level)).catch(e => setError(e.message));
  }, [levelId]);

  if (error) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!level) return <div className="loading">Cargando práctica…</div>;

  return level.game_id === 'chess' ? <ChessPractice level={level} /> : <DominoPractice level={level} />;
}

// ---------------- Ajedrez ----------------
function ChessPractice({ level }) {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [message, setMessage] = useState('Tu turno con las piezas blancas.');
  const navigate = useNavigate();

  function forceRender() { setTick(t => t + 1); }

  function legalTargetsFrom(square) {
    return gameRef.current.moves({ square, verbose: true }).map(m => m.to);
  }

  function botMove() {
    const game = gameRef.current;
    if (game.isGameOver()) return;
    const moves = game.moves({ verbose: true });
    if (!moves.length) return;
    const pick = moves[Math.floor(Math.random() * moves.length)];
    game.move({ from: pick.from, to: pick.to, promotion: 'q' });
    setLastMove({ from: pick.from, to: pick.to });
    forceRender();
    if (game.isCheckmate()) setMessage('Jaque mate de las negras. ¡Vuelve a intentarlo!');
    else if (game.isCheck()) setMessage('¡Cuidado, estás en jaque!');
    else setMessage('Tu turno con las piezas blancas.');
  }

  function onSquareClick(sq) {
    const game = gameRef.current;
    if (game.isGameOver()) return;
    if (game.turn() !== 'w') return;

    if (selected) {
      if (selected === sq) { setSelected(null); return; }
      const targets = legalTargetsFrom(selected);
      if (targets.includes(sq)) {
        try {
          game.move({ from: selected, to: sq, promotion: 'q' });
          setLastMove({ from: selected, to: sq });
          setSelected(null);
          forceRender();
          if (game.isCheckmate()) { setMessage('¡Jaque mate! Ganaste esta práctica.'); return; }
          setMessage('Buena jugada. Pensando la respuesta…');
          setTimeout(botMove, 500);
          return;
        } catch (e) { /* movimiento inválido, ignorar */ }
      }
      const piece = game.get(sq);
      if (piece && piece.color === 'w') { setSelected(sq); return; }
      setSelected(null);
    } else {
      const piece = game.get(sq);
      if (piece && piece.color === 'w') setSelected(sq);
    }
  }

  function resetBoard() {
    gameRef.current = new Chess();
    setSelected(null);
    setLastMove(null);
    setMessage('Tu turno con las piezas blancas.');
    forceRender();
  }

  async function finish() {
    await api.advanceStage(level.id).catch(() => {});
    navigate(`/nivel/${level.id}/reto`);
  }

  const targets = selected ? legalTargetsFrom(selected) : [];

  return (
    <>
      <div className="crumb">Ajedrez › {level.title} › <b>Practica</b></div>
      <div className="page">
        <div className="chess-wrap">
          <ChessBoard chess={gameRef.current} selected={selected} legalTargets={targets} lastMove={lastMove} onSquareClick={onSquareClick} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="card">
              <b>{gameRef.current.turn() === 'w' ? 'Tu turno' : 'Turno de las negras'}</b>
              <p style={{ margin: '8px 0 0' }}>{message}</p>
            </div>
            <div className="card">
              <span className="tag teal">Recuerda</span>
              <p style={{ margin: '8px 0 0' }}>{level.math_connection}</p>
            </div>
            <div className="btns">
              <button className="btn ghost" onClick={resetBoard}>Reiniciar partida</button>
              <Link className="btn ghost" to="/">Volver al mapa</Link>
              <button className="btn primary" onClick={finish}>Ir al reto</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------- Dominó ----------------
function randomTile(usedSet) {
  let a, b, key;
  do {
    a = Math.floor(Math.random() * 7);
    b = Math.floor(Math.random() * 7);
    key = a <= b ? `${a}-${b}` : `${b}-${a}`;
  } while (usedSet.has(key));
  usedSet.add(key);
  return { a, b };
}

function DominoPractice({ level }) {
  const usedRef = useRef(new Set());
  const [table, setTable] = useState(() => {
    const t = randomTile(usedRef.current);
    return [t];
  });
  const [hand, setHand] = useState(() => Array.from({ length: 5 }, () => randomTile(usedRef.current)));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [placedCount, setPlacedCount] = useState(0);
  const navigate = useNavigate();

  const leftEnd = table[0].a;
  const rightEnd = table[table.length - 1].b;

  function fits(tile) {
    return tile.a === leftEnd || tile.b === leftEnd || tile.a === rightEnd || tile.b === rightEnd;
  }

  function playTile(idx) {
    const tile = hand[idx];
    if (!fits(tile)) return;
    let piece = { ...tile };
    let newTable;
    if (piece.a === rightEnd) newTable = [...table, piece];
    else if (piece.b === rightEnd) newTable = [...table, { a: piece.b, b: piece.a }];
    else if (piece.b === leftEnd) newTable = [piece, ...table];
    else newTable = [{ a: piece.b, b: piece.a }, ...table];

    setTable(newTable);
    setHand(h => {
      const copy = [...h];
      copy.splice(idx, 1, randomTile(usedRef.current));
      return copy;
    });
    setSelectedIdx(null);
    setFeedback(`Colocaste la ficha [${tile.a}|${tile.b}]. Suma de sus puntos: ${tile.a} + ${tile.b} = ${tile.a + tile.b}.`);
    setPlacedCount(c => c + 1);
  }

  async function finish() {
    await api.advanceStage(level.id).catch(() => {});
    navigate(`/nivel/${level.id}/reto`);
  }

  return (
    <>
      <div className="crumb">Dominó › {level.title} › <b>Practica</b></div>
      <div className="page">
        <div className="card">
          <span className="tag">Mesa</span>
          <div className="table-surface" style={{ marginTop: 10 }}>
            {table.map((t, i) => <DominoTile key={i} a={t.a} b={t.b} />)}
          </div>
          <small style={{ color: 'var(--muted)' }}>Extremos abiertos: {leftEnd} y {rightEnd}</small>
        </div>
        <div className="card">
          <span className="tag">Tu mano</span>
          <div className="hand">
            {hand.map((t, i) => (
              <DominoTile key={i} a={t.a} b={t.b} disabled={!fits(t)} selected={selectedIdx === i} onClick={() => playTile(i)} />
            ))}
          </div>
        </div>
        {feedback && <div className="card" style={{ borderColor: 'var(--teal)' }}>{feedback}</div>}
        <div className="card" style={{ borderColor: 'var(--teal)' }}>
          <span className="tag teal">Recuerda</span>
          <p style={{ margin: '8px 0 0' }}>{level.math_connection}</p>
        </div>
        <div className="btns">
          <Link className="btn ghost" to="/">Volver al mapa</Link>
          <button className="btn primary" disabled={placedCount < 2} onClick={finish}>
            {placedCount < 2 ? `Coloca al menos 2 fichas (${placedCount}/2)` : 'Ir al reto'}
          </button>
        </div>
      </div>
    </>
  );
}