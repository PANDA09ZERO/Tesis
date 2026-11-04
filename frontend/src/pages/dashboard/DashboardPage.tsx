import MobileDashboard, {activityDate, type MobileDashboardStats} from './MobileDashboard';
import ProfesorPanelPage from '../teachers/ProfesorPanelPage';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, GraduationCap, BookOpen, AlertTriangle, FileText, TrendingUp, Layers, Calendar, ClipboardCheck, BarChart3, ChevronRight, School } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { dashboardApi, alertasApi, matriculasApi, periodosApi } from '../../api/endpoints';
import type { DashboardStats, Alerta } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePeriodo } from '../../context/PeriodoContext';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', 'var(--app-primary-500)'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.rol === 'profesor';
  const { periodoId, periodo, esHistorico, listo } = usePeriodo();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rendimiento, setRendimiento] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileStats,setMobileStats] = useState<MobileDashboardStats|null>(null);
  const [scope,setScope] = useState('');
  const loadRequest = useRef(0);

  const quickAccessItems = [
    { id: 'grados', label: 'Grados', icon: Layers, path: '/admin/configuracion-academica', color: 'blue' },
    { id: 'cursos', label: 'Cursos', icon: BookOpen, path: '/cursos', color: 'green' },
    { id: 'horarios', label: 'Horarios', icon: Calendar, path: '/horarios', color: 'purple' },
    { id: 'asistencia', label: 'Asistencia', icon: ClipboardCheck, path: '/asistencias', color: 'yellow' },
    { id: 'calificaciones', label: 'Calificaciones', icon: TrendingUp, path: '/calificaciones', color: 'red' },
    { id: 'periodos', label: 'Periodos', icon: Calendar, path: '/periodos', color: 'info' },
  ];

  const loadData = useCallback(async () => {
    if (user?.rol !== 'administrador' || !listo) return;
    const request = ++loadRequest.current;
    setLoading(true); setError(''); setMobileStats(null);
    try {
      const [statsRes,rendRes,asisRes,alertRes,actRes,scopeRes] = await Promise.all([
        dashboardApi.getStats(), dashboardApi.getRendimiento(periodoId ? {periodo_id:Number(periodoId)} : undefined),
        dashboardApi.getAsistenciaReciente(), alertasApi.getAll({estado:'activa',limit:5}), dashboardApi.getActividadReciente(),
        periodoId ? periodosApi.getById(Number(periodoId)) : matriculasApi.getEstadisticas()
      ]);
      if (request !== loadRequest.current) return;
      const loadedStats = statsRes.data.data;
      if (!loadedStats) throw new Error('El servidor no devolvió las estadísticas del panel');
      const scoped = scopeRes.data.data as any;
      if (periodoId) {
        if (!scoped?.resumen || !scoped.periodo) throw new Error('No se pudo obtener el resumen del periodo');
        setMobileStats({alumnos:Number(scoped.resumen.alumnos_activos),profesores:Number(scoped.resumen.profesores),matriculas:Number(scoped.resumen.inscripciones),cursos:Number(scoped.resumen.cursos)});
        setScope(scoped.periodo.nombre);
      } else {
        if (!scoped?.general) throw new Error('No se pudo obtener el resumen de matrículas');
        setMobileStats({alumnos:Number(loadedStats.totalAlumnos),profesores:Number(loadedStats.totalProfesores),matriculas:Number(scoped.general.total_matriculas),cursos:Number(loadedStats.totalCursos)});
        setScope('Visión general');
      }
      setStats(loadedStats); setRendimiento(rendRes.data.data || []); setAsistencia(asisRes.data.data || []);
      setAlertas(alertRes.data.data || []); setActividad(actRes.data.data || []);
    } catch(error:any) {if(request===loadRequest.current)setError(error.response?.data?.message || error.message || 'No se pudo cargar el panel');}
    finally {if(request===loadRequest.current)setLoading(false);}
  },[user?.id,user?.rol,periodoId,listo]);
  useEffect(()=>{void loadData();return()=>{loadRequest.current++;};},[loadData]);

  if (isTeacher) return <ProfesorPanelPage />;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="card text-red-600 dark:text-red-400" role="alert">{error}<button className="btn-secondary ml-3" onClick={loadData}>Reintentar</button></div>;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <>
    {mobileStats && <MobileDashboard stats={mobileStats} activity={actividad} scope={scope} periodId={periodoId}/>}
    <div className="hidden space-y-8 lg:block">
      {/* Saludo personalizado: el escudo ya está en la barra lateral, no se repite aquí. */}
      <div className="app-page-heading">
        <h1>
          {getGreeting()}, {user?.nombre?.split(' ')[0]}
        </h1>
        <p>{periodo ? `${periodo.nombre} · ${esHistorico ? 'histórico' : 'vigente'}` : user?.rol}</p>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title={isTeacher ? 'Mis alumnos' : 'Alumnos'} value={stats?.totalAlumnos || 0} icon={GraduationCap} color="blue" />
        <StatCard title={isTeacher ? 'Apoderados' : 'Profesores'} value={isTeacher ? stats?.totalApoderados || 0 : stats?.totalProfesores || 0} icon={Users} color="green" />
        <StatCard title={isTeacher ? 'Mis cursos' : 'Cursos'} value={stats?.totalCursos || 0} icon={BookOpen} color="purple" />
        <StatCard title="Alertas" value={stats?.alertasActivas || 0} icon={AlertTriangle} color="red" />
        {user?.rol === 'administrador' && <StatCard title="Documentos" value={stats?.documentosPendientes || 0} icon={FileText} color="yellow" />}
        <StatCard title="Asistencia" value={`${stats?.asistenciaPromedio || 0}%`} icon={TrendingUp} color="green" />
      </div>

      {/* Accesos rápidos */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.1875rem] font-bold text-gray-900 dark:text-gray-100">Accesos rápidos</h2>
          <button onClick={() => navigate('/modulos')} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-400">
            Ver todos
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-transparent p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {/* Un solo color de icono: el color ya no compite con el contenido. */}
                <Icon className="h-6 w-6 text-primary-600 dark:text-gray-300" aria-hidden="true" />
                <span className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actividad reciente */}
      {actividad.length > 0 && (
        <div className="card">
          <h2 className="mb-2 text-[1.1875rem] font-bold text-gray-900 dark:text-gray-100">Actividad reciente</h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {actividad.slice(0, 5).map((act, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3">
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{act.accion || act.descripcion || 'Actividad registrada'}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">{activityDate(act.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos - solo en desktop */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="mb-2 text-[1.1875rem] font-bold text-gray-900 dark:text-gray-100">Rendimiento por Grado</h3>
          <p className="mb-4 text-[0.8125rem] text-gray-500 dark:text-gray-400">{periodo ? `${esHistorico ? 'Histórico' : 'Vigente'}: ${periodo.nombre}` : 'Periodo activo'}. Promedios separados por escala; no constituyen una nota final.</p>
          {rendimiento.length ? <div className="space-y-2">{rendimiento.map((r,i)=><div key={i} className="flex flex-wrap justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm dark:text-gray-200"><span>{r.grado||'Grado sin identificar'} · {r.periodo}</span><span>{r.promedio_nota??'—'} / {r.escala_maxima??'escala histórica sin identificar'}</span></div>)}</div> : <p className="text-gray-500 dark:text-gray-400 py-8 text-sm">Sin datos de rendimiento</p>}
        </div>

        <div className="card">
          <h3 className="mb-2 text-[1.1875rem] font-bold text-gray-900 dark:text-gray-100">Alertas por Nivel de Riesgo</h3>
          {alertas.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={[
                    { name: 'Alto', value: alertas.filter(a => a.tipo_riesgo === 'alto').length },
                    { name: 'Medio', value: alertas.filter(a => a.tipo_riesgo === 'medio').length },
                    { name: 'Bajo', value: alertas.filter(a => a.tipo_riesgo === 'bajo').length },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {[2, 1, 0].map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12 text-sm">Sin alertas activas</p>
          )}
        </div>
      </div>
    </div></>
  );
}
