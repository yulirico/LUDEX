import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Diagnostic from './pages/Diagnostic';
import RouteMap from './pages/RouteMap';
import Learn from './pages/Learn';
import Practice from './pages/Practice';
import Challenge from './pages/Challenge';
import Results from './pages/Results';
import MyProgress from './pages/MyProgress';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute roles={['student']}><RouteMap /></ProtectedRoute>} />
            <Route path="/diagnostico" element={<ProtectedRoute roles={['student']}><Diagnostic /></ProtectedRoute>} />
            <Route path="/progreso" element={<ProtectedRoute roles={['student']}><MyProgress /></ProtectedRoute>} />
            <Route path="/nivel/:levelId/aprende" element={<ProtectedRoute roles={['student']}><Learn /></ProtectedRoute>} />
            <Route path="/nivel/:levelId/practica" element={<ProtectedRoute roles={['student']}><Practice /></ProtectedRoute>} />
            <Route path="/nivel/:levelId/reto" element={<ProtectedRoute roles={['student']}><Challenge /></ProtectedRoute>} />
            <Route path="/nivel/:levelId/resultados" element={<ProtectedRoute roles={['student']}><Results /></ProtectedRoute>} />
            <Route path="/docente" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}