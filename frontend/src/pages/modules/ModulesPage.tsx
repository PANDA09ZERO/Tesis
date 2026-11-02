import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Search, X, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavigationMenu, type NavigationLink } from '../../components/layout/navigation';

const descriptions: Record<string, string> = {
  '/perfil': 'Datos de tu cuenta y contraseña.',
  '/dashboard': 'Tu panel de inicio y avisos.',
  '/alumnos': 'Datos y consulta académica de alumnos.',
  '/profesores': 'Perfiles y asignaciones docentes.',
  '/admin/apoderados': 'Apoderados y vínculos familiares.',
  '/cursos': 'Cursos y ofertas académicas.',
  '/admin/configuracion-academica': 'Grados, cursos y docentes por periodo.',
  '/horarios': 'Consulta y organización de clases.',
  '/periodos': 'Calendario académico e historial.',
  '/calificaciones': 'Libros y registros de evaluación.',
  '/calendario': 'Eventos del calendario.',
  '/asistencias': 'Registro y consulta de asistencia.',
  '/documentos': 'Archivos, expedientes y libretas de notas.',
  '/alertas': 'Consulta y seguimiento de alertas.',
  '/reportes': 'Consulta de reportes institucionales.',
  '/admin/usuarios': 'Cuentas y datos de acceso.',
  '/admin/matriculas': 'Inscripción de alumnos por periodo.',
  '/admin/pagos': 'Matrícula, mensualidades y sueldos.',
  '/profesor/perfil': 'Datos personales y contraseña.',
  '/profesor/notificaciones': 'Tus notificaciones y avisos.',
  '/profesor/apoderados': 'Apoderados de tus alumnos.',
  '/estudiante/perfil': 'Datos personales y contraseña.',
  '/estudiante/cursos': 'Cursos de tus matrículas.',
  '/estudiante/calificaciones': 'Tus notas y evaluaciones.',
  '/estudiante/asistencia': 'Tu historial de asistencia.',
  '/estudiante/horarios': 'Horarios de tus clases.',
  '/estudiante/pagos': 'Consulta de tus pagos por concepto.',
  '/estudiante/notificaciones': 'Tus notificaciones y avisos.',
  '/familia/perfil': 'Datos de tu cuenta y contraseña.',
  '/familia/alumnos': 'Consulta de los estudiantes vinculados.',
  '/superadministracion': 'Operaciones de control del sistema.'
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function ModulesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const menu = getNavigationMenu(user?.rol, user?.rolSistema);
  const standalone: NavigationLink[] = [];
  const groups: Array<{ label: string; links: NavigationLink[] }> = [];
  for (const item of menu) {
    if ('children' in item) groups.push({ label: item.label, links: item.children });
    else if (item.to !== '/modulos' && (isDesktop || item.to !== '/dashboard')) standalone.push(item);
  }
  if (standalone.length) groups.push({
    label: user?.rol === 'administrador' ? 'Gestión y herramientas' : user?.rol === 'apoderado' ? 'Mi familia' : 'Mi espacio',
    links: standalone
  });
  const query = normalize(search);
  const visible = groups.map(group => ({ ...group, links: group.links.filter(link => normalize(`${group.label} ${link.label} ${descriptions[link.to] || ''}`).includes(query)) })).filter(group => group.links.length);
  const count = visible.reduce((total, group) => total + group.links.length, 0);

  return <div className="modules-catalog mx-auto max-w-6xl space-y-5">
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-gray-100"><LayoutGrid className="h-6 w-6" aria-hidden="true"/></span><div className="min-w-0"><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Módulos</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Elige el espacio al que quieres entrar.</p></div></div>
      <div className="relative mt-4"><label htmlFor="module-search" className="sr-only">Buscar módulo</label><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true"/><input id="module-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar módulo…" className="input-field pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none"/>{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda de módulos" className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"><X className="h-4 w-4" aria-hidden="true"/></button>}</div>
    </section>
    <p role="status" className="text-xs text-gray-500 dark:text-gray-400">{count} {count === 1 ? 'acceso disponible' : 'accesos disponibles'}{query ? ' para tu búsqueda' : ''}</p>
    {!count && <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700"><p className="text-sm text-gray-600 dark:text-gray-300">No se encontraron módulos.</p><button type="button" className="btn-secondary mt-4" onClick={() => setSearch('')}>Mostrar todos</button></div>}
    {visible.map((group, index) => <section key={group.label} aria-labelledby={`module-group-${index}`}>
      <h2 id={`module-group-${index}`} className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{group.label}</h2>
      <div className="module-bento-grid grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{group.links.map(link => {
        const Icon = link.icon;
        return <Link key={link.to} to={link.to} aria-label={link.label} className="group flex min-h-36 min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500 dark:hover:bg-gray-800 sm:p-4">
          <div className="mb-3 flex items-start justify-between gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-gray-200"><Icon className="h-5 w-5" aria-hidden="true"/></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true"/></div>
          <h3 className="break-words text-sm font-semibold text-gray-900 dark:text-gray-100">{link.label}</h3><p className="mt-1 break-words text-xs leading-relaxed text-gray-500 dark:text-gray-400">{descriptions[link.to] || 'Consulta este espacio de tu cuenta.'}</p>
        </Link>;
      })}</div>
    </section>)}
  </div>;
}
