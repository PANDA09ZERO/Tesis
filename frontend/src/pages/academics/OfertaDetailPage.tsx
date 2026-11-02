import ResponsiveRecordTable from '../../components/ui/ResponsiveRecordTable';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarCheck, ClipboardList, GraduationCap, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { alumnosApi, configuracionApi, matriculasApi } from '../../api/endpoints';
import type { Alumno, OfertaAcademica } from '../../types';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export default function OfertaDetailPage() {
  const { ofertaId, id } = useParams<{ ofertaId?: string; id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const esAdmin = user?.rol === 'administrador';
  const [oferta, setOferta] = useState<OfertaAcademica | null>(null);
  const [ofertasCoincidentes, setOfertasCoincidentes] = useState<OfertaAcademica[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAsignar, setShowAsignar] = useState(false);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<Alumno[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [quitarMatriculaId, setQuitarMatriculaId] = useState<number | null>(null);

  const loadOferta = useCallback(async (idOferta: number) => {
    const response = await configuracionApi.getOferta(idOferta);
    setOferta(response.data.data || null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setOferta(null);
      setOfertasCoincidentes([]);
      try {
        if (ofertaId) {
          const response = await configuracionApi.getOferta(Number(ofertaId));
          if (!cancelled) setOferta(response.data.data || null);
        } else if (id) {
          const response = await configuracionApi.getOfertas({ curso_id: Number(id) });
          if (cancelled) return;
          const matches = response.data.data || [];
          if (matches.length === 1) {
            navigate(`/cursos/oferta/${matches[0].periodo_grado_curso_id}`, { replace: true });
          } else {
            setOfertasCoincidentes(matches);
          }
        }
      } catch (error: any) {
        if (!cancelled) setLoadError(error.response?.data?.message || 'No se pudo cargar la oferta académica');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, ofertaId, navigate]);

  const refreshOferta = async () => {
    if (!oferta) return;
    try {
      await loadOferta(oferta.periodo_grado_curso_id);
    } catch (error) {
      toast.error('No se pudo actualizar el roster del curso');
    }
  };

  const abrirAsignacion = async () => {
    if (!oferta) return;
    setShowAsignar(true);
    setSeleccionados([]);
    try {
      const response = await alumnosApi.getAll({ limit: 100 });
      const asignados = new Set((oferta.alumnos || []).map(alumno => alumno.alumno_id));
      setAlumnosDisponibles((response.data.data || []).filter(alumno => !asignados.has(alumno.id)));
    } catch (error) {
      toast.error('No se pudieron cargar los alumnos');
    }
  };

  const toggleAlumno = (alumnoId: number) => {
    setSeleccionados(current => current.includes(alumnoId)
      ? current.filter(idAlumno => idAlumno !== alumnoId)
      : [...current, alumnoId]);
  };

  const guardarAsignacion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!oferta || seleccionados.length === 0) {
      toast.error('Selecciona al menos un alumno');
      return;
    }
    setSaving(true);
    let asignados = 0;
    let yaExistian = 0;
    try {
      for (const alumnoId of seleccionados) {
        try {
          await matriculasApi.create({
            alumno_id: alumnoId,
            curso_id: oferta.curso_id,
            periodo_academico_id: oferta.periodo_academico_id,
            grado_id: oferta.grado_id,
            auto_cursos: false
          });
          asignados++;
        } catch (error: any) {
          if (error.response?.status === 409) yaExistian++;
          else throw error;
        }
      }
      toast.success(`${asignados} asignados${yaExistian ? `, ${yaExistian} ya estaban matriculados` : ''}`);
      setShowAsignar(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo completar la asignación');
    } finally {
      await refreshOferta();
      setSaving(false);
    }
  };

  const quitarMatricula = async () => {
    if (!quitarMatriculaId) return;
    try {
      await matriculasApi.delete(quitarMatriculaId);
      toast.success('Alumno retirado de esta oferta');
      setQuitarMatriculaId(null);
      await refreshOferta();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo quitar al alumno');
    }
  };

  if (loadError) return <div className="card text-red-600" role="alert">{loadError}<button className="btn-secondary ml-3" onClick={()=>window.location.reload()}>Reintentar</button></div>;
  if (loading) return <div className="card animate-pulse h-48" />;

  if (ofertasCoincidentes.length > 0) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/cursos')} className="flex items-center gap-2 text-sm text-primary-600"><ArrowLeft className="h-4 w-4" /> Cursos</button>
        <h2 className="text-lg font-semibold">Selecciona la oferta académica</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ofertasCoincidentes.map(item => (
            <button key={item.periodo_grado_curso_id} onClick={() => navigate(`/cursos/oferta/${item.periodo_grado_curso_id}`)} className="card text-left hover:border-primary-400">
              <span className="font-semibold">{item.curso}</span>
              <span className="mt-1 block text-sm text-gray-600">{item.nivel} · {item.grado}</span>
              <span className="mt-1 block text-xs text-gray-500">{item.periodo}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!oferta) {
    return <div className="card py-10 text-center text-gray-500">No hay una oferta académica disponible para este curso.</div>;
  }

  const alumnos = oferta.alumnos || [];
  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/cursos')} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Volver a cursos
      </button>

      <header className="card flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-xs text-gray-500">{oferta.codigo || `CUR-${oferta.curso_id}`}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{oferta.curso}</h1>
          {oferta.descripcion && <p className="mt-2 max-w-2xl text-sm text-gray-600">{oferta.descripcion}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{oferta.nivel} · {oferta.grado}</span>
            <span className="inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4" />{oferta.periodo}</span>
          </div>
        </div>
        {esAdmin && <button onClick={abrirAsignacion} className="btn-primary inline-flex items-center gap-2 self-start"><UserPlus className="h-4 w-4" /> Asignar alumnos</button>}
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Users className="h-4 w-4 text-primary-600" /> Alumnos ({alumnos.length})</h2>
          </div>
          {alumnos.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No hay alumnos activos en esta oferta.</p> : (
            <div className="mobile-scroll-hint overflow-x-auto overscroll-x-contain" role="region" aria-label="Alumnos de la oferta" tabIndex={0}>
              <ResponsiveRecordTable><table className="min-w-full divide-y divide-gray-100">
                <thead><tr><th className="table-header px-5 py-3 text-left">Alumno</th><th className="table-header px-5 py-3 text-left">Código</th><th className="table-header px-5 py-3 text-left">Estado</th><th className="table-header px-5 py-3" /></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {alumnos.map(alumno => (
                    <tr key={alumno.matricula_id}>
                      <td className="px-5 py-3 text-sm"><button onClick={() => navigate(`/alumnos/${alumno.alumno_id}?periodo_id=${oferta.periodo_academico_id}`)} className="font-medium text-primary-700 hover:underline">{alumno.apellido}, {alumno.nombre}</button></td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{alumno.codigo_alumno}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{alumno.estado_matricula}</td>
                      <td className="px-5 py-3 text-right">{esAdmin && <button onClick={() => setQuitarMatriculaId(alumno.matricula_id)} title="Quitar alumno" className="rounded p-1 text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table></ResponsiveRecordTable>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900">Acciones rápidas</h2>
            <div className="mt-3 grid gap-2">
              <button onClick={() => navigate(`/asistencias/oferta/${oferta.periodo_grado_curso_id}`)} className="btn-secondary inline-flex items-center justify-start gap-2"><CalendarCheck className="h-4 w-4" /> Consultar asistencia</button>
              <button onClick={() => navigate(`/asistencias/oferta/${oferta.periodo_grado_curso_id}?vista=historial`)} className="btn-secondary inline-flex items-center justify-start gap-2"><ClipboardList className="h-4 w-4" /> Ver asistencia</button>
              <button onClick={() => navigate(`/calificaciones/oferta/${oferta.periodo_grado_curso_id}`)} className="btn-secondary inline-flex items-center justify-start gap-2"><BookOpen className="h-4 w-4" /> Libro de calificaciones</button>
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900">Profesores</h2>{esAdmin&&<button className="btn-secondary mt-2" onClick={()=>navigate(`/admin/configuracion-academica?periodo_id=${oferta.periodo_academico_id}&grado_id=${oferta.grado_id}&curso_id=${oferta.curso_id}`)}>Gestionar docentes en Estructura</button>}
            {(oferta.profesores || []).length === 0 ? <p className="mt-3 text-sm text-gray-500">Sin profesores asignados</p> : (
              <ul className="mt-3 space-y-3">
                {oferta.profesores?.map(profesor => <li key={profesor.id} className="text-sm"><p className="font-medium text-gray-800">{profesor.nombre} {profesor.apellido}</p>{profesor.email && <p className="text-xs text-gray-500">{profesor.email}</p>}</li>)}
              </ul>
            )}
          </div>
        </aside>
      </section>

      <Modal isOpen={showAsignar} onClose={() => setShowAsignar(false)} title={`Asignar alumnos a ${oferta.curso}`} size="lg">
        <form onSubmit={guardarAsignacion} className="space-y-4">
          <p className="text-sm text-gray-600">{oferta.grado} · {oferta.periodo}. La matrícula se creará únicamente para esta oferta.</p>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
            {alumnosDisponibles.length === 0 ? <p className="py-4 text-center text-sm text-gray-500">No hay alumnos disponibles</p> : alumnosDisponibles.map(alumno => (
              <label key={alumno.id} className="flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={seleccionados.includes(alumno.id)} onChange={() => toggleAlumno(alumno.id)} />
                <span className="font-medium text-gray-800">{alumno.apellido}, {alumno.nombre}</span>
                <span className="ml-auto font-mono text-xs text-gray-500">{alumno.codigo_alumno}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowAsignar(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving || seleccionados.length === 0} className="btn-primary disabled:opacity-50">{saving ? 'Asignando…' : `Asignar ${seleccionados.length}`}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={quitarMatriculaId !== null} onClose={() => setQuitarMatriculaId(null)} onConfirm={quitarMatricula} title="Quitar alumno" message="Se eliminará la matrícula de esta oferta. ¿Deseas continuar?" />
    </div>
  );
}
