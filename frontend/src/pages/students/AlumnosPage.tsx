import './students.css';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye, UserPlus } from 'lucide-react';
import StudentMobileCard from './StudentMobileCard';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import { alumnosApi, gradosApi, configuracionApi, matriculasApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Alumno } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePeriodo } from '../../context/PeriodoContext';
import CreatedCredentialsModal from '../../components/ui/CreatedCredentialsModal';
import type { CreatedAccountCredentials } from '../../types';

export default function AlumnosPage() {
  const { user } = useAuth();
  const canManageStudents = user?.rol === 'administrador';
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const listRequest = useRef(0);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedAccountCredentials | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', password: '', dni: '', telefono: '', direccion: '',
    fecha_nacimiento: '', genero: 'M'
  });

  const [saving, setSaving] = useState(false);

  // Contexto global de periodo académico (vigente por defecto)
  const { periodoId: periodoFilter, periodos, listo } = usePeriodo();
  // 'con' = alumnos con matrícula en el periodo; 'sin' = candidatos a rematrícula
  const [matriculaPeriodo, setMatriculaPeriodo] = useState<'con' | 'sin'>('con');

  // Rematrícula (alumnos de periodos anteriores → periodo seleccionado)
  const [rematriculaAlumno, setRematriculaAlumno] = useState<Alumno | null>(null);
  const [remGradoId, setRemGradoId] = useState('');
  const [remObservaciones, setRemObservaciones] = useState('');
  const [remAutoCursos, setRemAutoCursos] = useState(true);
  const [remCursosDelGrado, setRemCursosDelGrado] = useState<any[]>([]);
  const [remGrados, setRemGrados] = useState<any[]>([]);
  const [savingRem, setSavingRem] = useState(false);
  const [remLoading, setRemLoading] = useState(false);
  const [remError, setRemError] = useState('');
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [coursesAttempt, setCoursesAttempt] = useState(0);
  const remRequest = useRef(0);

  useEffect(() => { setPage(1); setRematriculaAlumno(null); remRequest.current++; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodoFilter]);

  useEffect(() => {
    if (listo) void loadAlumnos();
    return () => { listRequest.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, periodoFilter, matriculaPeriodo, listo]);

  const loadAlumnos = async () => {
    const request = ++listRequest.current;
    setLoading(true); setListError('');
    try {
      const params: any = { page, limit: 20, search: debouncedSearch };
      if (periodoFilter) {
        params.periodo_id = Number(periodoFilter);
        params.matricula_periodo = matriculaPeriodo;
      }
      const res = await alumnosApi.getAll(params);
      if (request !== listRequest.current) return;
      if (!Array.isArray(res.data.data)) throw new Error('Respuesta inválida del listado de alumnos');
      setAlumnos(res.data.data);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error: any) {
      if (request === listRequest.current) { setAlumnos([]); setListError(error.response?.data?.message || error.message || 'No se pudo cargar Alumnos'); }
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  };

  // Cursos configurados del grado en el periodo destino (previsualización de rematrícula)
  useEffect(() => {
    let cancelled = false;
    const cargarCursos = async () => {
      setCoursesError(''); setCoursesLoading(false);
      if (!rematriculaAlumno || !remGradoId || !periodoFilter || !remAutoCursos) {
        setRemCursosDelGrado([]);
        return;
      }
      setCoursesLoading(true); setRemCursosDelGrado([]);
      try {
        const res = await configuracionApi.getCursosDeGrado(Number(periodoFilter), Number(remGradoId));
        if (!cancelled) setRemCursosDelGrado(res.data.data || []);
      } catch (error: any) {
        if (!cancelled) { setCoursesError(error.response?.data?.message || 'No se pudieron consultar los cursos del grado'); setRemCursosDelGrado([]); }
      } finally { if (!cancelled) setCoursesLoading(false); }
    };
    void cargarCursos();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rematriculaAlumno, remGradoId, periodoFilter, remAutoCursos, coursesAttempt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setFormError('');
    try {
      if (editingAlumno) {
        await alumnosApi.update(editingAlumno.id, formData);
        toast.success('Alumno actualizado');
      } else {
        const { email: _email, password: _password, ...student } = formData;
        const response = await alumnosApi.create({...student, dni: formData.dni.trim() || null});
        setCreatedCredentials(response.data.data?.credentials || null);
        toast.success('Alumno registrado');
      }
      setShowModal(false);
      setEditingAlumno(null);
      resetForm();
      loadAlumnos();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al guardar';
      setFormError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setFormError('');
    setFormData({
      nombre: '', apellido: '', email: '', password: '', dni: '', telefono: '', direccion: '',
      fecha_nacimiento: '', genero: 'M'
    });
  };

  const openEdit = async (alumno: Alumno) => {
    setFormError('');
    setEditingAlumno(alumno);
    const formDataUpdates = {
      nombre: alumno.nombre, apellido: alumno.apellido, email: alumno.email, password: '',
      dni: alumno.dni || '', telefono: alumno.telefono || '', direccion: (alumno as any).direccion || '',
      fecha_nacimiento: alumno.fecha_nacimiento ? alumno.fecha_nacimiento.split('T')[0] : '', genero: alumno.genero || 'M'
    };

    setFormData(formDataUpdates);
    setShowModal(true);
  };

  const openRematricula = async (alumno: Alumno) => {
    if (!periodoFilter) return;
    const request = ++remRequest.current;
    setRemLoading(true); setRemError(''); setRemGradoId('');
    setRematriculaAlumno(alumno);
    setRemObservaciones('');
    setRemAutoCursos(true);
    setRemCursosDelGrado([]);
    // Grado por defecto: el de la matrícula más reciente del alumno
    let gradoDefault = alumno.grado_id ? String(alumno.grado_id) : '';
    try {
      const [matRes, gradRes] = await Promise.all([
        alumnosApi.getMatriculas(alumno.id),
        remGrados.length ? Promise.resolve(null) : gradosApi.getAll()
      ]);
      if (request !== remRequest.current) return;
      if (!remGrados.length && gradRes) setRemGrados(gradRes.data.data || []);
      const grupos = matRes.data.data || [];
      const ultimo = grupos.find((g: any) => g.grado_id) || grupos[0];
      if (ultimo?.grado_id) gradoDefault = String(ultimo.grado_id);
    } catch (error: any) {
      if (request === remRequest.current) setRemError(error.response?.data?.message || 'No se pudieron cargar los datos para rematricular');
    } finally { if (request === remRequest.current) setRemLoading(false); }
    if (request === remRequest.current) setRemGradoId(gradoDefault);
  };

  const handleRematricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rematriculaAlumno || !periodoFilter || !remGradoId || savingRem || remLoading || !!remError || coursesLoading || !!coursesError) return;
    setSavingRem(true); setRemError('');
    try {
      const res = await matriculasApi.create({
        alumno_id: rematriculaAlumno.id,
        periodo_academico_id: Number(periodoFilter),
        grado_id: Number(remGradoId),
        auto_cursos: remAutoCursos,
        observaciones: remObservaciones || undefined
      });
      const data = res.data.data as any;
      toast.success(
        data?.cursos_inscritos > 1
          ? `Rematrícula registrada: ${data.cursos_inscritos} cursos`
          : res.data.message || 'Rematrícula registrada'
      );
      setRematriculaAlumno(null);
      loadAlumnos();
    } catch (error: any) {
      const message=error.response?.data?.message || 'Error al rematricular';
      toast.error(message);
    } finally { setSavingRem(false); }
  };

  const nombrePeriodoSel = periodos.find(p => String(p.id) === periodoFilter)?.nombre;

  const columns = [
    { key: 'codigo_alumno', label: 'Código', render: (a: Alumno) => <span className="font-mono text-xs">{a.codigo_alumno}</span> },
    { key: 'nombre', label: 'Nombre', render: (a: Alumno) => `${a.nombre} ${a.apellido}` },
    { key: 'email', label: 'Email' },
    { key: 'grado', label: 'Grado', render: (a: Alumno) => a.grado || '-' },
    { key: 'estado', label: 'Estado', render: (a: Alumno) => {
      if (periodoFilter) {
        const est = a.estado_matricula;
        if (!est) return <Badge variant="info">Sin matrícula en el periodo</Badge>;
        return <Badge variant={est === 'activa' ? 'success' : est === 'cancelada' ? 'danger' : 'warning'}>{est}</Badge>;
      }
      return (
        <Badge variant={a.tiene_matricula === 0 ? 'info' : a.estado === 'matriculado' ? 'success' : a.estado === 'retirado' ? 'danger' : 'info'}>
          {a.tiene_matricula === 0 ? 'Sin matrícula' : a.estado || 'Estado no registrado'}
        </Badge>
      );
    }},
    { key: 'acciones', label: 'Acciones', render: (a: Alumno) => (
      <div className="flex gap-2">
        {canManageStudents && periodoFilter && a.tiene_matricula_activa_periodo === 0 && (
          <button onClick={(e) => { e.stopPropagation(); openRematricula(a); }}
            className="flex h-11 w-11 items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-800 rounded" aria-label={`Rematricular a ${nombrePeriodoSel}`}
            title={`Rematricular en ${nombrePeriodoSel || 'el periodo seleccionado'}`}>
            <UserPlus className="w-4 h-4" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); navigate(`/alumnos/${a.id}${periodoFilter ? `?periodo_id=${periodoFilter}` : ''}`); }}
          className="flex h-11 w-11 items-center justify-center text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-800 rounded" aria-label={`Ver detalle de ${a.nombre} ${a.apellido}`}>
          <Eye className="w-4 h-4" />
        </button>
        {canManageStudents && <button onClick={(e) => { e.stopPropagation(); openEdit(a); }}
          className="flex h-11 w-11 items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" aria-label="Editar alumno">
          <Edit className="w-4 h-4" />
        </button>}
      </div>
    )}
  ];

  return (
    <div className="students-surface space-y-4">
      <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{canManageStudents ? 'Alumnos' : 'Mis alumnos'}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{canManageStudents ? 'Consulta sus datos y su información académica.' : 'Alumnos de tus cursos y periodos asignados.'}</p></div></div>
      <div className="card space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Buscar alumno..." className="w-full sm:w-80" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {periodoFilter && (
            <select aria-label="Matrícula en el periodo" className="input-field w-full sm:w-auto" value={matriculaPeriodo}
              onChange={e => { setMatriculaPeriodo(e.target.value as 'con' | 'sin'); setPage(1); }}>
              <option value="con">Con matrícula en el periodo</option>
              <option value="sin">Sin matrícula activa</option>
            </select>
          )}
          {canManageStudents && <button onClick={() => { resetForm(); setEditingAlumno(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" /> Nuevo Alumno
          </button>}
        </div>
      </div>

      {periodoFilter && (
        <><p className="text-xs text-gray-500 sm:hidden">{matriculaPeriodo==='sin' ? 'Candidatos a rematrícula' : 'Matrículas'} · {nombrePeriodoSel}</p>
        <p className="hidden text-sm text-gray-500 sm:block">
          {matriculaPeriodo === 'sin'
            ? <>Mostrando alumnos con historial en otros periodos y <span className="font-medium text-gray-700">sin matrícula activa</span> en {nombrePeriodoSel}. Usa el botón de rematrícula para inscribirlos.</>
            : <>Mostrando alumnos con matrícula en <span className="font-medium text-gray-700">{nombrePeriodoSel}</span>. El grado y el estado provienen de la matrícula de ese periodo.</>}
        </p></>
      )}

      </div>
      {!loading && !listError && <p className="text-xs text-gray-500 dark:text-gray-400" role="status">{total} {total === 1 ? 'alumno encontrado' : 'alumnos encontrados'}{search ? ' para tu búsqueda' : ''}</p>}
      {listError ? <div className="card space-y-3 text-red-600 dark:text-red-400" role="alert"><p>{listError}</p><button type="button" className="btn-secondary" onClick={() => void loadAlumnos()}>Reintentar alumnos</button></div> : <DataTable
        className="students-table"
        renderMobileCard={a => <StudentMobileCard alumno={a} status={columns[4].render!(a)}
          onView={() => navigate(`/alumnos/${a.id}${periodoFilter ? `?periodo_id=${periodoFilter}` : ''}`)}
          onEdit={canManageStudents ? () => void openEdit(a) : undefined}
          onReenroll={canManageStudents && periodoFilter && a.tiene_matricula_activa_periodo === 0 ? () => void openRematricula(a) : undefined}/>}
        columns={columns}
        data={alumnos}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        onRowClick={(a) => navigate(`/alumnos/${a.id}${periodoFilter ? `?periodo_id=${periodoFilter}` : ''}`)}
        isLoading={loading}
        emptyMessage={
          periodoFilter
            ? matriculaPeriodo === 'sin'
              ? 'No hay candidatos a rematrícula: todos los alumnos con historial ya tienen matrícula activa en el periodo'
              : 'No hay alumnos con matrícula en el periodo seleccionado'
            : 'No se encontraron alumnos'
        }
      />}

      {/* Rematrícula de alumno registrado en un periodo anterior */}
      <Modal isOpen={!!rematriculaAlumno} onClose={() => { if (!savingRem) { remRequest.current++; setRematriculaAlumno(null); } }}
        title="Rematricular alumno" size="md" className="student-dialog">
        <form onSubmit={handleRematricula} className="space-y-4">
          {remLoading && <p role="status" className="text-sm text-gray-500">Cargando matrícula y grados…</p>}
          {remError && <div role="alert" className="space-y-2 text-sm text-red-600 dark:text-red-400"><p>{remError}</p><button type="button" className="btn-secondary" onClick={() => rematriculaAlumno && void openRematricula(rematriculaAlumno)}>Reintentar datos</button></div>}
          <p className="text-sm text-gray-700">
            {rematriculaAlumno?.nombre} {rematriculaAlumno?.apellido} ({rematriculaAlumno?.codigo_alumno})
            {' → '}<span className="font-medium">{nombrePeriodoSel}</span>
          </p>
          <div>
            <label htmlFor="reenroll-grade" className="block text-sm font-medium text-gray-700 mb-1">Grado *</label>
            <select id="reenroll-grade" disabled={remLoading || !!remError || savingRem} value={remGradoId} onChange={e => setRemGradoId(e.target.value)} className="input-field" required>
              <option value="">Seleccionar grado...</option>
              {remGrados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Se toma por defecto el grado de su matrícula más reciente; puedes cambiarlo.</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={remAutoCursos} onChange={e => setRemAutoCursos(e.target.checked)} className="mt-0.5 rounded" />
              <span className="text-sm text-gray-700">
                <span className="font-medium">Inscribir automáticamente los cursos del grado</span>
                <br />
                <span className="text-xs text-gray-500">Usa la configuración del periodo académico (Estructura Académica).</span>
              </span>
            </label>
            {coursesLoading && <p role="status" className="mt-2 text-sm text-gray-500">Cargando cursos…</p>}
            {coursesError && <div role="alert" className="mt-2 space-y-2 text-sm text-red-600 dark:text-red-400"><p>{coursesError}</p><button type="button" className="btn-secondary" onClick={() => setCoursesAttempt(n => n + 1)}>Reintentar cursos</button></div>}
            {remAutoCursos && !coursesLoading && !coursesError && (
              remCursosDelGrado.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {remCursosDelGrado.map(curso => (
                    <span key={curso.curso_id} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                      {curso.curso}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-600">
                  {remGradoId && periodoFilter
                    ? 'Este grado no tiene cursos configurados en el periodo destino. Configura la estructura académica antes de rematricular.'
                    : 'Elige el grado para ver los cursos que se inscribirán.'}
                </p>
              )
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={remObservaciones} onChange={e => setRemObservaciones(e.target.value)} className="input-field" rows={2} />
          </div>
          <p className="text-xs text-gray-500">Solo se replica la inscripción académica; los pagos, asistencias y calificaciones del periodo anterior no se migran.</p>
          <div className="form-actions">
            <button type="button" onClick={() =>  { remRequest.current++; setRematriculaAlumno(null); }} className="btn-secondary" disabled={savingRem}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingRem || remLoading || !!remError || coursesLoading || !!coursesError || !!(remAutoCursos && remGradoId && remCursosDelGrado.length === 0)}>
              {savingRem ? 'Rematriculando…' : 'Confirmar rematrícula'}
            </button>
          </div>
        </form>
      </Modal>

      {canManageStudents && <Modal isOpen={showModal} onClose={() => { if (!saving) { setShowModal(false); setEditingAlumno(null); } }}
        title={editingAlumno ? 'Editar Alumno' : 'Registrar Alumno'} size="lg" className="student-dialog">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-600 dark:border-red-900 dark:text-red-400">{formError}</p>}
          <h3 className="font-semibold">Datos del alumno</h3>
          {editingAlumno && <p className="text-sm text-gray-500">El nombre, apellido, correo y DNI se consultan aquí. Para cambiarlos, utiliza Usuarios. En este formulario puedes actualizar teléfono, fecha de nacimiento y género.</p>}
          {!editingAlumno&&<p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">El usuario institucional se generará con el nombre y apellido del alumno. La contraseña temporal se mostrará una sola vez al terminar.</p>}
          <p className="text-sm text-gray-500">El grado, periodo y cursos se establecen después al registrar la matrícula.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="student-nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" id="student-nombre" readOnly={!!editingAlumno} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label htmlFor="student-apellido" className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input type="text" id="student-apellido" readOnly={!!editingAlumno} value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})}
                className="input-field" required />
            </div>
            {editingAlumno && <div>
              <label htmlFor="student-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" id="student-email" readOnly={!!editingAlumno} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="input-field" required />
            </div>}
            <div>
              <label htmlFor="student-dni" className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input type="text" id="student-dni" readOnly={!!editingAlumno} value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="student-telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" id="student-telefono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})}
                className="input-field" />
            </div>
            {!editingAlumno && <div className="sm:col-span-2">
              <label htmlFor="student-direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" id="student-direccion" maxLength={500} value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="input-field" />
            </div>}
            <div>
              <label htmlFor="student-fecha_nacimiento" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input type="date" id="student-fecha_nacimiento" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="student-genero" className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select id="student-genero" value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})} className="input-field">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => { setShowModal(false); setEditingAlumno(null); }} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando…' : editingAlumno ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>}
      <CreatedCredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />
    </div>
  );
}
