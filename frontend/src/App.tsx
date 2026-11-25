import SystemSuspended from './components/SystemSuspended';
import React, { lazy, Suspense } from 'react';
import PageLoader from './components/ui/PageLoader';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ForcedPasswordChangePage from './pages/auth/ForcedPasswordChangePage';

// Cada página se descarga al visitarla por primera vez; el login queda en el paquete inicial.
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const ModulesPage = lazy(() => import('./pages/modules/ModulesPage'));
const SuperadministracionPage = lazy(() => import('./pages/admin/SuperadministracionPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AlumnosPage = lazy(() => import('./pages/students/AlumnosPage'));
const AlumnoDetailPage = lazy(() => import('./pages/students/AlumnoDetailPage'));
const ProfesoresPage = lazy(() => import('./pages/teachers/ProfesoresPage'));
const ProfesorDetailPage = lazy(() => import('./pages/teachers/ProfesorDetailPage'));
const CursosPage = lazy(() => import('./pages/academics/CursosPage'));
const OfertaDetailPage = lazy(() => import('./pages/academics/OfertaDetailPage'));
const CalificacionesPage = lazy(() => import('./pages/academics/CalificacionesPage'));
const OfertaCalificacionesPage = lazy(() => import('./pages/academics/OfertaCalificacionesPage'));
const ProfesorOfertasCalificacionesPage = lazy(() => import('./pages/academics/ProfesorOfertasCalificacionesPage'));
const ProfesorApoderadosPage = lazy(() => import('./pages/teachers/ProfesorApoderadosPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AsistenciasPage = lazy(() => import('./pages/academics/AsistenciasPage'));
const OfertaAsistenciasPage = lazy(() => import('./pages/academics/OfertaAsistenciasPage'));
const HorariosPage = lazy(() => import('./pages/academics/HorariosPage'));
const PeriodoDetailPage = lazy(() => import('./pages/academics/PeriodoDetailPage'));
const PeriodosPage = lazy(() => import('./pages/academics/PeriodosPage'));
const ConfiguracionAcademicaPage = lazy(() => import('./pages/academics/ConfiguracionAcademicaPage'));
const DocumentosPage = lazy(() => import('./pages/documents/DocumentosPage'));
const AlertasPage = lazy(() => import('./pages/alerts/AlertasPage'));
const IncidenciasPage = lazy(() => import('./pages/incidencias/IncidenciasPage'));
const ExalumnosPage = lazy(() => import('./pages/students/ExalumnosPage'));
const ImportarExalumnosPage = lazy(() => import('./pages/students/ImportarExalumnosPage'));
const TramitesPage = lazy(() => import('./pages/tramites/TramitesPage'));
const ReportesPage = lazy(() => import('./pages/reports/ReportesPage'));
const PagosPage = lazy(() => import('./pages/admin/PagosPage'));
const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'));
const ApoderadosPage = lazy(() => import('./pages/admin/ApoderadosPage'));
const MatriculasPage = lazy(() => import('./pages/admin/MatriculasPage'));
const NotificacionesPage = lazy(() => import('./pages/admin/NotificacionesPage'));
const ProfesorPerfilPage = lazy(() => import('./pages/teachers/ProfesorPerfilPage'));
const ProfesorOfertasPage = lazy(() => import('./pages/teachers/ProfesorOfertasPage'));
const EstudiantePage = lazy(() => import('./pages/students/EstudiantePage'));
const EstudianteCursoPage = lazy(() => import('./pages/students/EstudiantePage').then(m => ({ default: m.EstudianteCursoPage })));
const FamilyStudentsPage = lazy(() => import('./pages/guardian/FamilyStudentsPage'));
const GaleriaPage = lazy(() => import('./pages/public/GaleriaPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.rol === 'profesor' && location.pathname.startsWith('/familia/')) return <Navigate to="/dashboard" replace />;
  if (user?.rol === 'alumno') {
    const aliases: Record<string,string> = {'/cursos':'/estudiante/cursos','/horarios':'/estudiante/horarios'};
    if (aliases[location.pathname]) return <Navigate to={aliases[location.pathname]} replace />;
    const allowed = ['/', '/dashboard', '/modulos', '/calificaciones', '/asistencias', '/calendario', '/alertas'].includes(location.pathname) || /^\/estudiante\/(perfil|cursos|calificaciones|asistencia|horarios|pagos|notificaciones)$/.test(location.pathname) || /^\/estudiante\/cursos\/\d+$/.test(location.pathname);
    if (!allowed) return <Navigate to="/dashboard" replace />;
  }
  const isGuardianPage = ['/familia/alumnos','/familia/perfil','/familia/notificaciones','/modulos'].includes(location.pathname) || /^\/alumnos\/\d+$/.test(location.pathname);
  if (user?.rol === 'apoderado' && !isGuardianPage) {
    return <Navigate to="/familia/alumnos" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { user } = useAuth();
  return user && allowed.includes(user.rol) ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function SuperRoute({children}:{children:React.ReactNode}){const {user}=useAuth();return user?.rolSistema==='superadministrador'?<>{children}</>:<Navigate to="/dashboard" replace/>;}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function RoleCalificacionesPage() {
  const { user } = useAuth();
  return user?.rol === 'alumno' ? <EstudiantePage vista="calificaciones" /> : user?.rol === 'profesor' ? <ProfesorOfertasCalificacionesPage /> : <CalificacionesPage />;
}

function RoleCursosPage() { const {user} = useAuth(); return user?.rol === 'profesor' ? <ProfesorOfertasPage modo="cursos" /> : <CursosPage />; }
function RoleAsistenciasPage() { const {user} = useAuth(); return user?.rol === 'alumno' ? <EstudiantePage vista="asistencia" /> : user?.rol === 'profesor' ? <ProfesorOfertasPage modo="asistencia" /> : <AsistenciasPage />; }
function RoleInicioPage() { const {user} = useAuth(); return user?.rol === 'alumno' ? <EstudiantePage /> : user?.rol === 'profesor' ? <DashboardPage /> : <CursosPage />; }

function RoleDashboardPage() { const {user}=useAuth(); return user?.rol==='alumno' ? <EstudiantePage /> : <DashboardPage />; }

function ApplicationRoutes() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.debe_cambiar_password) return <ForcedPasswordChangePage />;

  return (
      <><SystemSuspended/><Suspense fallback={<PageLoader fullScreen />}><Routes>
      <Route path="/superadministracion" element={<ProtectedRoute><SuperRoute><AppLayout title="Control del sistema"><SuperadministracionPage /></AppLayout></SuperRoute></ProtectedRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/galeria" element={<GaleriaPage />} />

      <Route path="/" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor', 'alumno']}><AppLayout><RoleInicioPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Mi cuenta"><ProfilePage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/modulos" element={<ProtectedRoute><RoleRoute allowed={['administrador','profesor','alumno','apoderado']}><AppLayout title="Accesos del sistema"><ModulesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><RoleDashboardPage /></AppLayout></ProtectedRoute>} />
      {(['perfil','cursos','calificaciones','asistencia','horarios','pagos'] as const).map(vista => <Route key={vista} path={`/estudiante/${vista}`} element={<ProtectedRoute><RoleRoute allowed={['alumno']}><AppLayout>{vista==='perfil'?<ProfilePage/>:<EstudiantePage vista={vista} />}</AppLayout></RoleRoute></ProtectedRoute>} />)}
      <Route path="/estudiante/cursos/:matriculaId" element={<ProtectedRoute><RoleRoute allowed={['alumno']}><AppLayout title="Mi curso"><EstudianteCursoPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/estudiante/notificaciones" element={<ProtectedRoute><RoleRoute allowed={['alumno']}><AppLayout title="Mis notificaciones"><NotificacionesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/familia/perfil" element={<ProtectedRoute><RoleRoute allowed={['apoderado']}><AppLayout title="Mi cuenta"><ProfesorPerfilPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/familia/notificaciones" element={<ProtectedRoute><RoleRoute allowed={['apoderado']}><AppLayout title="Mis notificaciones"><NotificacionesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/familia/alumnos" element={<ProtectedRoute><RoleRoute allowed={['apoderado']}><AppLayout title="Estudiantes a mi cargo"><FamilyStudentsPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/alumnos" element={<ProtectedRoute><AppLayout title="Gestión de Alumnos"><AlumnosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/exalumnos" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Exalumnos"><ExalumnosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/exalumnos/importar" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Importar exalumnos"><ImportarExalumnosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/tramites" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Trámites y certificados"><TramitesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/alumnos/:id" element={<ProtectedRoute><AppLayout title="Detalle del Alumno"><AlumnoDetailPage /></AppLayout></ProtectedRoute>} />

      <Route path="/profesores" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Gestión de Profesores"><ProfesoresPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/profesores/:id" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Detalle del Profesor"><ProfesorDetailPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/profesor/perfil" element={<ProtectedRoute><RoleRoute allowed={['profesor']}><AppLayout title="Mi cuenta"><ProfesorPerfilPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/profesor/notificaciones" element={<ProtectedRoute><RoleRoute allowed={['profesor']}><AppLayout title="Mis notificaciones"><NotificacionesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/profesor/apoderados" element={<ProtectedRoute><RoleRoute allowed={['profesor']}><AppLayout title="Apoderados de mis alumnos"><ProfesorApoderadosPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/cursos" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout><RoleCursosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/cursos/oferta/:ofertaId" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout><OfertaDetailPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/cursos/:id" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout><OfertaDetailPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/horarios" element={<ProtectedRoute><RoleRoute allowed={['administrador','profesor']}><AppLayout title="Horarios"><HorariosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/periodos" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout title="Periodos Académicos"><PeriodosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/periodos/:id" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout title="Detalle del periodo"><PeriodoDetailPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/configuracion-academica" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Estructura Académica"><ConfiguracionAcademicaPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/calificaciones/oferta/:ofertaId" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout title="Libro de Calificaciones"><OfertaCalificacionesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/calificaciones" element={<ProtectedRoute><AppLayout title="Calificaciones"><RoleCalificacionesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><AppLayout title="Calendario"><CalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/asistencias/oferta/:ofertaId" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout title="Asistencia del curso"><OfertaAsistenciasPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/asistencias" element={<ProtectedRoute><AppLayout title="Control de Asistencia"><RoleAsistenciasPage /></AppLayout></ProtectedRoute>} />

      <Route path="/documentos" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Gestión Documental"><DocumentosPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/alertas" element={<ProtectedRoute><AppLayout title="Alertas Académicas"><AlertasPage /></AppLayout></ProtectedRoute>} />

      <Route path="/incidencias" element={<ProtectedRoute><RoleRoute allowed={['administrador', 'profesor']}><AppLayout title="Incidencias de conducta"><IncidenciasPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/reportes" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Reportes y Estadísticas"><ReportesPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="/admin/usuarios" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Administración de Usuarios"><UsuariosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/apoderados" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Gestión de Apoderados"><ApoderadosPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/matriculas" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Gestión de Matrículas"><MatriculasPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/notificaciones" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Centro de Notificaciones"><NotificacionesPage /></AppLayout></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/pagos" element={<ProtectedRoute><RoleRoute allowed={['administrador']}><AppLayout title="Gestión de Pagos"><PagosPage /></AppLayout></RoleRoute></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></Suspense></>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <ApplicationRoutes />
    </ThemeProvider>
  );
}
