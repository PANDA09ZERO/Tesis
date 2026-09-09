import React, { useEffect, useState } from 'react';
import { FileBarChart, Download, Filter } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { reportesApi, periodosApi } from '../../api/endpoints';
import type { PeriodoAcademico } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ReporteTipo = 'rendimiento' | 'asistencia' | 'riesgo' | 'documentos';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<ReporteTipo>('rendimiento');
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    periodosApi.getAll().then(res => setPeriodos(res.data.data || []));
  }, []);

  useEffect(() => { loadReporte(); }, [activeTab, periodoSeleccionado]);

  const loadReporte = async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case 'rendimiento':
          res = await reportesApi.getRendimiento(periodoSeleccionado ? { periodo_id: periodoSeleccionado } : {});
          break;
        case 'asistencia':
          res = await reportesApi.getAsistencia(periodoSeleccionado ? { periodo_id: periodoSeleccionado } : {});
          break;
        case 'riesgo':
          res = await reportesApi.getAlumnosEnRiesgo();
          break;
        case 'documentos':
          res = await reportesApi.getDocumentos();
          break;
      }
      setData(res?.data.data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const tabs: { key: ReporteTipo; label: string }[] = [
    { key: 'rendimiento', label: 'Rendimiento' },
    { key: 'asistencia', label: 'Asistencia' },
    { key: 'riesgo', label: 'Alumnos en Riesgo' },
    { key: 'documentos', label: 'Documentos' },
  ];

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>{tab.label}</button>
          ))}
        </div>
        {(activeTab === 'rendimiento' || activeTab === 'asistencia') && (
          <select value={periodoSeleccionado} onChange={e => setPeriodoSeleccionado(e.target.value)} className="input-field w-48">
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="card animate-pulse h-64" />
      ) : activeTab === 'rendimiento' ? (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Promedio por Grado y Sección</h3>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data}>
                  <XAxis dataKey="seccion" fontSize={12} />
                  <YAxis domain={[0, 20]} />
                  <Tooltip />
                  <Bar dataKey="promedio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-center py-12">Sin datos</p>}
          </div>
          <div className="card overflow-hidden p-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header px-4 py-3">Grado</th>
                  <th className="table-header px-4 py-3">Sección</th>
                  <th className="table-header px-4 py-3">Curso</th>
                  <th className="table-header px-4 py-3">Promedio</th>
                  <th className="table-header px-4 py-3">Aprobados</th>
                  <th className="table-header px-4 py-3">Desaprobados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{r.grado}</td>
                    <td className="px-4 py-3 text-sm">{r.seccion}</td>
                    <td className="px-4 py-3 text-sm font-medium">{r.curso}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.promedio}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{r.aprobados}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{r.desaprobados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'asistencia' ? (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header px-4 py-3">Alumno</th>
                <th className="table-header px-4 py-3">Grado</th>
                <th className="table-header px-4 py-3">Días</th>
                <th className="table-header px-4 py-3">Presentes</th>
                <th className="table-header px-4 py-3">Ausentes</th>
                <th className="table-header px-4 py-3">Porcentaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.nombre} {r.apellido}</td>
                  <td className="px-4 py-3 text-sm">{r.grado} {r.seccion}</td>
                  <td className="px-4 py-3 text-sm">{r.total_dias}</td>
                  <td className="px-4 py-3 text-sm text-green-600">{r.presentes}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{r.ausentes}</td>
                  <td className="px-4 py-3 text-sm font-bold">{r.porcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'riesgo' ? (
        <div className="space-y-3">
          {data.length === 0 ? (
            <div className="card text-center py-12"><p className="text-gray-500">Sin alumnos en riesgo</p></div>
          ) : (
            data.map((r: any, i: number) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{r.nombre_completo || `${r.nombre} ${r.apellido}`}</h4>
                    <p className="text-sm text-gray-500">{r.codigo_alumno} - {r.grado} {r.seccion}</p>
                  </div>
                  <Badge variant={r.tipo_riesgo === 'alto' ? 'danger' : r.tipo_riesgo === 'medio' ? 'warning' : 'success'}>
                    {r.tipo_riesgo?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header px-4 py-3">Título</th>
                <th className="table-header px-4 py-3">Categoría</th>
                <th className="table-header px-4 py-3">Estado</th>
                <th className="table-header px-4 py-3">Obligatorio</th>
                <th className="table-header px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{d.titulo}</td>
                  <td className="px-4 py-3 text-sm">{d.categoria || '-'}</td>
                  <td className="px-4 py-3"><Badge variant={d.estado === 'activo' ? 'success' : 'default'}>{d.estado}</Badge></td>
                  <td className="px-4 py-3">{d.obligatorio ? <Badge variant="danger">Sí</Badge> : <Badge variant="default">No</Badge>}</td>
                  <td className="px-4 py-3 text-sm">{new Date(d.fecha_subida).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}