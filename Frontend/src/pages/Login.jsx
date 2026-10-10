import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      if (user.role === 'student') navigate('/');
      else if (user.role === 'teacher') navigate('/docente');
      else navigate('/admin');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="login-card">
        <div className="login-left">
          <div className="logo-big">Ludex</div>
          <p>Aprende jugando ajedrez y dominó. Piensa, calcula y avanza.</p>
        </div>
        <div className="login-right">
          <h3>Ingresa a Ludex</h3>
          <form onSubmit={onSubmit}>
            <label>Usuario</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoFocus placeholder="ana.martinez" />
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <div className="error-box">{error}</div>}
            <div className="btns">
              <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            </div>
          </form>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            Usuarios de prueba (contraseña <b>ludex123</b>): ana.martinez, luis.torres (estudiantes)
            y docente.6a (docente).
          </p>
        </div>
      </div>
    </div>
  );
}