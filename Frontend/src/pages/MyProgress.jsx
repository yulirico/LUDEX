import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MyProgress() {
  const [data, setData] = useState(null);

  useEffect(() => { api.route().then(setData); }, []);

  if (!data) return <div className="loading">Cargando tu progreso…</div>;

  const totalLevels = data.games.reduce((a, g) => a + g.levels.length, 0);
  const completedLevels = data.games.reduce((a, g) => a + g.levels.filter(l => l.progress.completed).length, 0);

  return (
    <div className="page">
      <h2>Mi progreso</h2>
      <div className="grid-2">
        <div className="card"><small style={{ color: 'var(--muted)' }}>Puntos totales</small><h1>{data.total_points}</h1></div>
        <div className="card"><small style={{ color: 'var(--muted)' }}>Niveles completados</small><h1>{completedLevels} <span style={{ fontSize: 18 }}>de {totalLevels}</span></h1></div>
      </div>
      <h3 style={{ marginTop: 20 }}>Logros</h3>
      <div className="badges">
        {data.achievements.length === 0 && <p style={{ color: 'var(--muted)' }}>Todavía no tienes logros. ¡Completa un nivel para ganar el primero!</p>}
        {data.achievements.map(a => (
          <div className="badge" key={a.id}><span className="g">{a.icon}</span>{a.name}</div>
        ))}
      </div>
      <h3 style={{ marginTop: 20 }}>Detalle por juego</h3>
      {data.games.map(g => (
        <div className="card" key={g.id}>
          <b>{g.name}</b>
          <table className="t" style={{ marginTop: 8 }}>
            <thead><tr><th>Nivel</th><th>Estado</th></tr></thead>
            <tbody>
              {g.levels.map(l => (
                <tr key={l.id}>
                  <td>{l.title}</td>
                  <td>
                    {!l.progress.unlocked ? <span className="pill low">Bloqueado</span>
                      : l.progress.completed ? <span className="pill ok">Completado</span>
                      : <span className="pill warn">En curso</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}