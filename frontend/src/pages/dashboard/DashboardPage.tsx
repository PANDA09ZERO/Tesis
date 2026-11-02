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
    <div className="hidden space-y-6 lg:block">
      {/* Saludo personalizado */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden dark:bg-gray-800">
          <img src="/assets/logo.png" alt="Ciencias e Ingeniería" className="w-10 h-10 object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}, {user?.nombre?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.rol}</p>
        </div>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard title={isTeacher ? 'Mis alumnos' : 'Alumnos'} value={stats?.totalAlumnos || 0} icon={GraduationCap} color="blue" />
        <StatCard title={isTeacher ? 'Apoderados' : 'Profesores'} value={isTeacher ? stats?.totalApoderados || 0 : stats?.totalProfesores || 0} icon={Users} color="green" />
        <StatCard title={isTeacher ? 'Mis cursos' : 'Cursos'} value={stats?.totalCursos || 0} icon={BookOpen} color="purple" />
        <StatCard title="Alertas" value={stats?.alertasActivas || 0} icon={AlertTriangle} color="red" />
        {user?.rol === 'administrador' && <StatCard title="Documentos" value={stats?.documentosPendientes || 0} icon={FileText} color="yellow" />}
        <StatCard title="Asistencia" value={`${stats?.asistenciaPromedio || 0}%`} icon={TrendingUp} color="green" />
      </div>

      {/* Accesos rápidos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Accesos rápidos</h2>
          <button onClick={() => navigate('/modulos')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            Ver todos
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                  item.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                  item.color === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                  item.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' :
                  item.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                  item.color === 'red' ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' :
                  'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actividad reciente */}
      {actividad.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Actividad reciente</h2>
          <div className="space-y-3">
            {actividad.slice(0, 5).map((act, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{act.accion || act.descripcion || 'Actividad registrada'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activityDate(act.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos - solo en desktop */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Rendimiento por Grado</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{periodo ? `${esHistorico ? 'Histórico' : 'Vigente'}: ${periodo.nombre}` : 'Periodo activo'}. Promedios separados por escala; no constituyen una nota final.</p>
          {rendimiento.length ? <div className="space-y-2">{rendimiento.map((r,i)=><div key={i} className="flex flex-wrap justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm dark:text-gray-200"><span>{r.grado||'Grado sin identificar'} · {r.periodo}</span><span>{r.promedio_nota??'—'} / {r.escala_maxima??'escala histórica sin identificar'}</span></div>)}</div> : <p className="text-gray-500 dark:text-gray-400 py-8 text-sm">Sin datos de rendimiento</p>}
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Alertas por Nivel de Riesgo</h3>
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
