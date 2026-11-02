import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Layers, Calendar, BarChart3, User, ClipboardCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../context/NavigationContext';

export default function BottomNavigation() {
  const navigate = useNavigate(); const {pathname} = useLocation(); const {user} = useAuth();
  const {openModules, openProfile} = useAppNavigation();
  const guardian = user?.rol === 'apoderado', student = user?.rol === 'alumno', admin = user?.rol === 'administrador';
  const isSuperAdmin = user?.rolSistema === 'superadministrador';
  const home = guardian ? '/familia/alumnos' : '/dashboard';
  const schedule = student ? '/estudiante/horarios' : '/horarios';
  const notes = student ? '/estudiante/calificaciones' : '/calificaciones';
  const items = [
    {id:'home',label:'Inicio',icon:Home,path:home,action:()=>navigate(home)},
    {id:'modules',label:'Módulos',icon:Layers,path:'/modulos',action:openModules},
    ...(!guardian ? [{id:'schedule',label:'Horarios',icon:Calendar,path:schedule,action:()=>navigate(schedule)},
      {id:'reports',label:admin?'Reportes':'Notas',icon:admin?BarChart3:ClipboardCheck,path:admin?'/reportes':notes,action:()=>navigate(admin?'/reportes':notes)}] : []),
    ...(isSuperAdmin ? [{id:'superadmin',label:'Sistema',icon:Shield,path:'/superadministracion',action:()=>navigate('/superadministracion')}] : []),
    {id:'profile',label:'Perfil',icon:User,path:guardian?'/familia/perfil':student?'/estudiante/perfil':user?.rol==='profesor'?'/profesor/perfil':'/perfil',action:openProfile}
  ];
  return <nav aria-label="Navegación inferior" className={`fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/95 lg:hidden`}>
    <div className="mx-auto grid h-16 max-w-2xl auto-cols-fr grid-flow-col px-2">{items.map(item=>{const Icon=item.icon;const active=Boolean(item.path&&(pathname===item.path||pathname.startsWith(item.path+'/')||(item.id==='home'&&pathname==='/')));return <button type="button" key={item.id} onClick={item.action} aria-current={active?'page':undefined} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${active?'text-primary-600 dark:text-blue-400':'text-slate-500 hover:bg-blue-50 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-800'}`}><Icon className="h-5 w-5" aria-hidden="true"/><span>{item.label}</span></button>;})}</div>
  </nav>;
}
