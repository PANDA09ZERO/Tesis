import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, Calendar, Search } from 'lucide-react';
import { mensualidadesApi, sueldosApi, profesoresApi, cursosApi, alumnosApi, periodosApi } from '../../api/endpoints';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Tab = 'mensualidades' | 'sueldos';

export default function PagosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('mensualidades');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<any[]>([]);
  const [añoResumen, setAñoResumen] = useState('2026');
  const [alumnosConDeuda, setAlumnosConDeuda] = useState<any[]>([]);
  const [loadingDeuda, setLoadingDeuda] = useState(false);

  const [profesores, setProfesores] = useState<{id: number; nombre: string; apellido: string}[]>([]);
  const [cursos, setCursos] = useState<{id: number; nombre: string; codigo: string}[]>([]);
  const [cursosProfesor, setCursosProfesor] = useState<{id: number; nombre: string; codigo: string}[]>([]);
  const [alumnos, setAlumnos] = useState<{id: number; nombre: string; apellido: string; codigo_alumno: string}[]>([]);
  const [periodos, setPeriodos] = useState<{id: number; nombre: string}[]>([]);
  const [selectedProfesor, setSelectedProfesor] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const fetchLists = async () => {
    setLoadingLists(true);
    try {
      const profRes = await profesoresApi.getAll().catch(() => null);
      const curRes = await cursosApi.getAll({ limit: 50 }).catch(() => null);
      const alumRes = await alumnosApi.getAll({ limit: 50 }).catch(() => null);
      const perRes = await periodosApi.getAll().catch(() => null);
      setProfesores((profRes?.data as any)?.data || []);
      setCursos((curRes?.data as any)?.data || []);
      setAlumnos((alumRes?.data as any)?.data || []);
      setPeriodos((perRes?.data as any)?.data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroMes) params.mes = filtroMes;
      if (filtroMes) params.año = añoResumen;
      if (tab === 'mensualidades') {
        const res = await mensualidadesApi.getAll(params);
        setData((res.data as any)?.data || []);
        setTotal((res.data as any)?.total || 0);
      } else {
        const res = await sueldosApi.getAll(params);
        setData((res.data as any)?.data || []);
        setTotal((res.data as any)?.total || 0);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async () => {
    try {
      const res = tab === 'mensualidades'
        ? await mensualidadesApi.getResumen(añoResumen)
        : await sueldosApi.getResumen(añoResumen);
      setResumen((res.data as any)?.data || []);
    } catch (error) {
      // silent
    }
  };

  const fetchAlumnosConDeuda = async () => {
    if (tab !== 'mensualidades') return;
    setLoadingDeuda(true);
    try {
      const res = await mensualidadesApi.getAlumnosConDeuda({ año: añoResumen });
      setAlumnosConDeuda((res.data as any)?.data || []);
    } catch (error) {
      console.error('Error al cargar alumnos con deuda:', error);
    } finally {
      setLoadingDeuda(false);
    }
  };

  const fetchCursosProfesor = async (profesorId: string) => {
    if (!profesorId) {
      setCursosProfesor([]);
      return;
    }
    try {
      const res = await profesoresApi.getCursos(parseInt(profesorId));
      setCursosProfesor((res.data as any)?.data || []);
    } catch (error) {
      console.error('Error al cargar cursos del profesor:', error);
      setCursosProfesor([]);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, filtroEstado, filtroMes, tab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchResumen();
    fetchAlumnosConDeuda();
  }, [tab, añoResumen]);

  useEffect(() => {
    if (tab === 'sueldos' && selectedProfesor) {
      fetchCursosProfesor(selectedProfesor);
    }
  }, [selectedProfesor, tab]);

  const handleOpenModal = () => {
    setEditing(null);
    setSelectedProfesor('');
    setSelectedCurso('');
    setSelectedAlumno('');
    setSelectedPeriodo('');
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setSelectedProfesor(item.profesor_id || '');
    setSelectedCurso(item.curso_id || '');
    setSelectedAlumno(item.alumno_id || '');
    setSelectedPeriodo(item.periodo_academico_id || '');
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (tab === 'mensualidades') {
        await mensualidadesApi.delete(deleteId);
      } else {
        await sueldosApi.delete(deleteId);
      }
      toast.success('Eliminado correctamente');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
    setDeleteId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    try {
      const formData: any = {
        mes: form['form-mes'].value || '',
        año: form['form-año'].value || '2026',
        estado: form['form-estado'].value || 'pendiente',
      };
      if (tab === 'mensualidades') {
        if (!selectedAlumno) {
          toast.error('Debe seleccionar alumno');
          return;
        }
        formData.alumno_id = parseInt(selectedAlumno);
        formData.periodo_academico_id = parseInt(selectedPeriodo) || undefined;
        formData.monto = parseFloat(form['form-monto'].value || '0');
      } else {
        if (!selectedProfesor || !selectedCurso) {
          toast.error('Debe seleccionar profesor y curso');
          return;
        }
        formData.profesor_id = parseInt(selectedProfesor);
        formData.curso_id = parseInt(selectedCurso);
        formData.periodo_academico_id = parseInt(selectedPeriodo) || undefined;
        formData.salario_base = parseFloat(form['form-salario'].value || '0');
        formData.horas_clase = parseFloat(form['form-horas'].value || '0');
        formData.monto_extra = parseFloat(form['form-extra'].value || '0');
      }
      if (editing) {
        if (tab === 'mensualidades') {
          await mensualidadesApi.update(editing.id, formData);
        } else {
          await sueldosApi.update(editing.id, formData);
        }
        toast.success('Actualizado correctamente');
      } else {
        if (tab === 'mensualidades') {
          await mensualidadesApi.create(formData);
        } else {
          await sueldosApi.create(formData);
        }
        toast.success('Registrado correctamente');
      }
      setShowModal(false);
      await fetchData();
      await fetchResumen();
      if (tab === 'mensualidades') {
        await fetchAlumnosConDeuda().catch(err => console.error('Error al actualizar alumnos con deuda:', err));
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al guardar';
      toast.error(errorMessage);
    }
  };

  const columns = tab === 'mensualidades' ? [
    { key: 'alumno_nombre', label: 'Alumno' },
    { key: 'codigo_alumno', label: 'Código' },
    { key: 'curso_nombre', label: 'Curso' },
    { key: 'monto', label: 'Monto', render: (v: any) => `S/ ${Number(v || 0).toFixed(2)}` },
    { key: 'mes', label: 'Mes' },
    { key: 'año', label: 'Año' },
    { key: 'estado', label: 'Estado', render: (v: any) => <Badge variant={v === 'pagado' ? 'success' : v === 'pendiente' ? 'warning' : 'danger'}>{v}</Badge> },
    { key: 'actions', label: '', render: (_: any, row: any) => (
      <div className="flex gap-1">
        <button onClick={() => handleEdit(row)} className="p-1 text-primary-600 hover:bg-primary-50 rounded text-xs">Editar</button>
        <button onClick={() => setDeleteId(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded text-xs">Eliminar</button>
      </div>
    )},
  ] : [
    { key: 'profesor_nombre', label: 'Profesor' },
    { key: 'curso_nombre', label: 'Curso' },
    { key: 'salario_base', label: 'Salario Base', render: (v: any) => `S/ ${Number(v || 0).toFixed(2)}` },
    { key: 'monto_total', label: 'Total', render: (v: any) => `S/ ${Number(v || 0).toFixed(2)}` },
    { key: 'mes', label: 'Mes' },
    { key: 'año', label: 'Año' },
    { key: 'estado', label: 'Estado', render: (v: any) => <Badge variant={v === 'pagado' ? 'success' : 'warning'}>{v}</Badge> },
    { key: 'actions', label: '', render: (_: any, row: any) => (
      <div className="flex gap-1">
        <button onClick={() => handleEdit(row)} className="p-1 text-primary-600 hover:bg-primary-50 rounded text-xs">Editar</button>
        <button onClick={() => setDeleteId(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded text-xs">Eliminar</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('mensualidades')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'mensualidades' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <DollarSign className="w-4 h-4 inline mr-1" />
              Mensualidades
            </button>
            <button
              onClick={() => setTab('sueldos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'sueldos' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Sueldos Profesores
            </button>
          </div>
          <button onClick={handleOpenModal} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo {tab === 'mensualidades' ? 'Mensualidad' : 'Sueldo'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'mensualidades' ? 'Buscar alumno...' : 'Buscar profesor...'}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {tab === 'mensualidades' ? (
              <>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
                <option value="descuento">Descuento</option>
              </>
            ) : (
              <>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="rechazado">Rechazado</option>
              </>
            )}
          </select>
          <select className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Resumen</h3>
          <select className="px-3 py-1 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer" value={añoResumen} onChange={(e) => setAñoResumen(e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {meses.map(m => {
            const item = resumen.find((r: any) => r.mes === m);
            return (
              <div key={m} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{m}</p>
                <p className="text-lg font-bold text-gray-900">S/ {Number(item?.total_mes || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">{item?.pagados || 0} pagados / {item?.pendientes || 0} pendientes</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alumnos con Deuda - Solo para mensualidades */}
      {tab === 'mensualidades' && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Alumnos con Mensualidades Pendientes</h3>
            <Badge variant="warning">{alumnosConDeuda.length} alumnos</Badge>
          </div>
          {loadingDeuda ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : alumnosConDeuda.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No hay alumnos con deudas pendientes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumno</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grado/Sección</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensualidades Pendientes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Deuda</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alumnosConDeuda.map((alumno: any) => (
                    <tr key={alumno.alumno_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{alumno.codigo_alumno}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {alumno.alumno_nombre} {alumno.alumno_apellido}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {alumno.grado} - {alumno.seccion}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <Badge variant="warning">{alumno.mensualidades_pendientes}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">
                        S/ {Number(alumno.total_deuda || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {alumno.alumno_telefono || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No hay registros encontrados
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? `Editar ${tab === 'mensualidades' ? 'Mensualidad' : 'Sueldo'}` : `Nueva ${tab === 'mensualidades' ? 'Mensualidad' : 'Sueldo'}`} size="md">
          {tab === 'mensualidades' ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
                <select
                  value={selectedAlumno}
                  onChange={(e) => setSelectedAlumno(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.codigo_alumno})</option>
                  ))}
                </select>
              </div>
<div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Período Académico</label>
                 <select
                   value={selectedPeriodo}
                   onChange={(e) => setSelectedPeriodo(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="">Sin período</option>
                   {periodos.map(p => (
                     <option key={p.id} value={p.id}>{p.nombre}</option>
                   ))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input type="number" step="0.01" name="form-monto" defaultValue={editing?.monto || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <select name="form-año" defaultValue={editing?.año || '2026'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <select name="form-mes" defaultValue={editing?.mes || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" required>
                    {meses.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select name="form-estado" defaultValue={editing?.estado || 'pendiente'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                    <option value="descuento">Descuento</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
                <select
                  value={selectedProfesor}
                  onChange={(e) => setSelectedProfesor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccionar profesor...</option>
                  {profesores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                <select
                  value={selectedCurso}
                  onChange={(e) => setSelectedCurso(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={!selectedProfesor}
                >
                  <option value="">Seleccionar curso...</option>
                  {cursosProfesor.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
                  ))}
                </select>
                {!selectedProfesor && <small className="text-gray-500">Seleccione un profesor primero</small>}
              </div>
<div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Período Académico</label>
                 <select
                   value={selectedPeriodo}
                   onChange={(e) => setSelectedPeriodo(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="">Sin período</option>
                   {periodos.map(p => (
                     <option key={p.id} value={p.id}>{p.nombre}</option>
                   ))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salario Base</label>
                  <input type="number" step="0.01" name="form-salario" defaultValue={editing?.salario_base || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas Clase</label>
                  <input type="number" step="0.5" name="form-horas" defaultValue={editing?.horas_clase || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Extra</label>
                <input type="number" step="0.01" name="form-extra" defaultValue={editing?.monto_extra || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <select name="form-mes" defaultValue={editing?.mes || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" required>
                    {meses.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <select name="form-año" defaultValue={editing?.año || '2026'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select name="form-estado" defaultValue={editing?.estado || 'pendiente'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={`Eliminar ${tab === 'mensualidades' ? 'Mensualidad' : 'Sueldo'}`}
          message="¿Estás seguro de que deseas eliminar este registro?"
        />
      )}
    </div>
  );
}
