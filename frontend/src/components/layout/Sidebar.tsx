import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileText, AlertTriangle, BarChart3, Calendar, ChevronDown,
  ChevronRight, LogOut, Brain, School
} from 'lucide-react';

const adminMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    label: 'Institución', icon: School,
    children: [
      { to: '/alumnos', icon: Users, label: 'Alumnos' },
      { to: '/profesores', icon: Users, label: 'Profesores' },
    ]
  },
  {
    label: 'Académico', icon: GraduationCap,
    children: [
      { to: '/cursos', icon: BookOpen, label: 'Cursos' },
      { to: '/horarios', icon: Calendar, label: 'Horarios' },
      { to: '/periodos', icon: Calendar, label: 'Periodos' },
      { to: '/calendario', icon: Calendar, label: 'Calendario' },
    ]
  },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/asistencias', icon: ClipboardCheck, label: 'Asistencia' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/ia-prediccion', icon: Brain, label: 'IA Predicción' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
];

const profesorMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alumnos', icon: Users, label: 'Mis Alumnos' },
  { to: '/cursos', icon: BookOpen, label: 'Mis Cursos' },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/asistencias', icon: ClipboardCheck, label: 'Asistencia' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
];

const alumnoMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Mi Panel' },
  { to: '/cursos', icon: BookOpen, label: 'Mis Cursos' },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = React.useState<string[]>([]);

  const getMenu = () => {
    switch (user?.rol) {
      case 'administrador': return adminMenu;
      case 'profesor': return profesorMenu;
      case 'alumno': return alumnoMenu;
      default: return alumnoMenu;
    }
  };

  const toggleSection = (label: string) => {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menu = getMenu();

  return (
    <aside className="fixed lg:static left-0 top-0 z-30 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-gray-900 text-base leading-tight">Sistema Educativo</h1>
            <p className="text-xs text-gray-500">Gestión Académica</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary-700">
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre} {user?.apellido}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {menu.map((item) => (
          'children' in item && item.children ? (
            <div key={item.label}>
              <button
                onClick={() => toggleSection(item.label)}
                className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {openSections.includes(item.label) ?
                  <ChevronDown className="w-4 h-4 text-gray-400" /> :
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              {openSections.includes(item.label) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          )
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
