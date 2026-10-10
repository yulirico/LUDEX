import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Results() {
  const { levelId } = useParams();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.levelResults(levelId).then(setData);
  }, [levelId]);

  if (!data) return <div className="loading">Calculando resultados…</div>;

  const pct = data.score_percent;

  return (
    <>
      <div className="crumb">{data.level.game_id === 'chess' ? 'Ajedrez' : 'Dominó'} › {data.level.title} › <b>Evalúa y progresa</b></div>
      <div className="page">
        <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="ring" style={{ background: `conic-gradient(var(--teal) 0 ${pct}%, #DDE3F5 ${pct}% 100%)` }}>
            <div>{pct}%</div>
          </div>
          <div>
            <h3>{pct >= 60 ? '¡Nivel superado!' : 'Casi lo logras'}</h3>
            <p style={{ margin: '4px 0 0' }}>Acertaste {data.correct} de {data.total} retos en este nivel.</p>
          </div>
        </div>
        {pct < 60 && (
          <div className="card" style={{ borderColor: 'var(--yellow)' }}>
            Te recomendamos repasar la lección antes de intentar de nuevo.
          </div>
        )}
        <div className="btns">
          <button className="btn ghost" onClick={() => navigate(`/nivel/${levelId}/aprende`)}>Repasar lección</button>
          <button className="btn ghost" onClick={() => navigate(`/nivel/${levelId}/reto`)}>Repetir reto</button>
          <Link className="btn primary" to="/">Volver al mapa</Link>
        </div>
      </div>
    </>
  );
}