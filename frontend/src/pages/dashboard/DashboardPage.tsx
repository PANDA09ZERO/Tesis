import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { dashboardApi, alertasApi } from '../../api/endpoints';
import type { DashboardStats, Alerta } from '../../types';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rendimiento, setRendimiento] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, rendRes, asisRes, alertRes, actRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getRendimiento(),
        dashboardApi.getAsistenciaReciente(),
        alertasApi.getAll({ estado: 'activa', limit: 5 }),
        dashboardApi.getActividadReciente()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data!);
      if (rendRes.status === 'fulfilled') setRendimiento(rendRes.value.data.data || []);
      if (asisRes.status === 'fulfilled') setAsistencia(asisRes.value.data.data || []);
      if (alertRes.status === 'fulfilled') setAlertas(alertRes.value.data.data || []);
      if (actRes.status === 'fulfilled') setActividad(actRes.value.data.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Alumnos Matriculados" value={stats?.totalAlumnos || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Profesores" value={stats?.totalProfesores || 0} icon={Users} color="green" />
        <StatCard title="Cursos" value={stats?.totalCursos || 0} icon={BookOpen} color="purple" />
        <StatCard title="Alertas Activas" value={stats?.alertasActivas || 0} icon={AlertTriangle} color="red" />
        <StatCard title="Documentos Pendientes" value={stats?.documentosPendientes || 0} icon={FileText} color="yellow" />
        <StatCard title="Asistencia Promedio" value={`${stats?.asistenciaPromedio || 0}%`} icon={TrendingUp} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento por Grado</h3>
          {rendimiento.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rendimiento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="seccion" fontSize={12} />
                <YAxis domain={[0, 20]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="promedio_nota" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Sin datos de rendimiento</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas por Nivel de Riesgo</h3>
          {alertas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
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
            <p className="text-gray-500 text-center py-12">Sin alertas activas</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Asistencia</h3>
          {asistencia.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={asistencia.slice(0, 15).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" fontSize={10} tickFormatter={(v) => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'short' })} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="presentes" stroke="#22c55e" strokeWidth={2} name="Presentes" />
                <Line type="monotone" dataKey="ausentes" stroke="#ef4444" strokeWidth={2} name="Ausentes" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Sin datos de asistencia</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Recientes</h3>
          {alertas.length > 0 ? (
            <div className="space-y-3">
              {alertas.slice(0, 5).map((alerta) => (
                <div key={alerta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {alerta.alumno_nombre} {alerta.alumno_apellido}
                    </p>
                    <p className="text-xs text-gray-500">{alerta.descripcion?.substring(0, 60)}...</p>
                  </div>
                  <Badge variant={alerta.tipo_riesgo === 'alto' ? 'danger' : alerta.tipo_riesgo === 'medio' ? 'warning' : 'success'}>
                    {alerta.tipo_riesgo.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">Sin alertas activas</p>
          )}
        </div>
      </div>
    </div>
  );
}
