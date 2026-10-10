import { useEffect, useState } from 'react';
import { api } from '../api';

function pillFor(accuracy) {
  if (accuracy === null) return <span className="pill">Sin datos</span>;
  if (accuracy >= 70) return <span className="pill ok">Al día</span>;
  if (accuracy >= 50) return <span className="pill warn">Reforzar</span>;
  return <span className="pill low">Necesita apoyo</span>;
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { api.teacherSummary().then(setData); }, []);

  async function openDetail(id) {
    const d = await api.teacherStudent(id);
    setDetail(d);
  }

  if (!data) return <div className="loading">Cargando resumen del grupo…</div>;

  return (
    <div className="page">
      <h2>Resumen del grupo</h2>
      <div className="grid-2">
        <div className="card"><small style={{ color: 'var(--muted)' }}>Promedio de aciertos</small><h1>{data.group_average_accuracy ?? '—'}%</h1></div>
        <div className="card"><small style={{ color: 'var(--muted)' }}>Tema más difícil</small><h2>{data.hardest_topic || 'Sin datos todavía'}</h2></div>
      </div>

      <div className="card">
        <table className="t">
          <thead><tr><th>Estudiante</th><th>Niveles</th><th>Puntos</th><th>Aciertos</th><th>Estado</th></tr></thead>
          <tbody>
            {data.students.map(s => (
              <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(s.id)}>
                <td>{s.full_name}</td>
                <td>{s.completed_levels} / {s.total_levels}</td>
                <td>{s.total_points}</td>
                <td>{s.accuracy_percent === null ? '—' : `${s.accuracy_percent}%`}</td>
                <td>{pillFor(s.accuracy_percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card" style={{ borderColor: 'var(--teal)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>{detail.student.full_name}</h3>
            <button className="btn ghost" onClick={() => setDetail(null)}>Cerrar</button>
          </div>
          <p>Puntos totales: <b>{detail.total_points}</b>{detail.diagnostic && <> · Diagnóstico inicial: <b>{detail.diagnostic.score_percent}%</b></>}</p>
          <table className="t">
            <thead><tr><th>Nivel</th><th>Etapa</th><th>Completado</th></tr></thead>
            <tbody>
              {detail.progress.map(p => (
                <tr key={p.level_id}>
                  <td>{p.title}</td>
                  <td>{p.stage}</td>
                  <td>{p.completed ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detail.achievements.length > 0 && (
            <p style={{ marginTop: 10 }}>Logros: {detail.achievements.map(a => `${a.icon} ${a.name}`).join('  ')}</p>
          )}
        </div>
      )}
    </div>
  );
}