import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Learn() {
  const { levelId } = useParams();
  const [level, setLevel] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLevel(null);
    api.level(levelId).then(r => setLevel(r.level)).catch(e => setError(e.message));
  }, [levelId]);

  if (error) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!level) return <div className="loading">Cargando lección…</div>;

  async function goPractice() {
    await api.advanceStage(levelId).catch(() => {});
    navigate(`/nivel/${levelId}/practica`);
  }

  return (
    <>
      <div className="crumb">{level.game_id === 'chess' ? 'Ajedrez' : 'Dominó'} › {level.title} › <b>Aprende</b></div>
      <div className="page">
        <div className="card">
          <span className="tag">Aprende</span>
          <h2 style={{ marginTop: 8 }}>{level.lesson_title}</h2>
          <p>{level.lesson_body}</p>
        </div>
        <div className="card" style={{ borderColor: 'var(--teal)' }}>
          <span className="tag teal">Conexión matemática</span>
          <p style={{ marginTop: 8, marginBottom: 0 }}>{level.math_connection}</p>
        </div>
        <div className="btns">
          <Link className="btn ghost" to="/">Volver al mapa</Link>
          <button className="btn primary" onClick={goPractice}>Ir a practicar</button>
        </div>
      </div>
    </>
  );
}