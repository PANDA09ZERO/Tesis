import React, { useEffect, useState } from 'react';
import { Brain, Play, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { aiApi, alumnosApi } from '../../api/endpoints';
import type { RiesgoAcademico, Alumno } from '../../types';
import toast from 'react-hot-toast';

export default function IAPrediccionPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<number | null>(null);
  const [resultado, setResultado] = useState<RiesgoAcademico | null>(null);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  useEffect(() => {
    alumnosApi.getAll({ limit: 200 }).then(res => setAlumnos(res.data.data || []));
  }, []);

  const predictAlumno = async () => {
    if (!selectedAlumno) { toast.error('Seleccione un alumno'); return; }
    setLoading(true);
    try {
      const res = await aiApi.predictAlumno(selectedAlumno);
      setResultado(res.data.data!);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error en predicción'); }
    finally { setLoading(false); }
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    try {
      const res = await aiApi.analyzeAll();
      setBatchResults(res.data.data);
      toast.success('Análisis completado');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
    finally { setAnalyzingAll(false); }
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const res = await aiApi.trainModel();
      toast.success(`Modelo entrenado. Accuracy: ${(res.data.data?.accuracy * 100).toFixed(1)}%`);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const getRiesgoBadge = (tipo: string) => {
    switch (tipo) {
      case 'alto': return 'danger';
      case 'medio': return 'warning';
      default: return 'success';
    }
  };

  const getTrendIcon = (tendencia: string) => {
    if (tendencia === 'deterioro') return <TrendingDown className="w-4 h-4 text-red-500" />;
    if (tendencia === 'mejora') return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg"><Brain className="w-6 h-6 text-purple-600" /></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Motor de Predicción de Riesgo Académico</h2>
            <p className="text-sm text-gray-500">Análisis inteligente basado en calificaciones, asistencia y tendencias</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <select value={selectedAlumno || ''} onChange={e => setSelectedAlumno(parseInt(e.target.value) || null)} className="input-field flex-1">
              <option value="">Seleccionar alumno para análisis individual...</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.codigo_alumno})</option>)}
            </select>
            <button onClick={predictAlumno} disabled={loading || !selectedAlumno} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> Analizar
            </button>
          </div>
          <button onClick={analyzeAll} disabled={analyzingAll} className="btn-secondary flex items-center gap-2">
            {analyzingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analizar Todos
          </button>
          <button onClick={trainModel} disabled={loading} className="btn-secondary flex items-center gap-2">
            Entrenar Modelo
          </button>
        </div>
      </div>

      {resultado && (
        <div className={`card border-l-4 ${resultado.tipo_riesgo === 'alto' ? 'border-red-500' : resultado.tipo_riesgo === 'medio' ? 'border-yellow-500' : 'border-green-500'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{resultado.nombre_completo}</h3>
              <p className="text-sm text-gray-500">{resultado.codigo_alumno} - {resultado.grado} {resultado.seccion}</p>
            </div>
            <div className="text-right">
              <Badge variant={getRiesgoBadge(resultado.tipo_riesgo)} className="text-sm px-3 py-1">
                RIESGO {resultado.tipo_riesgo?.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-500 mt-1">Nivel: {resultado.nivel_riesgo}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-600">{resultado.promedio_general}</p>
              <p className="text-xs text-gray-500">Promedio General</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{resultado.porcentaje_ausencias}%</p>
              <p className="text-xs text-gray-500">Inasistencias</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{resultado.cursos_desaprobados}</p>
              <p className="text-xs text-gray-500">Cursos Desaprobados</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex items-center justify-center gap-1">
              {getTrendIcon(resultado.tendencia)}
              <span className="text-sm font-medium capitalize">{resultado.tendencia}</span>
            </div>
          </div>

          {resultado.indicadores && resultado.indicadores.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Indicadores Detectados:</h4>
              <ul className="space-y-1">
                {resultado.indicadores.map((ind, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.recomendacion && (
            <div className="p-3 bg-blue-50 rounded-lg mt-3">
              <p className="text-sm text-blue-800"><strong>Recomendación:</strong> {resultado.recomendacion}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Método: {resultado.metodo === 'machine_learning' ? 'Machine Learning (Gradient Boosting)' : 'Análisis por Reglas'}</p>
        </div>
      )}

      {batchResults && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados del Análisis Masivo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Analizados" value={batchResults.estadisticas.total_analizados} icon={Brain} color="blue" />
            <StatCard title="Alto Riesgo" value={batchResults.estadisticas.alto_riesgo} icon={AlertTriangle} color="red" />
            <StatCard title="Medio Riesgo" value={batchResults.estadisticas.medio_riesgo} icon={AlertTriangle} color="yellow" />
            <StatCard title="Bajo Riesgo" value={batchResults.estadisticas.bajo_riesgo} icon={Brain} color="green" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header px-4 py-3">Alumno</th>
                  <th className="table-header px-4 py-3">Grado</th>
                  <th className="table-header px-4 py-3">Riesgo</th>
                  <th className="table-header px-4 py-3">Promedio</th>
                  <th className="table-header px-4 py-3">Inasistencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batchResults.estudiantes?.filter((e: any) => !e.error).map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{r.nombre_completo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.grado} {r.seccion}</td>
                    <td className="px-4 py-3"><Badge variant={getRiesgoBadge(r.tipo_riesgo)}>{r.tipo_riesgo?.toUpperCase()}</Badge></td>
                    <td className="px-4 py-3 text-sm">{r.promedio_general}</td>
                    <td className="px-4 py-3 text-sm">{r.porcentaje_ausencias}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}