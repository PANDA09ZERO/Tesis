import ResponsiveRecordTable from '../../components/ui/ResponsiveRecordTable';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, ClipboardList, Save } from 'lucide-react';
import { asistenciasApi, configuracionApi } from '../../api/endpoints';
import type { Asistencia, OfertaAcademica } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

type AttendanceState = Asistencia['estado'];
type AttendanceMark = { estado: AttendanceState; minutos_tardanza: number; observaciones: string };
type AttendanceHistoryRow = Asistencia & { nombre: string; apellido: string; codigo_alumno: string };

function getLocalDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function clampDateToPeriod(date: string, start: string, end: string) {
  return date < start ? start : date > end ? end : date;
}

export default function OfertaAsistenciasPage() {
  const { ofertaId } = useParams<{ ofertaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [sessionError,setSessionError] = useState('');
  const [historyError,setHistoryError] = useState('');
  const [historyRetry, setHistoryRetry] = useState(0);
  const [loadingHistory,setLoadingHistory] = useState(false);
  const [loadingSession,setLoadingSession] = useState(false);
  const sessionRequest = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const esHistorial = searchParams.get('vista') === 'historial';
  const [oferta, setOferta] = useState<OfertaAcademica | null>(null);
  const soloLectura = user?.rol === 'profesor' && !oferta?.periodo_activo;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fecha, setFecha] = useState(getLocalDate());
  const [fechaInicio, setFechaInicio] = useState(getLocalDate());
  const [fechaFin, setFechaFin] = useState(getLocalDate());
  const [marcas, setMarcas] = useState<Record<number, AttendanceMark>>({});
  const [historial, setHistorial] = useState<AttendanceHistoryRow[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ofertaId) return;
    let active = true;
    setLoading(true); setLoadError(''); setOferta(null);
    configuracionApi.getOferta(Number(ofertaId))
      .then(response => {
        if (!active) return;
        const loadedOffer = response.data.data || null;
        setOferta(loadedOffer);
        if (loadedOffer?.fecha_inicio && loadedOffer.fecha_fin) {
          const inPeriod = clampDateToPeriod(getLocalDate(), loadedOffer.fecha_inicio, loadedOffer.fecha_fin);
          setFecha(inPeriod);
          setFechaInicio(inPeriod);
          setFechaFin(inPeriod);
        }
      })
      .catch((error: any) => {
        if (!active) return;
        setOferta(null);
        setLoadError(error.response?.data?.message || 'No se pudo cargar la oferta');
      })
      .finally(() => { if (active) setLoading(false); });
    return ()=>{active=false;sessionRequest.current++;};
  }, [ofertaId, reload]);

  const loadSession = useCallback(async () => {
    if (!ofertaId || !oferta || esHistorial) { setLoadingSession(false); return; }
    if (oferta.fecha_inicio && oferta.fecha_fin
      && (!fecha || fecha < oferta.fecha_inicio || fecha > oferta.fecha_fin)) {
      setMarcas({}); setSessionError('Selecciona una fecha dentro del periodo'); setLoadingSession(false); return;
    }
    const request = ++sessionRequest.current;
    setLoadingSession(true);setSessionError('');setMarcas({});
    try {
      const response = await asistenciasApi.getByOferta(Number(ofertaId), fecha);
      if (request !== sessionRequest.current) return;
      const initialMarks: Record<number, AttendanceMark> = {};
      (response.data.data?.asistencias || []).forEach(record => {
        initialMarks[record.alumno_id] = {
          estado: record.estado,
          minutos_tardanza: record.minutos_tardanza || 0,
          observaciones: record.observaciones || ''
        };
      });
      setMarcas(initialMarks);
    } catch (error: any) {
      if (request === sessionRequest.current) setSessionError(error.response?.data?.message || 'No se pudo cargar la asistencia de la fecha');
    } finally { if (request === sessionRequest.current) setLoadingSession(false); }
  }, [ofertaId, oferta, fecha, esHistorial]);

  useEffect(() => { loadSession(); return ()=>{sessionRequest.current++;}; }, [loadSession]);

  useEffect(() => {
    if (!ofertaId || !oferta || !esHistorial) { setLoadingHistory(false); return; }
    let active=true; setHistorial([]);setResumen({});setHistoryError('');
    if (fechaInicio > fechaFin || (oferta.fecha_inicio && oferta.fecha_fin && (fechaInicio < oferta.fecha_inicio || fechaFin > oferta.fecha_fin))) {
      setHistoryError('Seleccione un rango válido dentro del periodo');setLoadingHistory(false);return;
    }
    setLoadingHistory(true);
    asistenciasApi.getHistorialByOferta(Number(ofertaId),{fecha_inicio:fechaInicio,fecha_fin:fechaFin})
      .then(response=>{if(active){setHistorial(response.data.data?.asistencias || []);setResumen(response.data.data?.resumen || {});}})
      .catch((error:any)=>{if(active)setHistoryError(error.response?.data?.message || 'No se pudo cargar el historial');})
      .finally(()=>{if(active)setLoadingHistory(false);});
    return ()=>{active=false;};
  },[ofertaId,oferta,esHistorial,fechaInicio,fechaFin,historyRetry]);

  const updateMark = (alumnoId: number, update: Partial<AttendanceMark>) => {
    setMarcas(current => ({
      ...current,
      [alumnoId]: {
        estado: current[alumnoId]?.estado || 'presente',
        minutos_tardanza: current[alumnoId]?.minutos_tardanza || 0,
        observaciones: current[alumnoId]?.observaciones || '',
        ...update
      }
    }));
  };

  const marcarTodosPresentes = () => {
    const defaults: Record<number, AttendanceMark> = {};
    (oferta?.alumnos || []).forEach(alumno => {
      defaults[alumno.alumno_id] = { estado: 'presente', minutos_tardanza: 0, observaciones: '' };
    });
    setMarcas(defaults);
  };

  const guardar = async () => {
    if (!ofertaId || !oferta || soloLectura || saving || loadingSession || sessionError) return;
    const asistencias = Object.entries(marcas).filter(([id]) => (oferta.alumnos || []).some(alumno => alumno.alumno_id === Number(id))).map(([alumnoId, mark]) => ({
      alumno_id: Number(alumnoId),
      estado: mark.estado,
      minutos_tardanza: mark.estado === 'tardanza' ? mark.minutos_tardanza : 0,
      observaciones: mark.observaciones || undefined
    }));
    if (!asistencias.length) {
      toast.error('Marca al menos un estado de asistencia');
      return;
    }
    if (asistencias.some(record => record.estado === 'tardanza' && (record.minutos_tardanza < 1 || record.minutos_tardanza > 120))) {
      toast.error('La tardanza debe tener entre 1 y 120 minutos');
      return;
    }
    setSaving(true);
    try {
      await asistenciasApi.registerOfertaBulk(Number(ofertaId), fecha, asistencias);
      toast.success(`${asistencias.length} asistencias guardadas`);
      await loadSession();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron guardar las asistencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card animate-pulse h-48" />;
  if (loadError) return <div className="card text-red-600" role="alert">{loadError}<button className="btn-secondary ml-3" onClick={() => setReload(value => value + 1)}>Reintentar</button></div>;
  if (!oferta) return <div className="card py-10 text-center text-gray-500">Oferta académica no encontrada.</div>;
  const roster = oferta.alumnos || [];
  const setView = (history: boolean) => {
    if (history) setSearchParams({ vista: 'historial' });
    else setSearchParams({});
  };

  return (
    <div className="space-y-5">
      {loadingHistory && <p className="text-sm text-gray-500">Cargando historial…</p>}
      {historyError && <p className="text-red-600" role="alert">{historyError}<button className="btn-secondary ml-3" onClick={() => setHistoryRetry(value => value + 1)}>Reintentar historial</button></p>}
      {loadingSession && <p className="text-sm text-gray-500">Cargando asistencia…</p>}
      {sessionError && <p className="text-red-600" role="alert">{sessionError}<button className="btn-secondary ml-3" onClick={loadSession}>Reintentar</button></p>}
      <button onClick={() => navigate(`/cursos/oferta/${oferta.periodo_grado_curso_id}`)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> {oferta.curso} · {oferta.grado}
      </button>
      <header className="card flex flex-col gap-1">
        {soloLectura && <p className="text-sm text-amber-700">Periodo histórico: solo consulta.</p>}
        <p className="text-xs text-gray-500">{oferta.periodo} · {oferta.nivel} · {oferta.grado}</p>
        <h1 className="text-xl font-semibold text-gray-900">Asistencia: {oferta.curso}</h1>
      </header>

      <div className="flex gap-1 border-b border-gray-200">
        <button disabled={saving} onClick={() => setView(false)} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${!esHistorial ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}><CalendarCheck className="h-4 w-4" /> Registrar</button>
        <button disabled={saving} onClick={() => setView(true)} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${esHistorial ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}><ClipboardList className="h-4 w-4" /> Historial</button>
      </div>

      {!esHistorial ? (
        <section className="card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label htmlFor="attendance-date" className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
              <input id="attendance-date" type="date" disabled={saving} value={fecha} min={oferta.fecha_inicio} max={oferta.fecha_fin} onChange={event => setFecha(event.target.value)} className="input-field w-auto" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={marcarTodosPresentes} disabled={saving || soloLectura || loadingSession || !!sessionError || roster.length === 0} className="btn-secondary">Todos presentes</button>
              <button type="button" onClick={guardar} disabled={saving || soloLectura || loadingSession || !!sessionError || Object.keys(marcas).length === 0} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Guardando…' : `Guardar (${Object.keys(marcas).length})`}</button>
            </div>
          </div>
          {roster.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No hay alumnos activos en esta oferta.</p> : (
            <div className="mobile-scroll-hint overflow-x-auto overscroll-x-contain" role="region" aria-label="Registro de asistencia" tabIndex={0}>
              <ResponsiveRecordTable><table className="record-table min-w-full divide-y divide-gray-100">
                <thead><tr><th className="table-header px-4 py-3 text-left">Alumno</th><th className="table-header px-4 py-3 text-left">Estado</th><th className="table-header px-4 py-3 text-left">Minutos tarde</th><th className="table-header px-4 py-3 text-left">Observación</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {roster.map(alumno => {
                    const mark = marcas[alumno.alumno_id];
                    return <tr key={alumno.alumno_id}>
                      <td data-label="Alumno" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Alumno</span><p className="font-medium text-gray-900">{alumno.apellido}, {alumno.nombre}</p><p className="font-mono text-xs text-gray-500">{alumno.codigo_alumno}</p></td>
                      <td data-label="Estado" className="px-4 py-3"><span aria-hidden="true" className="record-label">Estado</span><select disabled={saving || soloLectura || loadingSession || !!sessionError} aria-label={`Asistencia de ${alumno.nombre} ${alumno.apellido}`} value={mark?.estado || ''} onChange={event => updateMark(alumno.alumno_id, { estado: event.target.value as AttendanceState, minutos_tardanza: event.target.value === 'tardanza' ? (mark?.minutos_tardanza || 1) : 0 })} className="input-field w-40"><option value="">Sin registrar</option><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="tardanza">Tardanza</option><option value="justificado">Justificado</option></select></td>
                      <td data-label="Minutos tarde" className="px-4 py-3"><span aria-hidden="true" className="record-label">Minutos tarde</span>{mark?.estado === 'tardanza' && <input disabled={saving || soloLectura || loadingSession || !!sessionError} type="number" min="1" max="120" value={mark.minutos_tardanza || 1} onChange={event => updateMark(alumno.alumno_id, { minutos_tardanza: Number(event.target.value) })} className="input-field w-24" aria-label={`Minutos tarde de ${alumno.nombre}`} />}</td>
                      <td data-label="Observación" className="px-4 py-3"><span aria-hidden="true" className="record-label">Observación</span><input disabled={saving || soloLectura || loadingSession || !!sessionError} value={mark?.observaciones || ''} onChange={event => updateMark(alumno.alumno_id, { observaciones: event.target.value })} className="input-field min-w-48" aria-label={`Observación de ${alumno.nombre}`} /></td>
                    </tr>;
                  })}
                </tbody>
              </table></ResponsiveRecordTable>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">Desde<input type="date" value={fechaInicio} min={oferta.fecha_inicio} max={oferta.fecha_fin} onChange={event => setFechaInicio(event.target.value)} className="input-field mt-1 block w-auto" /></label>
            <label className="text-sm text-gray-700">Hasta<input type="date" value={fechaFin} min={oferta.fecha_inicio} max={oferta.fecha_fin} onChange={event => setFechaFin(event.target.value)} className="input-field mt-1 block w-auto" /></label>
            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              {(['presente', 'ausente', 'tardanza', 'justificado'] as const).map(state => <span key={state} className="rounded bg-gray-100 px-2 py-1 capitalize">{state}: {resumen[state] || 0}</span>)}
            </div>
          </div>
          <div className="mobile-scroll-hint card overflow-x-auto overscroll-x-contain p-0" role="region" aria-label="Historial de asistencia" tabIndex={0}>
            {historial.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">Sin asistencias en el rango seleccionado.</p> : (
              <ResponsiveRecordTable><table className="record-table min-w-full divide-y divide-gray-100">
                <thead><tr><th className="table-header px-4 py-3 text-left">Fecha</th><th className="table-header px-4 py-3 text-left">Alumno</th><th className="table-header px-4 py-3 text-left">Estado</th><th className="table-header px-4 py-3 text-left">Minutos tarde</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{historial.map(record => <tr key={record.id}><td data-label="Fecha" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Fecha</span>{record.fecha}</td><td data-label="Alumno" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Alumno</span>{record.apellido}, {record.nombre}</td><td data-label="Estado" className="px-4 py-3 text-sm capitalize"><span aria-hidden="true" className="record-label">Estado</span>{record.estado}</td><td data-label="Minutos tarde" className="px-4 py-3 text-sm"><span aria-hidden="true" className="record-label">Minutos tarde</span>{record.estado === 'tardanza' ? record.minutos_tardanza : '-'}</td></tr>)}</tbody>
              </table></ResponsiveRecordTable>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
