import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Moon, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavigationContext } from '../../context/NavigationContext';
import Sidebar from './Sidebar';
import TaskPanel from './TaskPanel';
import ContentHeader from './ContentHeader';

import BottomNavigation from './BottomNavigation';
import { usePeriodo } from '../../context/PeriodoContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const RUTAS_CON_HEADER = ['/cursos'];

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate(); const {user} = useAuth(); const {theme,toggleTheme} = useTheme();
  const openModules = useCallback(()=>navigate('/modulos'),[navigate]);
  const openProfile = useCallback(()=>{if(user?.rol==='profesor')navigate('/profesor/perfil');else if(user?.rol==='alumno')navigate('/estudiante/perfil');else if(user?.rol==='apoderado')navigate('/familia/perfil');else navigate('/perfil');},[user?.rol,navigate]);
  const { aplica, periodo, esHistorico, todos } = usePeriodo();
  const isProfile = ['/perfil','/profesor/perfil','/estudiante/perfil','/familia/perfil'].includes(pathname);
  const isCourseDetail = pathname.startsWith('/cursos/');
  const showHeader = !isCourseDetail && RUTAS_CON_HEADER.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showTasks = pathname === '/cursos';

  return (
    <NavigationContext.Provider value={{openModules,openProfile}}><div className="flex h-screen h-dvh overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-slate-700 dark:bg-slate-900 sm:px-6 lg:min-h-16 lg:flex-nowrap lg:gap-2 lg:px-8 lg:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden lg:hidden"><img src="/assets/logo.png" alt="Ciencias e Ingeniería" className="h-9 w-9 object-contain" /></span><div className="min-w-0"><h1 className="truncate text-[0.9375rem] font-bold leading-tight text-gray-900 dark:text-gray-100 lg:text-base lg:font-semibold"><span className="lg:hidden">Ciencias e Ingeniería</span><span className="hidden lg:inline">{title||'Ciencias e Ingeniería'}</span></h1><p className="truncate text-[0.8125rem] capitalize leading-snug text-slate-500 dark:text-slate-400 lg:hidden">{user?.nombre} · {user?.rol==='administrador'?'Administración':user?.rol}</p></div></div>
          <button type="button" onClick={toggleTheme} aria-label={theme==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro'} title={theme==='dark'?'Tema claro':'Tema oscuro'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">{theme==='dark'?<Sun className="h-5 w-5"/>:<Moon className="h-5 w-5"/>}</button>
          <button type="button" onClick={openProfile} aria-label="Ver mi perfil" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><UserRound className="h-5 w-5"/></button>
          {user?.rol!=='apoderado'&&<button type="button" onClick={()=>navigate('/calendario')} aria-label="Abrir calendario" title="Calendario" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${pathname==='/calendario'?'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-blue-400':'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}><CalendarDays className="h-5 w-5"/></button>}
          {aplica&&!isProfile&&<button type="button" onClick={()=>navigate('/modulos#contexto-academico')} title="Cambiar periodo en Módulos → Contexto académico" className="order-last flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.8125rem] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:order-none lg:ml-2 lg:w-auto lg:max-w-xs">
  <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true"/>
  <span className="truncate">{todos ? 'Todos los periodos' : (periodo?.nombre || 'Periodo')}</span>
  {!todos && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${esHistorico ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800' : 'bg-green-50 text-green-800 ring-1 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-800'}`}>{esHistorico ? 'Histórico' : 'Vigente'}</span>}
  <span className="ml-auto hidden shrink-0 text-xs font-medium text-primary-700 sm:inline dark:text-slate-300">Cambiar</span>
</button>}
        </header>
        {showHeader && <ContentHeader title={title} />}
        <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${showTasks ? 'flex-col lg:flex-row' : ''}`}>
          <main className="app-surface min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950 dark:lg:bg-gray-900 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-12">
            <div className="app-page">{children}</div>
          </main>
          {showTasks && <TaskPanel />}
        </div>
      </div>
      <BottomNavigation/>

    </div></NavigationContext.Provider>
  );
}
