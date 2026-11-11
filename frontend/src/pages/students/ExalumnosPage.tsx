import './students.css';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Plus, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import DniLookupField from '../../components/ui/DniLookupField';
import { alumnosApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ESTADOS_ALUMNO } from '../tramites/tramites';

const VACIO = { dni: '', nombre: '', apellido: '', fecha_nacimiento: '', genero: 'M', telefono: '', direccion: '', estado: 'egresado',
  anio_ingreso: '', anio_ultimo_estudio: '', ultimo_grado_cursado: '', observaciones: '' };

export default function ExalumnosPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const request = useRef(0);

  const cargar = async () => {
    const id = ++request.current;
    setLoading(true); setError('');
    try {
      const res = await alumnosApi.getAll({ page, limit: 20, search: debounced, historicos: '1' });
      if (id !== request.current) return;
      setRows(res.data.data || []); updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (e: any) { if (id === request.current) setError(e.response?.data?.message || 'No se pudo cargar la lista'); }
    finally { if (id === request.current) setLoading(false); }
  };
  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, debounced]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return;
    setSaving(true); setFormError('');
    try {
      const res = await alumnosApi.crearHistorico(form);
      toast.success('Exalumno registrado'); setModal(false);
      navigate(`/alumnos/${res.data.data.id}`);
    } catch (err: any) { setFormError(err.response?.data?.message || 'No se pudo registrar'); }
    finally { setSaving(false); }
  };

  const set = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [campo]: e.target.value }));
  const anioActual = new Date().getFullYear();

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (a: any) => `${a.apellido}, ${a.nombre}` },
    { key: 'dni', label: 'DNI', render: (a: any) => a.dni || '—' },
    { key: 'ultimo_grado_cursado', label: 'Último grado', render: (a: any) => a.ultimo_grado_cursado || '—' },
    { key: 'anio_ultimo_estudio', label: 'Último año', render: (a: any) => a.anio_ultimo_estudio || '—' },
    { key: 'estado', label: 'Situación', summary: true, render: (a: any) => <Badge variant={a.estado === 'egresado' ? 'success' : a.estado === 'trasladado' ? 'info' : 'default'}>{ESTADOS_ALUMNO[a.estado] || a.estado}</Badge> },
    { key: 'acciones', label: '', render: (a: any) => <button type="button" aria-label={`Ver ficha de ${a.nombre} ${a.apellido}`} className="flex h-11 w-11 items-center justify-center rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-800" onClick={e => { e.stopPropagation(); navigate(`/alumnos/${a.id}`); }}><Eye className="h-4 w-4" /></button> }
  ];

  return (
    <div className="students-surface space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Exalumnos</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Alumnos anteriores al sistema. Solo guardan sus datos, no tienen cuenta de acceso. Desde su ficha puedes atender traslados, certificados y constancias.</p>
      </div>
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar por nombre, DNI o código..." className="w-full sm:w-80" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary flex items-center justify-center gap-2" onClick={() => navigate('/exalumnos/importar')}><FileSpreadsheet className="h-4 w-4" /> Importar desde Excel</button>
          <button type="button" className="btn-primary flex items-center justify-center gap-2" onClick={() => { setForm(VACIO); setFormError(''); setModal(true); }}><Plus className="h-4 w-4" /> Registrar exalumno</button>
        </div>
      </div>
      {!loading && !error && <p className="text-xs text-gray-500" role="status">{total} {total === 1 ? 'exalumno' : 'exalumnos'}</p>}
      {error ? <div className="card text-red-600" role="alert">{error} <button className="btn-secondary ml-2" onClick={() => void cargar()}>Reintentar</button></div>
        : <DataTable columns={columns} data={rows} page={page} totalPages={totalPages} total={total} onPageChange={setPage} isLoading={loading}
            onRowClick={a => navigate(`/alumnos/${a.id}`)} emptyMessage={search ? 'Ningún exalumno coincide con la búsqueda' : 'Aún no hay exalumnos. Impórtalos desde Excel o regístralos uno por uno.'} />}

      <Modal isOpen={modal} onClose={() => { if (!saving) setModal(false); }} title="Registrar exalumno" size="lg" className="student-dialog">
        <form onSubmit={guardar} className="space-y-4">
          {formError && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-600">{formError}</p>}
          <p className="text-sm text-gray-500">Se guarda solo su información, sin matrícula ni cuenta de acceso.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DniLookupField id="exalumno-dni" value={form.dni} onChange={dni => setForm(f => ({ ...f, dni }))} onFound={p => setForm(f => ({ ...f, nombre: p.nombre, apellido: p.apellido }))} />
            <div><label htmlFor="ex-nombre" className="mb-1 block text-sm font-medium">Nombres *</label><input id="ex-nombre" className="input-field" required maxLength={100} value={form.nombre} onChange={set('nombre')} /></div>
            <div><label htmlFor="ex-apellido" className="mb-1 block text-sm font-medium">Apellidos *</label><input id="ex-apellido" className="input-field" required maxLength={100} value={form.apellido} onChange={set('apellido')} /></div>
            <div><label htmlFor="ex-nac" className="mb-1 block text-sm font-medium">Fecha de nacimiento</label><input id="ex-nac" type="date" className="input-field" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} /></div>
            <div><label htmlFor="ex-genero" className="mb-1 block text-sm font-medium">Género</label>
              <select id="ex-genero" className="input-field" value={form.genero} onChange={set('genero')}><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></div>
            <div><label htmlFor="ex-estado" className="mb-1 block text-sm font-medium">Situación *</label>
              <select id="ex-estado" className="input-field" value={form.estado} onChange={set('estado')}><option value="egresado">Egresado</option><option value="retirado">Retirado</option><option value="trasladado">Trasladado</option></select></div>
            <div><label htmlFor="ex-ingreso" className="mb-1 block text-sm font-medium">Año de ingreso</label><input id="ex-ingreso" type="number" min={1950} max={anioActual} className="input-field" value={form.anio_ingreso} onChange={set('anio_ingreso')} /></div>
            <div><label htmlFor="ex-ultimo" className="mb-1 block text-sm font-medium">Último año de estudio</label><input id="ex-ultimo" type="number" min={1950} max={anioActual} className="input-field" value={form.anio_ultimo_estudio} onChange={set('anio_ultimo_estudio')} /></div>
            <div className="sm:col-span-2"><label htmlFor="ex-grado" className="mb-1 block text-sm font-medium">Último grado cursado</label><input id="ex-grado" className="input-field" maxLength={80} placeholder="Ej.: 5.° de secundaria" value={form.ultimo_grado_cursado} onChange={set('ultimo_grado_cursado')} /></div>
            <div><label htmlFor="ex-tel" className="mb-1 block text-sm font-medium">Teléfono</label><input id="ex-tel" type="tel" className="input-field" maxLength={20} value={form.telefono} onChange={set('telefono')} /></div>
            <div><label htmlFor="ex-dir" className="mb-1 block text-sm font-medium">Dirección</label><input id="ex-dir" className="input-field" maxLength={500} value={form.direccion} onChange={set('direccion')} /></div>
            <div className="sm:col-span-2"><label htmlFor="ex-obs" className="mb-1 block text-sm font-medium">Observaciones</label><textarea id="ex-obs" className="input-field" rows={2} maxLength={2000} value={form.observaciones} onChange={set('observaciones')} /></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
