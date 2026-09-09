import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileText, AlertTriangle, BarChart3, Settings, Calendar, ChevronDown,
  ChevronRight, LogOut, Menu, X, Brain
} from 'lucide-react';

const adminMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    label: 'Gestión Académica', icon: GraduationCap,
    children: [
      { to: '/alumnos', icon: Users, label: 'Alumnos' },
      { to: '/profesores', icon: Users, label: 'Profesores' },
      { to: '/cursos', icon: BookOpen, label: 'Cursos' },
      { to: '/horarios', icon: Calendar, label: 'Horarios' },
      { to: '/periodos', icon: Calendar, label: 'Periodos Académicos' },
    ]
  },
  {
    label: 'Calificaciones', icon: ClipboardCheck,
    children: [
      { to: '/calificaciones', icon: ClipboardCheck, label: 'Registro' },
    ]
  },
  {
    label: 'Asistencia', icon: ClipboardCheck,
    children: [
      { to: '/asistencias', icon: ClipboardCheck, label: 'Registro' },
    ]
  },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas Académicas' },
  { to: '/ia-prediccion', icon: Brain, label: 'IA Predicción' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/usuarios', icon: Settings, label: 'Usuarios' },
];

const profesorMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alumnos', icon: Users, label: 'Mis Alumnos' },
  { to: '/cursos', icon: BookOpen, label: 'Mis Cursos' },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/asistencias', icon: ClipboardCheck, label: 'Asistencia' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
];

const alumnoMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Mi Panel' },
  { to: '/mis-calificaciones', icon: ClipboardCheck, label: 'Mis Calificaciones' },
  { to: '/mi-horario', icon: Calendar, label: 'Mi Horario' },
  { to: '/mi-asistencia', icon: ClipboardCheck, label: 'Mi Asistencia' },
  { to: '/mis-documentos', icon: FileText, label: 'Mis Documentos' },
  { to: '/mis-alertas', icon: AlertTriangle, label: 'Mis Alertas' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<string[]>(['']);

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
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed left-0 top-0 z-30 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Gestión Educativa</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {menu.map((item) => (
              'children' in item ? (
                <div key={item.label}>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-gray-400" />
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
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
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
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </NavLink>
              )
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.nombre?.[0]}{user?.apellido?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
