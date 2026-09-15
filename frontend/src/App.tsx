import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AlumnosPage from './pages/students/AlumnosPage';
import AlumnoDetailPage from './pages/students/AlumnoDetailPage';
import ProfesoresPage from './pages/teachers/ProfesoresPage';
import CursosPage from './pages/academics/CursosPage';
import CursoDetailPage from './pages/academics/CursoDetailPage';
import CalificacionesPage from './pages/academics/CalificacionesPage';
import CalendarPage from './pages/CalendarPage';
import AsistenciasPage from './pages/academics/AsistenciasPage';
import HorariosPage from './pages/academics/HorariosPage';
import PeriodosPage from './pages/academics/PeriodosPage';
import DocumentosPage from './pages/documents/DocumentosPage';
import AlertasPage from './pages/alerts/AlertasPage';
import IAPrediccionPage from './pages/alerts/IAPrediccionPage';
import ReportesPage from './pages/reports/ReportesPage';
import UsuariosPage from './pages/admin/UsuariosPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><AppLayout><CursosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />

      <Route path="/alumnos" element={<ProtectedRoute><AppLayout title="Gestión de Alumnos"><AlumnosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/alumnos/:id" element={<ProtectedRoute><AppLayout title="Detalle del Alumno"><AlumnoDetailPage /></AppLayout></ProtectedRoute>} />

      <Route path="/profesores" element={<ProtectedRoute><AppLayout title="Gestión de Profesores"><ProfesoresPage /></AppLayout></ProtectedRoute>} />

      <Route path="/cursos" element={<ProtectedRoute><AppLayout><CursosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/cursos/:id" element={<ProtectedRoute><AppLayout><CursoDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/horarios" element={<ProtectedRoute><AppLayout title="Gestión de Horarios"><HorariosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/periodos" element={<ProtectedRoute><AppLayout title="Periodos Académicos"><PeriodosPage /></AppLayout></ProtectedRoute>} />

      <Route path="/calificaciones" element={<ProtectedRoute><AppLayout title="Calificaciones"><CalificacionesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><AppLayout title="Calendario"><CalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/asistencias" element={<ProtectedRoute><AppLayout title="Control de Asistencia"><AsistenciasPage /></AppLayout></ProtectedRoute>} />

      <Route path="/documentos" element={<ProtectedRoute><AppLayout title="Gestión Documental"><DocumentosPage /></AppLayout></ProtectedRoute>} />

      <Route path="/alertas" element={<ProtectedRoute><AppLayout title="Alertas Académicas"><AlertasPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ia-prediccion" element={<ProtectedRoute><AppLayout title="IA - Predicción de Riesgo"><IAPrediccionPage /></AppLayout></ProtectedRoute>} />

      <Route path="/reportes" element={<ProtectedRoute><AppLayout title="Reportes y Estadísticas"><ReportesPage /></AppLayout></ProtectedRoute>} />

      <Route path="/admin/usuarios" element={<ProtectedRoute><AppLayout title="Administración de Usuarios"><UsuariosPage /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
