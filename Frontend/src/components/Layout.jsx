import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  student: [
    { to: '/', label: 'Mi ruta', end: true },
    { to: '/progreso', label: 'Mi progreso' }
  ],
  teacher: [
    { to: '/docente', label: 'Resumen', end: true }
  ],
  admin: [
    { to: '/admin', label: 'Administración', end: true }
  ]
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? NAV[user.role] || [] : [];

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="logo">Ludex</span>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            {l.label}
          </NavLink>
        ))}
        <span className="spacer" />
        {user && <span className="who">{user.full_name}</span>}
        {user && <button className="logout" onClick={onLogout}>Salir</button>}
      </header>
      <Outlet />
    </div>
  );
}