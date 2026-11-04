import { Link } from 'react-router-dom';
import { GraduationCap, Users, ClipboardList, BookOpen, Layers, Calendar, ClipboardCheck, Award, ArrowRight, Hand, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../context/NavigationContext';

export interface MobileDashboardStats {alumnos:number; profesores:number; matriculas:number; cursos:number}
export function activityDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return 'Fecha no registrada';
  return value.slice(0,10).split('-').reverse().join('/') + (value.length >= 16 ? ` · ${value.slice(11,16)}` : '');
}
export default function MobileDashboard({stats, activity, scope, periodId}:{stats:MobileDashboardStats; activity:any[]; scope:string; periodId:string}) {
  const {user} = useAuth(); const {openModules} = useAppNavigation();
  const links = [
    {label:'Grados',icon:Layers,to:`/admin/configuracion-academica${periodId?`?periodo_id=${periodId}`:''}`},
    {label:'Cursos',icon:BookOpen,to:'/cursos'}, {label:'Horarios',icon:Calendar,to:'/horarios'},
    {label:'Asistencia',icon:ClipboardCheck,to:'/asistencias'}, {label:'Calificaciones',icon:Award,to:'/calificaciones'},
    {label:'Periodos',icon:Calendar,to:'/periodos'}
  ];
  const cards = [
    {key:'alumnos',label:'Alumnos',value:stats.alumnos,icon:GraduationCap},
    {key:'profesores',label:'Profesores',value:stats.profesores,icon:Users},
    {key:'matriculas',label:'Matrículas',value:stats.matriculas,icon:ClipboardList},
    {key:'cursos',label:'Cursos',value:stats.cursos,icon:BookOpen}
  ];
  return <div className="dashboard-mobile space-y-5 lg:hidden">
    <section className="rounded-3xl bg-primary-700 px-5 py-5 text-white">
      <p className="text-[0.8125rem] font-medium text-primary-100">Panel administrativo · {scope}</p>
      <h2 className="mt-1.5 flex items-center gap-2 text-2xl font-bold leading-tight">¡Hola, {user?.nombre?.split(' ')[0]}! <Hand className="h-5 w-5 shrink-0" aria-hidden="true"/></h2>
      <p className="mt-1.5 text-[0.9375rem] text-primary-100">Bienvenido al sistema de gestión académica.</p>
    </section>
    <section aria-label="Estadísticas del panel" className="grid grid-cols-2 gap-3">{cards.map(card=>{const Icon=card.icon;return <Link to={{alumnos:"/alumnos",profesores:"/profesores",matriculas:"/admin/matriculas",cursos:"/cursos"}[card.key]!} key={card.key} aria-label={`Ver ${card.label.toLowerCase()}`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Icon className="h-5 w-5 text-primary-600 dark:text-blue-400" aria-hidden="true"/><p className="mt-3 text-[1.75rem] font-bold leading-none tabular-nums text-slate-900 dark:text-slate-100">{new Intl.NumberFormat('es-PE').format(card.value)}</p><h3 className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{card.label}</h3>{card.key==='matriculas'&&<p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Inscripciones por curso</p>}</Link>;})}</section>
    <section aria-labelledby="quick-access-title">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 id="quick-access-title" className="text-[1.1875rem] font-bold text-slate-900 dark:text-slate-100">Accesos rápidos</h2><button type="button" onClick={openModules} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary-600 dark:text-blue-400">Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true"/></button></div>
      <div className="grid grid-cols-2 gap-2">{links.map(link=>{const Icon=link.icon;return <Link key={link.label} to={link.to} className="flex min-h-24 flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[0.9375rem] font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><Icon className="h-5 w-5 text-primary-600 dark:text-blue-400" aria-hidden="true"/><span>{link.label}</span></Link>;})}</div>
    </section>
    <section aria-labelledby="recent-activity-title">
      <h2 id="recent-activity-title" className="mb-1 text-[1.1875rem] font-bold text-slate-900 dark:text-slate-100">Actividad reciente</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Eventos generales del sistema.</p>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
        {!activity.length ? <p className="py-5 text-sm text-slate-500 dark:text-slate-400">Sin actividad registrada.</p> : activity.slice(0,5).map((item,index)=><article key={item.id||index} className="flex gap-3 py-4"><Activity className="mt-1 h-5 w-5 shrink-0 text-primary-600 dark:text-blue-400" aria-hidden="true"/><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{item.accion||item.descripcion||'Actividad registrada'}</h3><p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{item.descripcion||[item.entidad?.replace(/_/g,' '),[item.nombre,item.apellido].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{activityDate(item.created_at)}</p></div></article>)}
      </div>
    </section>
  </div>;
}
