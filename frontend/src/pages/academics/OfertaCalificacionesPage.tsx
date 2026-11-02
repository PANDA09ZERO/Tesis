import ResponsiveRecordTable from '../../components/ui/ResponsiveRecordTable';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { calificacionesApi, configuracionApi, evaluacionesApi } from '../../api/endpoints';
import type { Calificacion, EvaluacionAcademica, OfertaAcademica } from '../../types';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function getLocalDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function clampDateToPeriod(date: string, start: string, end: string) {
  return date < start ? start : date > end ? end : date;
}

function displayDate(date?: string) {
  return date ? date.split('-').reverse().join('/') : 'Sin definir';
}

export default function OfertaCalificacionesPage() {
  const { ofertaId } = useParams<{ ofertaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const submitting = useRef(false);
  const loadRequest = useRef(0);
  const [oferta, setOferta] = useState<OfertaAcademica | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionAcademica[]>([]);
  const [calificaciones, setCalificaciones] = useState<Array<Calificacion & { evaluacion_id: number | null; evaluacion_nombre?: string; nombre: string; apellido: string; codigo_alumno: string }>>([]);
  const [evaluacionId, setEvaluacionId] = useState('');
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipo: 'practica', fecha_evaluacion: getLocalDate(), nota_maxima: '20' });

  const loadLibro = useCallback(async () => {
    if (!ofertaId) return;
    const request = ++loadRequest.current;
    const responses = await Promise.all([
      configuracionApi.getOferta(Number(ofertaId)),
      calificacionesApi.getLibroOferta(Number(ofertaId)),
      evaluacionesApi.getByOferta(Number(ofertaId))
    ]).catch(error=>{if(request === loadRequest.current)throw error;return null;});
    if (!responses || request !== loadRequest.current) return;
    const [offerResponse,bookResponse,evaluationResponse] = responses;
    const loadedOffer = offerResponse.data.data || null;
    setOferta(loadedOffer);
    if (loadedOffer?.fecha_inicio && loadedOffer.fecha_fin) {
      setForm(current => ({
        ...current,
        fecha_evaluacion: clampDateToPeriod(current.fecha_evaluacion, loadedOffer.fecha_inicio!, loadedOffer.fecha_fin!)
      }));
    }
    const book = bookResponse.data.data;
    setCalificaciones(book?.calificaciones || []);
    const list = evaluationResponse.data.data || book?.evaluaciones || [];
    setEvaluaciones(list);
    setEvaluacionId(current => current && list.some(item => String(item.id) === current)
      ? current
      : (list[0] ? String(list[0].id) : ''));
  }, [ofertaId]);

  useEffect(() => {
    let active=true;setLoading(true);setLoadError('');setOferta(null);setCalificaciones([]);
    loadLibro()
      .catch((error: any) => {if(active)setLoadError(error.response?.data?.message || 'No se pudo cargar el libro de calificaciones');})
      .finally(() => {if(active)setLoading(false);});
    return ()=>{active=false;loadRequest.current++;};
  }, [loadLibro, reload]);

  const soloLectura = user?.rol === 'profesor' && !oferta?.periodo_activo;
  const evaluacionActual = evaluaciones.find(item => String(item.id) === evaluacionId);
  useEffect(() => {
    if (!evaluacionActual) {
      setNotas({});
      return;
    }
    const currentNotes: Record<number, string> = {};
    calificaciones.filter(item => item.evaluacion_id === evaluacionActual.id)
      .forEach(item => { currentNotes[item.alumno_id] = String(item.nota); });
    setNotas(currentNotes);
  }, [evaluacionActual, calificaciones]);

  const guardarEvaluacion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!oferta || !evaluacionActual || soloLectura || saving || submitting.current || evaluacionActual.estado !== 'activa') return;
    const grades = Object.entries(notas)
      .filter(([id, value]) => value.trim() !== '' && (oferta.alumnos || []).some(alumno => alumno.alumno_id === Number(id)))
      .map(([alumnoId, value]) => ({ alumno_id: Number(alumnoId), nota: Number(value) }));
    if (!grades.length) {
      toast.error('Ingresa al menos una calificación');
      return;
    }
    if (grades.some(item => !Number.isFinite(item.nota) || item.nota < 0 || item.nota > evaluacionActual.nota_maxima || item.nota > 20)) {
      toast.error(`Las notas deben estar entre 0 y ${evaluacionActual.nota_maxima}`);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await calificacionesApi.registerOfertaBulk(oferta.periodo_grado_curso_id, evaluacionActual.id, grades);
      toast.success(`${grades.length} calificaciones guardadas`);
      await loadLibro().catch((error: any) => setLoadError(error.response?.data?.message || 'Las notas se guardaron, pero no se pudo actualizar el libro'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron guardar las calificaciones');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const crearEvaluacion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!oferta || soloLectura || saving || submitting.current) return;
    const maximum = Number(form.nota_maxima);
    if (!form.nombre.trim() || !form.fecha_evaluacion || !Number.isFinite(maximum) || maximum <= 0 || maximum > 20
      || form.fecha_evaluacion < oferta.fecha_inicio! || form.fecha_evaluacion > oferta.fecha_fin!) {
      toast.error('Revisa el nombre, la fecha y la nota máxima de la evaluación');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const response = await evaluacionesApi.create(oferta.periodo_grado_curso_id, {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        fecha_evaluacion: form.fecha_evaluacion,
        nota_maxima: Number(form.nota_maxima)
      });
      const newId = response.data.data?.id;
      if (newId) setEvaluacionId(String(newId));
      setShowCreate(false);
      setForm({ nombre: '', tipo: 'practica', fecha_evaluacion: clampDateToPeriod(getLocalDate(), oferta.fecha_inicio!, oferta.fecha_fin!), nota_maxima: '20' });
      toast.success('Evaluación creada');
      await loadLibro().catch((error: any) => setLoadError(error.response?.data?.message || 'La evaluación se creó, pero no se pudo actualizar el libro'));
      if (newId) setEvaluacionId(String(newId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo crear la evaluación');
    } finally { submitting.current = false; setSaving(false); }
  };

  if (loading) return <div className="card animate-pulse h-48" />;
  if (loadError) return <div className="card text-red-600" role="alert">{loadError}<button className="btn-secondary ml-3" onClick={() => setReload(value => value + 1)}>Reintentar</button></div>;
  if (!oferta) return <div className="card py-10 text-center text-gray-500">Oferta académica no encontrada.</div>;

  const periodRange = `${displayDate(oferta.fecha_inicio)} al ${displayDate(oferta.fecha_fin)}`;
  const today = getLocalDate();
  const todayOutsidePeriod = Boolean(oferta.fecha_inicio && oferta.fecha_fin && (today < oferta.fecha_inicio || today > oferta.fecha_fin));
  const legacyGrades = calificaciones.filter(item => item.evaluacion_id === null);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(`/cursos/oferta/${oferta.periodo_grado_curso_id}`)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"><ArrowLeft className="h-4 w-4" /> {oferta.curso} · {oferta.grado}</button>
      <header className="card">
        {soloLectura && <p className="text-sm text-amber-700">Periodo histórico: solo consulta.</p>}
        <p className="text-xs text-gray-500">{oferta.periodo} · {oferta.nivel} · {oferta.grado}</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Libro de calificaciones: {oferta.curso}</h1>
        <p className="mt-2 text-sm text-gray-600">Fechas del periodo: {periodRange}.</p>
      </header>

      {todayOutsidePeriod && <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900" role="alert">
        Hoy ({displayDate(today)}) está fuera de las fechas del periodo {oferta.periodo}: {periodRange}. Las evaluaciones de este libro deben pertenecer a ese rango.
        {user?.rol === 'administrador'
          ? <p className="mt-2">Si el calendario institucional cambió, <Link to="/periodos" className="font-medium underline">revisar fechas en Periodos académicos</Link>. Si la evaluación corresponde a otro periodo, abre su libro.</p>
          : <p className="mt-2">Solicita a administración que revise el calendario o la asignación al periodo correcto.</p>}
      </div>}
      <p className="text-sm text-gray-500">El promedio mostrado es una media simple de las notas registradas en la misma escala; no define la nota final ni una ponderación.</p>
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label htmlFor="evaluation-select" className="mb-1 block text-sm font-medium text-gray-700">Evaluación</label>
          <select id="evaluation-select" value={evaluacionId} onChange={event => setEvaluacionId(event.target.value)} className="input-field" disabled={saving || !evaluaciones.length}>
            {!evaluaciones.length && <option value="">No hay evaluaciones</option>}
            {evaluaciones.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.fecha_evaluacion} · máx. {item.nota_maxima}</option>)}
          </select>
        </div>
        <button disabled={soloLectura || saving} onClick={() => setShowCreate(true)} className="btn-secondary inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Nueva evaluación</button>
      </div>

      {!evaluaciones.length ? <div className="card py-8 text-center text-sm text-gray-500">Todavía no hay evaluaciones para esta oferta.</div> : (
        <div className="card overflow-hidden p-0">
          {!evaluacionActual ? <p className="p-6 text-sm text-gray-500">Selecciona una evaluación.</p> : (
            <form onSubmit={guardarEvaluacion}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div><h2 className="font-semibold text-gray-900">{evaluacionActual.nombre}</h2><p className="text-xs text-gray-500">{evaluacionActual.tipo} · {evaluacionActual.fecha_evaluacion} · escala 0–{evaluacionActual.nota_maxima}</p></div>
                <button type="submit" disabled={soloLectura || saving || evaluacionActual.estado !== 'activa'} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar notas'}</button>
              </div>
              <div className="mobile-scroll-hint overflow-x-auto overscroll-x-contain" role="region" aria-label="Calificaciones" tabIndex={0}>
                <ResponsiveRecordTable><table className="record-table min-w-full divide-y divide-gray-100">
                  <thead><tr><th className="table-header px-4 py-3 text-left">Alumno</th><th className="table-header px-4 py-3 text-left">Código</th><th className="table-header px-4 py-3 text-left">Nota</th><th className="table-header px-4 py-3 text-left">Promedio en la misma escala</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {(oferta.alumnos || []).map(alumno => {
                      const saved = calificaciones.filter(item => item.alumno_id === alumno.alumno_id && evaluaciones.some(evaluation => evaluation.id === item.evaluacion_id && Number(evaluation.nota_maxima) === Number(evaluacionActual.nota_maxima)));
                      const average = saved.length ? saved.reduce((total, item) => total + Number(item.nota), 0) / saved.length : null;
                      return <tr key={alumno.alumno_id}>
                        <td data-label="Alumno" className="px-4 py-3 text-sm font-medium text-gray-900"><span aria-hidden="true" className="record-label">Alumno</span>{alumno.apellido}, {alumno.nombre}</td>
                        <td data-label="Código" className="px-4 py-3 font-mono text-xs text-gray-600"><span aria-hidden="true" className="record-label">Código</span>{alumno.codigo_alumno}</td>
                        <td data-label="Nota" className="px-4 py-2"><span aria-hidden="true" className="record-label">Nota</span><input type="number" min="0" max={evaluacionActual.nota_maxima} step="0.01" value={notas[alumno.alumno_id] || ''} onChange={event => setNotas(current => ({ ...current, [alumno.alumno_id]: event.target.value }))} className="input-field w-28" aria-label={`Nota de ${alumno.nombre} ${alumno.apellido}`} disabled={saving || soloLectura || evaluacionActual.estado !== 'activa'} /></td>
                        <td data-label="Promedio en la misma escala" className="px-4 py-3 text-sm text-gray-600"><span aria-hidden="true" className="record-label">Promedio en la misma escala</span>{average === null ? 'Sin nota' : `${average.toFixed(2)} / ${evaluacionActual.nota_maxima}`}</td>
                      </tr>;
                    })}
                  </tbody>
                </table></ResponsiveRecordTable>
              </div>
            </form>
          )}
        </div>
      )}

      {legacyGrades.length > 0 && <section className="card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-5 py-4"><h2 className="font-semibold text-gray-900">Notas históricas sin evaluación vinculada</h2><p className="mt-1 text-xs text-gray-500">Se conservan como registros heredados y no se convierten en evaluaciones nuevas.</p></div>
        <div className="mobile-scroll-hint overflow-x-auto overscroll-x-contain" role="region" aria-label="Historial de calificaciones" tabIndex={0}><ResponsiveRecordTable><table className="record-table min-w-full divide-y divide-gray-100"><thead><tr><th className="table-header px-4 py-3 text-left">Alumno</th><th className="table-header px-4 py-3 text-left">Tipo</th><th className="table-header px-4 py-3 text-left">Fecha</th><th className="table-header px-4 py-3 text-left">Nota</th></tr></thead><tbody className="divide-y divide-gray-100">{legacyGrades.map(item => <tr key={item.id}><td data-label="Alumno" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Alumno</span>{item.apellido}, {item.nombre} <span className="font-mono text-xs text-gray-500">({item.codigo_alumno})</span></td><td data-label="Tipo" className="px-4 py-3 text-sm capitalize"><span aria-hidden="true" className="record-label">Tipo</span>{item.tipo_evaluacion || 'general'}</td><td data-label="Fecha" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Fecha</span>{item.fecha_evaluacion || '-'}</td><td data-label="Nota" className="px-4 py-3 text-sm font-semibold"><span aria-hidden="true" className="record-label">Nota</span>{item.nota}</td></tr>)}</tbody></table></ResponsiveRecordTable></div>
      </section>}

      <Modal isOpen={showCreate} onClose={() => { if (!saving) setShowCreate(false); }} title="Nueva evaluación" size="md">
        <form onSubmit={crearEvaluacion} className="space-y-4">
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Periodo {oferta.periodo}: {periodRange}. Para una evaluación fuera de este rango, revisa el periodo académico correspondiente.</p>
          <label className="block text-sm font-medium text-gray-700">Nombre<input value={form.nombre} onChange={event => setForm(current => ({ ...current, nombre: event.target.value }))} className="input-field mt-1" maxLength={150} required /></label>
          <label className="block text-sm font-medium text-gray-700">Tipo<select value={form.tipo} onChange={event => setForm(current => ({ ...current, tipo: event.target.value }))} className="input-field mt-1"><option value="practica">Práctica</option><option value="parcial">Parcial</option><option value="final">Final</option><option value="tarea">Tarea</option></select></label>
          <label className="block text-sm font-medium text-gray-700">Fecha<input aria-describedby="evaluation-date-range" type="date" value={form.fecha_evaluacion} min={oferta.fecha_inicio} max={oferta.fecha_fin} onChange={event => setForm(current => ({ ...current, fecha_evaluacion: event.target.value }))} className="input-field mt-1" required /></label>
          <p id="evaluation-date-range" className="text-xs text-gray-600">Fecha permitida: {periodRange}.</p>
          <label className="block text-sm font-medium text-gray-700">Nota máxima<input type="number" min="0.01" max="20" step="0.01" value={form.nota_maxima} onChange={event => setForm(current => ({ ...current, nota_maxima: event.target.value }))} className="input-field mt-1" required /></label>
          <div className="form-actions"><button type="button" disabled={saving} onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button><button type="submit" disabled={saving || soloLectura} className="btn-primary">{saving ? 'Creando…' : 'Crear evaluación'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
