import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, BarChart3, ClipboardCheck } from 'lucide-react';
import { calificacionesApi, cursosApi } from '../../api/endpoints';
import type { Calificacion, Curso } from '../../types';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface CursoConNota extends Curso {
  promedio: number | null;
  evaluaciones: Calificacion[];
}

export default function CalificacionesPage() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<CursoConNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!user) return;
      const alumnoId = user.id;
      const [cursosRes, califsRes] = await Promise.all([
        cursosApi.getAll({ limit: 100 }),
        calificacionesApi.getByAlumno(alumnoId)
      ]);

      const cursosList = (cursosRes.data.data || []) as Curso[];
      const calificaciones = califsRes.data.data?.calificaciones || [];

      const cursosConNota = cursosList.map((curso) => {
        const cursoCalifs = calificaciones.filter(c => c.curso_id === curso.id);
        const promedio = cursoCalifs.length > 0
          ? parseFloat((cursoCalifs.reduce((sum: number, c: Calificacion) => sum + c.nota, 0) / cursoCalifs.length).toFixed(1))
          : null;
        return { ...curso, promedio, evaluaciones: cursoCalifs };
      });

      setCursos(cursosConNota);
    } catch (error) {
      toast.error('Error al cargar calificaciones');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Calificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Seguimiento académico</p>
      </div>

      {cursos.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tienes cursos asignados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cursos.map((curso) => (
            <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {curso.codigo || '-'}
                      </span>
                      <h3 className="font-bold text-gray-900 uppercase text-sm">{curso.nombre}</h3>
                    </div>
                    <span className="text-xs text-gray-500">{curso.grado_nombre || 'Sin grado asignado'}</span>
                  </div>
                  {/* Promedio */}
                  <div className="flex-shrink-0 ml-4">
                    {curso.promedio !== null ? (
                      <div className="text-right">
                        <span className={`text-2xl font-bold px-3 py-1 rounded-full ${
                          curso.promedio >= 11
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {curso.promedio}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Promedio</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-300">--</span>
                        <p className="text-xs text-gray-400 mt-1">Sin nota</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trabajos Recientes */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Trabajos Recientes</span>
                </div>
                {curso.evaluaciones.length > 0 ? (
                  <div className="space-y-2">
                    {curso.evaluaciones.slice(-3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.tipo_evaluacion === 'parcial' ? 'Parcial' : item.tipo_evaluacion === 'final' ? 'Final' : 'Práctica'}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {item.fecha_evaluacion ? new Date(item.fecha_evaluacion).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${item.nota >= 11 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.nota}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Su trabajo calificado recientemente aparecerá aquí</p>
                )}
              </div>

              {/* Enlace a Detalle */}
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => setExpandedCourse(expandedCourse === curso.id ? null : curso.id)}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {expandedCourse === curso.id ? (
                    <>
                      <ChevronUp className="w-4 h-4" /> Ocultar desglose
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" /> Ver todos los trabajos ({curso.evaluaciones.length})
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Desglose Completo */}
                {expandedCourse === curso.id && (
                  <div className="mt-3 space-y-2">
                    {curso.evaluaciones.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">Sin evaluaciones registradas</p>
                    ) : (
                      curso.evaluaciones.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              item.nota >= 11 ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {item.tipo_evaluacion}
                              </span>
                              <span className="text-xs text-gray-400 ml-2">
                                {item.fecha_evaluacion ? new Date(item.fecha_evaluacion).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${item.nota >= 11 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.nota}
                            </span>
                            {item.observaciones && (
                              <span className="text-xs text-gray-400 italic max-w-xs truncate">
                                {item.observaciones}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
