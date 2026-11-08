import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileText, AlertTriangle, BarChart3, Calendar,
  School, DollarSign, Layers, ShieldAlert
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export interface NavigationLink { to: string; icon: LucideIcon; label: string }
export interface NavigationGroup { label: string; icon: LucideIcon; children: NavigationLink[] }
export type NavigationItem = NavigationLink | NavigationGroup;

const adminMenu: NavigationItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/perfil', icon: Users, label: 'Mi perfil' },
  {
    label: 'Institución', icon: School,
    children: [
      { to: '/alumnos', icon: Users, label: 'Alumnos' },
      { to: '/profesores', icon: Users, label: 'Profesores' },
      { to: '/admin/apoderados', icon: Users, label: 'Apoderados' },
    ]
  },
  {
    label: 'Académico', icon: GraduationCap,
    children: [
      { to: '/cursos', icon: BookOpen, label: 'Cursos' },
      { to: '/admin/configuracion-academica', icon: Layers, label: 'Estructura Académica' },
      { to: '/horarios', icon: Calendar, label: 'Horarios' },
      { to: '/periodos', icon: Calendar, label: 'Periodos' },
    ]
  },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/asistencias', icon: ClipboardCheck, label: 'Asistencia' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/incidencias', icon: ShieldAlert, label: 'Incidencias' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/matriculas', icon: FileText, label: 'Matrículas' },
  { to: '/admin/pagos', icon: DollarSign, label: 'Pagos' },
];

const profesorMenu: NavigationLink[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profesor/perfil', icon: Users, label: 'Mi perfil' },
  { to: '/alumnos', icon: Users, label: 'Mis Alumnos' },
  { to: '/horarios', icon: Calendar, label: 'Mis horarios' },
  { to: '/profesor/notificaciones', icon: FileText, label: 'Mis notificaciones' },
  { to: '/profesor/apoderados', icon: Users, label: 'Apoderados' },
  { to: '/cursos', icon: BookOpen, label: 'Mis Cursos' },
  { to: '/periodos', icon: Calendar, label: 'Mis periodos' },
  { to: '/calificaciones', icon: ClipboardCheck, label: 'Calificaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/asistencias', icon: ClipboardCheck, label: 'Asistencia' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/incidencias', icon: ShieldAlert, label: 'Incidencias' },
];

const alumnoMenu: NavigationLink[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Mi panel' },
  { to: '/estudiante/perfil', icon: Users, label: 'Mi perfil' },
  { to: '/estudiante/cursos', icon: BookOpen, label: 'Mis cursos' },
  { to: '/estudiante/calificaciones', icon: ClipboardCheck, label: 'Mis calificaciones' },
  { to: '/estudiante/asistencia', icon: ClipboardCheck, label: 'Mi asistencia' },
  { to: '/estudiante/horarios', icon: Calendar, label: 'Mis horarios' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/estudiante/pagos', icon: DollarSign, label: 'Mis pagos' },
  { to: '/alertas', icon: AlertTriangle, label: 'Mis alertas' },
  { to: '/estudiante/notificaciones', icon: FileText, label: 'Mis notificaciones' },
];

const apoderadoMenu: NavigationLink[] = [
  { to: '/familia/perfil', icon: Users, label: 'Mi perfil' },
  { to: '/familia/alumnos', icon: Users, label: 'Estudiantes a mi cargo' },
];

// Sidebar and module catalog share this inventory; server permissions remain authoritative.
export function getNavigationMenu(role?: string, systemRole?: string): NavigationItem[] {
  const base: NavigationItem[] = role === 'administrador' ? adminMenu
    : role === 'profesor' ? profesorMenu : role === 'alumno' ? alumnoMenu
    : role === 'apoderado' ? apoderadoMenu : [];
  if (!base.length) return [];
  const result = [...base];
  return role === 'administrador' && systemRole === 'superadministrador'
    ? [{ to: '/superadministracion', icon: School, label: 'Control del sistema' }, ...result] : result;
}
