import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { calificacionesApi, cursosApi } from '../../api/endpoints';
import type { Curso } from '../../types';
import toast from 'react-hot-toast';
import { usePeriodo } from '../../context/PeriodoContext';

interface AlumnoCurso {
  alumno_id: number;
  codigo_alumno: string;
  nombre: string;
  apellido: string;
  grado?: string;
}

export default function ProfesorCalificacionesPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const { periodoId, periodos } = usePeriodo();
  const [alumnos, setAlumnos] = useState<AlumnoCurso[]>([]);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [cursoId, setCursoId] = useState('');
  const [tipoEvaluacion, setTipoEvaluacion] = useState('practica');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cursosApi.getAll({ limit: 100 })
      .then(coursesResponse => {
        const availableCourses = coursesResponse.data.data || [];
        setCursos(availableCourses);
        if (availableCourses.length) setCursoId(String(availableCourses[0].id));
      })
      .catch(() => toast.error('No se pudieron cargar los cursos'))
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
      toast.error('Seleccione curso y periodo académico');
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

  const periodoActualNombre = periodos.find(p => String(p.id) === periodoId)?.nombre || 'Seleccionado en cabecera';

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
          <label className="mb-1 block text-sm font-medium text-gray-700">Periodo académico</label>
          <input className="input-field bg-gray-50 cursor-not-allowed" value={periodoActualNombre} readOnly disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Evaluación</label>
          <select value={tipoEvaluacion} onChange={event => setTipoEvaluacion(event.target.value)} className="input-field">
            <option value="practica">Práctica</option>
            <option value="parcial">Parcial</option>
            <option value="final">Final</option>
            <option value="tarea">Tarea</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
          <input type="date" value={fechaEvaluacion} onChange={event => setFechaEvaluacion(event.target.value)} className="input-field" required />
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Registro rápido de notas</h3>
          <button type="submit" disabled={saving || !alumnos.length} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar notas'}
          </button>
        </div>

        {!alumnos.length ? (
          <p className="py-6 text-center text-sm text-gray-500">No hay alumnos inscritos en el curso seleccionado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {alumnos.map(alumno => (
              <div key={alumno.alumno_id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900">{alumno.apellido}, {alumno.nombre}</p>
                  <p className="text-xs text-gray-500">{alumno.codigo_alumno} {alumno.grado ? `· ${alumno.grado}` : ''}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  placeholder="Nota (0-20)"
                  className="input-field w-32 text-right"
                  value={notas[alumno.alumno_id] ?? ''}
                  onChange={e => setNotas({ ...notas, [alumno.alumno_id]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
