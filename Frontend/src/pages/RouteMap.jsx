import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STAGE_LABEL = { learn: 'Aprende', practice: 'Practica', challenge: 'Reta tu conocimiento', done: 'Completado' };
const STAGE_PCT = { learn: 10, practice: 40, challenge: 70, done: 100 };
const GAME_ICON = { chess: '♞', domino: '▦' };

export default function RouteMap() {
  const [data, setData] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.diagnosticStatus().then(s => {
      if (!s.taken) { navigate('/diagnostico'); return; }
      api.route().then(setData);
    });
  }, [navigate]);

  if (!data) return <div className="loading">Cargando tu ruta…</div>;

  return (
    <div className="page">
      <h2>Hola, {user.full_name.split(' ')[0]}. Sigue con tu ruta.</h2>
      <div className="grid-side">
        <div>
          {data.games.map(game => (
            <div key={game.id}>
              <h3 style={{ marginTop: 20 }}>{GAME_ICON[game.id]} {game.name}</h3>
              {game.levels.map(level => {
                const p = level.progress;
                const locked = !p.unlocked;
                const pct = STAGE_PCT[p.stage] || 0;
                return (
                  <div className="card" key={level.id} style={{ opacity: locked ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b>{level.title}</b>
                      <span className={'tag' + (p.completed ? ' teal' : '')}>
                        {locked ? 'Bloqueado' : (p.completed ? 'Completado' : STAGE_LABEL[p.stage])}
                      </span>
                    </div>
                    <div className="bar" style={{ margin: '10px 0 6px' }}><i style={{ width: `${locked ? 0 : pct}%` }} /></div>
                    <div className="btns" style={{ marginTop: 8 }}>
                      <Link
                        className={'btn' + (locked ? ' ghost' : ' primary')}
                        to={locked ? '#' : `/nivel/${level.id}/${p.completed ? 'aprende' : p.stage === 'learn' ? 'aprende' : p.stage === 'practice' ? 'practica' : 'reto'}`}
                        onClick={e => locked && e.preventDefault()}
                      >
                        {locked ? 'Bloqueado' : p.completed ? 'Repasar' : 'Continuar'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div>
          <div className="card"><small style={{ color: 'var(--muted)' }}>Puntos</small><h2>{data.total_points}</h2></div>
          <div className="card"><small style={{ color: 'var(--muted)' }}>Logros</small><h2>{data.achievements.length}</h2></div>
        </div>
      </div>
    </div>
  );
}