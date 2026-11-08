import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Pencil, Plus, RotateCcw, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeading from '../../components/ui/PageHeading';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import { alumnosApi, incidenciasApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Incidencia, IncidenciasEstadisticas } from '../../types';
import { estadoVariant, estadosIncidencia, fechaIncidencia, gravedadVariant, gravedades, tiposIncidencia } from './incidencias';

const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
const vacio = () => ({ alumno_id: '', fecha: hoy(), hora: '', tipo: 'derivacion_direccion', gravedad: 'leve', lugar: '', descripcion: '', medida_tomada: '', apoderado_notificado: false });
const mensaje = (e: any, fallback: string) => e.response?.data?.message || fallback;

export default function IncidenciasPage() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'administrador';
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Incidencia[]>([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState<IncidenciasEstadisticas | null>(null);
  const [filtros, setFiltros] = useState({ estado: '', tipo: '', gravedad: '' });
  const [search, setSearch] = useState(''); const debounced = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const seq = useRef(0);

  const [modal, setModal] = useState(false), [editando, setEditando] = useState<Incidencia | null>(null);
  const [form, setForm] = useState(vacio()), [formError, setFormError] = useState(''), [saving, setSaving] = useState(false);
  const [alumnoLabel, setAlumnoLabel] = useState(''), [busquedaAlumno, setBusquedaAlumno] = useState(''), [opciones, setOpciones] = useState<any[]>([]);
  const debouncedAlumno = useDebounce(busquedaAlumno);
  const [cerrando, setCerrando] = useState<Incidencia | null>(null), [resolucion, setResolucion] = useState(''), [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => { void cargar(); }, [page, filtros, debounced]);
  useEffect(() => { void cargarStats(); }, []);
  // Acceso directo desde el detalle del alumno: /incidencias?registrar=ID&nombre=...
  useEffect(() => {
    const id = params.get('registrar');
    if (id && /^\d+$/.test(id)) { abrirNueva(); setForm(f => ({ ...f, alumno_id: id })); setAlumnoLabel(params.get('nombre') || 'Alumno seleccionado'); setParams({}, { replace: true }); }
  }, []);
  useEffect(() => {
    if (!modal || editando || debouncedAlumno.trim().length < 2) { setOpciones([]); return; }
    let active = true;
    alumnosApi.getAll({ search: debouncedAlumno.trim(), limit: 8 }).then(r => { if (active) setOpciones(r.data.data || []); }).catch(() => { if (active) setOpciones([]); });
    return () => { active = false; };
  }, [debouncedAlumno, modal, editando]);

  async function cargar() {
    const id = ++seq.current; setLoading(true); setLoadError('');
    try {
      const query: any = { page, limit: 15, search: debounced || undefined };
      for (const [k, v] of Object.entries(filtros)) if (v) query[k] = v;
      const r = await incidenciasApi.getAll(query);
      if (id !== seq.current) return;
      setItems(r.data.data || []); updateFromResponse(r.data.total || 0, r.data.totalPages || 1);
    } catch (e) { if (id === seq.current) { setItems([]); setLoadError(mensaje(e, 'No se pudieron cargar las incidencias')); } }
    finally { if (id === seq.current) setLoading(false); }
  }
  async function cargarStats() { try { setStats((await incidenciasApi.getEstadisticas()).data.data || null); } catch { setStats(null); } }
  const refrescar = () => { void cargar(); void cargarStats(); };
  const filtrar = (key: keyof typeof filtros, value: string) => { setPage(1); setFiltros(f => ({ ...f, [key]: value })); };

  function abrirNueva() { setEditando(null); setForm(vacio()); setAlumnoLabel(''); setBusquedaAlumno(''); setFormError(''); setModal(true); }
  function abrirEdicion(i: Incidencia) {
    setEditando(i); setFormError(''); setAlumnoLabel(`${i.alumno_nombre} ${i.alumno_apellido}`);
    setForm({ alumno_id: String(i.alumno_id), fecha: i.fecha, hora: i.hora || '', tipo: i.tipo, gravedad: i.gravedad, lugar: i.lugar || '', descripcion: i.descripcion, medida_tomada: i.medida_tomada || '', apoderado_notificado: Boolean(Number(i.apoderado_notificado)) });
    setModal(true);
  }
  const puedeEditar = (i: Incidencia) => esAdmin || (i.reportado_por === user?.id && i.estado !== 'cerrada');

  async function guardar(e: FormEvent) {
    e.preventDefault(); setFormError('');
    if (!form.alumno_id) return setFormError('Seleccione un alumno');
    if (!form.descripcion.trim()) return setFormError('Describa lo ocurrido');
    const { alumno_id, ...resto } = form;
    const data = { ...resto, hora: form.hora || null };
    setSaving(true);
    try {
      if (editando) await incidenciasApi.update(editando.id, data);
      else await incidenciasApi.create({ ...data, alumno_id: Number(alumno_id) });
      toast.success(editando ? 'Incidencia actualizada' : 'Incidencia registrada');
      setModal(false); refrescar();
    } catch (err) { setFormError(mensaje(err, 'No se pudo guardar la incidencia')); }
    finally { setSaving(false); }
  }

  async function cambiarEstado(i: Incidencia, estado: string, texto?: string) {
    setUpdating(i.id);
    try { await incidenciasApi.updateEstado(i.id, estado, texto); toast.success(estado === 'cerrada' ? 'Incidencia cerrada' : 'Estado actualizado'); setCerrando(null); setResolucion(''); refrescar(); }
    catch (err) { toast.error(mensaje(err, 'No se pudo actualizar el estado')); }
    finally { setUpdating(null); }
  }

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  return <div className="space-y-4">
    <PageHeading title="Incidencias" description={esAdmin ? 'Registra y da seguimiento a las incidencias de conducta, como derivaciones a dirección.' : 'Registra las incidencias de conducta de tus alumnos, como una derivación a dirección.'} />

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
        {[['Abiertas', stats?.abiertas, 'text-amber-600'], ['Graves sin cerrar', stats?.graves_abiertas, 'text-red-600'], ['Derivaciones a dirección', stats?.derivaciones, 'text-primary-600'], ['Últimos 30 días', stats?.ultimos_30_dias, 'text-gray-900 dark:text-white']].map(([label, value, color]) =>
          <div key={label as string} className="card p-3 text-center"><p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p><p className="text-xs text-gray-500">{label}</p></div>)}
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1"><SearchInput value={search} onChange={v => { setPage(1); setSearch(v); }} placeholder="Buscar por alumno o código…" /></div>
      <select aria-label="Estado" className="input-field w-44" value={filtros.estado} onChange={e => filtrar('estado', e.target.value)}>
        <option value="">Todos los estados</option>{Object.entries(estadosIncidencia).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select aria-label="Tipo" className="input-field w-52" value={filtros.tipo} onChange={e => filtrar('tipo', e.target.value)}>
        <option value="">Todos los tipos</option>{Object.entries(tiposIncidencia).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select aria-label="Gravedad" className="input-field w-40" value={filtros.gravedad} onChange={e => filtrar('gravedad', e.target.value)}>
        <option value="">Toda gravedad</option>{Object.entries(gravedades).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button className="btn-primary flex items-center gap-2" onClick={abrirNueva}><Plus className="h-4 w-4" /> Registrar incidencia</button>
    </div>

    {loadError && <div role="alert" className="card text-red-700">{loadError} <button className="btn-secondary ml-2" onClick={refrescar}>Reintentar</button></div>}

    <div className="space-y-3">
      {loading ? [...Array(3)].map((_, i) => <div key={i} className="card h-28 animate-pulse" />)
        : loadError ? null
        : !items.length ? <div className="card py-12 text-center"><ShieldAlert className="mx-auto mb-3 h-12 w-12 text-gray-300" /><p className="text-gray-500">No hay incidencias con estos filtros.</p></div>
        : items.map(i => <article key={i.id} className={`card border-l-4 ${i.gravedad === 'grave' ? 'border-l-red-500' : i.gravedad === 'moderada' ? 'border-l-amber-500' : 'border-l-sky-400'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant={gravedadVariant(i.gravedad)}>{gravedades[i.gravedad]}</Badge>
                <Badge variant={estadoVariant(i.estado)}>{estadosIncidencia[i.estado]}</Badge>
                <span className="text-sm font-medium">{tiposIncidencia[i.tipo]}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{i.alumno_nombre} {i.alumno_apellido} <span className="font-mono text-sm font-normal text-gray-500">{i.codigo_alumno}</span></h3>
              <p className="text-sm text-gray-500">{fechaIncidencia(i.fecha, i.hora)}{i.lugar ? ' · ' + i.lugar : ''}{i.periodo ? ' · ' + i.periodo : ''}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{i.descripcion}</p>
              {i.medida_tomada && <p className="mt-1 text-sm"><span className="font-medium">Medida tomada:</span> {i.medida_tomada}</p>}
              {i.resolucion && <p className="mt-1 text-sm"><span className="font-medium">Resolución:</span> {i.resolucion}</p>}
              <p className="mt-2 text-xs text-gray-400">Registrado por {i.reportado_nombre} {i.reportado_apellido} · Apoderado {Number(i.apoderado_notificado) ? 'notificado' : 'no notificado'}{i.cerrada_nombre ? ` · Cerrada por ${i.cerrada_nombre} ${i.cerrada_apellido}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {puedeEditar(i) && <button className="btn-secondary flex items-center gap-1 py-1 text-xs" onClick={() => abrirEdicion(i)}><Pencil className="h-3 w-3" /> Editar</button>}
              {esAdmin && i.estado === 'abierta' && <button disabled={updating === i.id} className="btn-secondary py-1 text-xs" onClick={() => cambiarEstado(i, 'en_seguimiento')}>En seguimiento</button>}
              {esAdmin && i.estado !== 'cerrada' && <button disabled={updating === i.id} className="btn-success flex items-center gap-1 py-1 text-xs" onClick={() => { setCerrando(i); setResolucion(''); }}><CheckCircle className="h-3 w-3" /> Cerrar</button>}
              {esAdmin && i.estado === 'cerrada' && <button disabled={updating === i.id} className="btn-secondary flex items-center gap-1 py-1 text-xs" onClick={() => cambiarEstado(i, 'abierta')}><RotateCcw className="h-3 w-3" /> Reabrir</button>}
            </div>
          </div>
        </article>)}
    </div>

    {totalPages > 1 && <div className="flex items-center justify-center gap-3 text-sm">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
      <span>Página {page} de {totalPages} · {total} registros</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
    </div>}

    <Modal isOpen={modal} onClose={() => setModal(false)} title={editando ? 'Editar incidencia' : 'Registrar incidencia'} size="lg">
      <form className="space-y-4" onSubmit={guardar}>
        {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium">Alumno</label>
          {form.alumno_id ? <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><span>{alumnoLabel}</span>{!editando && <button type="button" className="text-sm text-primary-600" onClick={() => { set('alumno_id', ''); setAlumnoLabel(''); }}>Cambiar</button>}</div>
            : <><input className="input-field" placeholder="Escriba nombre, apellido o código (mínimo 2 letras)" value={busquedaAlumno} onChange={e => setBusquedaAlumno(e.target.value)} autoFocus />
              {opciones.length > 0 && <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">{opciones.map(a => <li key={a.id}><button type="button" className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => { set('alumno_id', String(a.id)); setAlumnoLabel(`${a.nombre} ${a.apellido} · ${a.codigo_alumno}`); setOpciones([]); }}>{a.nombre} {a.apellido} <span className="text-sm text-gray-500">{a.codigo_alumno}{a.grado ? ' · ' + a.grado : ''}</span></button></li>)}</ul>}
              {debouncedAlumno.trim().length >= 2 && !opciones.length && <p className="mt-1 text-sm text-gray-500">Sin coincidencias{user?.rol === 'profesor' ? ' entre sus alumnos' : ''}.</p>}</>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Tipo<select className="input-field mt-1" value={form.tipo} onChange={e => set('tipo', e.target.value)}>{Object.entries(tiposIncidencia).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm font-medium">Gravedad<select className="input-field mt-1" value={form.gravedad} onChange={e => set('gravedad', e.target.value)}>{Object.entries(gravedades).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm font-medium">Fecha<input type="date" className="input-field mt-1" max={hoy()} value={form.fecha} onChange={e => set('fecha', e.target.value)} required /></label>
          <label className="text-sm font-medium">Hora (opcional)<input type="time" className="input-field mt-1" value={form.hora} onChange={e => set('hora', e.target.value)} /></label>
        </div>
        <label className="block text-sm font-medium">Lugar (opcional)<input className="input-field mt-1" maxLength={120} placeholder="Ej.: aula 3.° B, patio, laboratorio" value={form.lugar} onChange={e => set('lugar', e.target.value)} /></label>
        <label className="block text-sm font-medium">¿Qué ocurrió?<textarea className="input-field mt-1" rows={4} maxLength={2000} required value={form.descripcion} onChange={e => set('descripcion', e.target.value)} /></label>
        <label className="block text-sm font-medium">Medida tomada (opcional)<textarea className="input-field mt-1" rows={2} maxLength={2000} placeholder="Ej.: conversación con el alumno, derivación a dirección, citación al apoderado" value={form.medida_tomada} onChange={e => set('medida_tomada', e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.apoderado_notificado} onChange={e => set('apoderado_notificado', e.target.checked)} /> Se notificó al apoderado</label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
    </Modal>

    <Modal isOpen={!!cerrando} onClose={() => setCerrando(null)} title="Cerrar incidencia" size="md">
      {cerrando && <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (resolucion.trim()) void cambiarEstado(cerrando, 'cerrada', resolucion.trim()); }}>
        <p className="text-sm text-gray-600">{cerrando.alumno_nombre} {cerrando.alumno_apellido} · {tiposIncidencia[cerrando.tipo]} · {fechaIncidencia(cerrando.fecha)}</p>
        <label className="block text-sm font-medium">¿Cómo se resolvió?<textarea className="input-field mt-1" rows={3} maxLength={2000} required value={resolucion} onChange={e => setResolucion(e.target.value)} placeholder="Ej.: reunión con el apoderado y compromiso firmado" /></label>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setCerrando(null)}>Cancelar</button><button className="btn-success" disabled={!resolucion.trim() || updating === cerrando.id}>Cerrar incidencia</button></div>
      </form>}
    </Modal>
  </div>;
}
