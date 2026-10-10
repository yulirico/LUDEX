import { useEffect, useState } from 'react';
import { api } from '../api';

const ROLE_LABEL = { student: 'Estudiante', teacher: 'Docente', admin: 'Administrador' };

export default function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [content, setContent] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'student', group_name: '6-A' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function loadUsers() { api.adminUsers().then(r => setUsers(r.users)); }
  function loadContent() { api.adminContent().then(setContent); }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (tab === 'content' && !content) loadContent(); }, [tab, content]);

  async function createUser(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.adminCreateUser(form);
      setMsg('Usuario creado correctamente.');
      setForm({ username: '', password: '', full_name: '', role: 'student', group_name: '6-A' });
      loadUsers();
    } catch (err) { setError(err.message); }
  }

  async function removeUser(id) {
    if (!confirm('¿Eliminar este usuario y todo su progreso?')) return;
    await api.adminDeleteUser(id);
    loadUsers();
  }

  return (
    <div className="page">
      <h2>Administración</h2>
      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Usuarios</button>
        <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Contenidos</button>
      </div>

      {tab === 'users' && (
        <>
          <div className="card">
            <h3>Nuevo usuario</h3>
            <form onSubmit={createUser}>
              <div className="grid-2">
                <div>
                  <label>Nombre completo</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                </div>
                <div>
                  <label>Usuario</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div>
                  <label>Contraseña</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <div>
                  <label>Rol</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {form.role !== 'admin' && (
                  <div>
                    <label>Grupo</label>
                    <input value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} placeholder="6-A" />
                  </div>
                )}
              </div>
              {error && <div className="error-box">{error}</div>}
              {msg && <div className="card" style={{ borderColor: 'var(--teal)', marginTop: 10 }}>{msg}</div>}
              <div className="btns"><button className="btn primary" type="submit">Crear usuario</button></div>
            </form>
          </div>

          <div className="card">
            <table className="t">
              <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Grupo</th><th></th></tr></thead>
              <tbody>
                {(users || []).map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.username}</td>
                    <td>{ROLE_LABEL[u.role]}</td>
                    <td>{u.group_name || '—'}</td>
                    <td><button className="btn ghost" onClick={() => removeUser(u.id)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'content' && content && (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>Niveles y retos cargados en el sistema (edición ampliable desde el backend).</p>
          {content.levels.map(l => (
            <div key={l.id} style={{ marginBottom: 14 }}>
              <b>{l.title}</b> <span className="tag">{l.game_id}</span>
              <ul>
                {content.challenges.filter(c => c.level_id === l.id).map(c => (
                  <li key={c.id} style={{ fontSize: 13 }}>{c.prompt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}