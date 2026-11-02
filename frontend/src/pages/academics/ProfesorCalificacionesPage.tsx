import ResponsiveRecordTable from '../../components/ui/ResponsiveRecordTable';
import React, { useEffect, useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { calificacionesApi, cursosApi, periodosApi } from '../../api/endpoints';
import type { Curso, PeriodoAcademico } from '../../types';
import toast from 'react-hot-toast';

interface AlumnoCurso {
  alumno_id: number;
  codigo_alumno: string;
  nombre: string;
  apellido: string;
  grado?: string;
}

export default function ProfesorCalificacionesPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoCurso[]>([]);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [cursoId, setCursoId] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [tipoEvaluacion, setTipoEvaluacion] = useState('practica');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([cursosApi.getAll({ limit: 100 }), periodosApi.getAll()])
      .then(([coursesResponse, periodsResponse]) => {
        const availableCourses = coursesResponse.data.data || [];
        const availablePeriods = periodsResponse.data.data || [];
        setCursos(availableCourses);
        setPeriodos(availablePeriods);
        if (availableCourses.length) setCursoId(String(availableCourses[0].id));
        const activePeriod = availablePeriods.find(period => period.activo) || availablePeriods[0];
        if (activePeriod) setPeriodoId(String(activePeriod.id));
      })
      .catch(() => toast.error('No se pudieron cargar cursos y periodos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!cursoId) {
      setAlumnos([]);
      return;
    }

    setLoading(true);
    calificacionesApi.getAlumnosByCurso(Number(cursoId))
      .then(response => setAlumnos(response.data.data || []))
      .catch(() => {
        setAlumnos([]);
        toast.error('No se pudieron cargar los alumnos del curso');
      })
      .finally(() => setLoading(false));
  }, [cursoId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cursoId || !periodoId) {
      toast.error('Seleccione curso y periodo');
      return;
    }

    const grades = alumnos
      .filter(alumno => notas[alumno.alumno_id] !== undefined && notas[alumno.alumno_id] !== '')
      .map(alumno => ({
        alumno_id: alumno.alumno_id,
        curso_id: Number(cursoId),
        periodo_academico_id: Number(periodoId),
        nota: Number(notas[alumno.alumno_id]),
        tipo_evaluacion: tipoEvaluacion,
        fecha_evaluacion: fechaEvaluacion
      }));

    if (!grades.length) {
      toast.error('Ingrese al menos una nota');
      return;
    }
    if (grades.some(grade => !Number.isFinite(grade.nota) || grade.nota < 0 || grade.nota > 20)) {
      toast.error('Las notas deben estar entre 0 y 20');
      return;
    }

    setSaving(true);
    try {
      await calificacionesApi.bulkRegister(grades);
      toast.success(`Se guardaron ${grades.length} notas`);
      setNotas({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron guardar las notas');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !cursos.length) return <div className="card animate-pulse h-40" />;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Curso</label>
          <select value={cursoId} onChange={event => setCursoId(event.target.value)} className="input-field" required>
            <option value="">Seleccionar curso</option>
            {cursos.map(course => <option key={course.id} value={course.id}>{course.nombre} · {course.grado_nombre || 'Sin grado'}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Periodo</label>
          <select value={periodoId} onChange={event => setPeriodoId(event.target.value)} className="input-field" required>
            <option value="">Seleccionar periodo</option>
            {periodos.map(period => <option key={period.id} value={period.id}>{period.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Evaluación</label>
          <select value={tipoEvaluacion} onChange={event => setTipoEvaluacion(event.target.value)} className="input-field">
            <option value="practica">Práctica</option>
            <option value="parcial">Parcial</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
          <input type="date" value={fechaEvaluacion} onChange={event => setFechaEvaluacion(event.target.value)} className="input-field" required />
        </div>
      </div>

      {!cursos.length ? (
        <div className="card py-10 text-center text-gray-500">No tienes cursos asignados.</div>
      ) : loading ? (
        <div className="card animate-pulse h-40" />
      ) : alumnos.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-gray-500">
          <BookOpen className="h-8 w-8 text-gray-300" />
          No hay alumnos matriculados en el grado de este curso.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="mobile-scroll-hint overflow-x-auto overscroll-x-contain" role="region" aria-label="Libro de calificaciones" tabIndex={0}>
            <ResponsiveRecordTable><table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header px-4 py-3 text-left">Alumno</th>
                  <th className="table-header px-4 py-3 text-left">Código</th>
                  <th className="table-header w-40 px-4 py-3 text-left">Nota / 20</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnos.map(alumno => (
                  <tr key={alumno.alumno_id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{alumno.apellido}, {alumno.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{alumno.codigo_alumno}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.01"
                        value={notas[alumno.alumno_id] || ''}
                        onChange={event => setNotas(current => ({ ...current, [alumno.alumno_id]: event.target.value }))}
                        className="input-field w-28"
                        aria-label={`Nota de ${alumno.nombre} ${alumno.apellido}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></ResponsiveRecordTable>
          </div>
          <div className="flex justify-end border-t border-gray-100 p-4">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar notas'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}