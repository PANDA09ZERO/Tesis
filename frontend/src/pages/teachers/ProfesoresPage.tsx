import { DirectoryHeader, PersonCard } from '../../components/ui/PeopleDirectory';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import DniLookupField from '../../components/ui/DniLookupField';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { profesoresApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Profesor } from '../../types';
import toast from 'react-hot-toast';
import CreatedCredentialsModal from '../../components/ui/CreatedCredentialsModal';
import type { CreatedAccountCredentials } from '../../types';

export default function ProfesoresPage() {
  const navigate = useNavigate();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError,setFormError]=useState(''),[deleting,setDeleting]=useState(false);
  const sequence=useRef(0);const [loadError,setLoadError]=useState(''),[saving,setSaving]=useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState<Profesor | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedAccountCredentials | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', password: '', dni: '', telefono: '', direccion: '',
    especialidad: '', titulo_profesional: '', fecha_ingreso: ''
  });

  useEffect(() => { void loadData(); return () => { sequence.current++; }; }, [page, debouncedSearch]);

  const loadData = async () => {
    const current=++sequence.current;setLoading(true);setLoadError('');setProfesores([]);
    try {
      const res = await profesoresApi.getAll({ page, limit: 20, search: debouncedSearch });
      if(current!==sequence.current)return;setProfesores(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error:any) { if(current===sequence.current)setLoadError(error.response?.data?.message||'No se pudieron consultar los profesores'); }
    finally { if(current===sequence.current)setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();if(saving)return;setFormError('');
    if(formData.password && new TextEncoder().encode(formData.password).length>72){setFormError('La contraseña no puede superar 72 bytes');return;}
    setSaving(true);
    try {
      const { email: _email, password: _password, ...newAccount } = formData;
      const dataToSend = editing ? { especialidad: formData.especialidad, titulo_profesional: formData.titulo_profesional, fecha_ingreso: formData.fecha_ingreso, password: formData.password } : { ...newAccount, dni: formData.dni.trim() || null };
      if (editing) {
        await profesoresApi.update(editing.id, dataToSend);
        toast.success('Profesor actualizado');
      } else {
        const response = await profesoresApi.create(dataToSend);
        setCreatedCredentials(response.data.data?.credentials || null);
        toast.success('Profesor registrado');
      }
      setShowModal(false); setEditing(null); resetForm(); loadData();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'No se pudo guardar el profesor');
    }finally{setSaving(false);}
  };

  const handleDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await profesoresApi.delete(deleteId);
      toast.success('Profesor desactivado');
      setDeleteId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al desactivar profesor');
    } finally { setDeleting(false); }
  };

  const resetForm = () => {
    setFormError('');
    setFormData({ nombre: '', apellido: '', email: '', password: '', dni: '', telefono: '', direccion: '', especialidad: '', titulo_profesional: '', fecha_ingreso: '' });
    setShowPassword(false);
  };

  const openEdit = async (p: Profesor) => {
    setFormError('');
    setEditing(p);
    setFormData({ nombre: p.nombre, apellido: p.apellido, email: p.email, password: '', dni: p.dni || '', telefono: p.telefono || '', direccion: (p as any).direccion || '', especialidad: p.especialidad || '', titulo_profesional: p.titulo_profesional || '', fecha_ingreso: p.fecha_ingreso ? p.fecha_ingreso.split('T')[0] : '' });
    setShowPassword(false);
    setShowModal(true);
  };

  const actions = (p: Profesor) => <div className="person-actions flex flex-wrap gap-1">
    <button type="button" onClick={e=>{e.stopPropagation();navigate(`/profesores/${p.id}`);}} className="inline-flex items-center gap-2 rounded-lg px-2 text-sm text-primary-700 hover:bg-primary-50 dark:hover:bg-gray-800" aria-label={`Ver profesor ${p.nombre} ${p.apellido}`}><Eye className="h-4 w-4"/>Ver</button>
    <button type="button" onClick={e=>{e.stopPropagation();void openEdit(p);}} className="inline-flex items-center gap-2 rounded-lg px-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`Editar profesor ${p.nombre} ${p.apellido}`}><Edit className="h-4 w-4"/>Editar</button>
    <button type="button" disabled={!p.activo} onClick={e=>{e.stopPropagation();setDeleteId(p.id);}} className="rounded-lg px-2 text-red-600 disabled:opacity-40 dark:text-red-400" aria-label={`Desactivar profesor ${p.nombre} ${p.apellido}`}><Trash2 className="h-4 w-4"/></button>
  </div>;
  const columns = [
    { key: 'nombre', label: 'Nombre', render: (p: Profesor) => `${p.nombre} ${p.apellido}` },
    { key: 'email', label: 'Email' },
    { key: 'especialidad', label: 'Especialidad', render: (p: Profesor) => p.especialidad || 'Sin registrar' },
    { key: 'titulo_profesional', label: 'Título', render: (p: Profesor) => p.titulo_profesional || 'Sin registrar' },
    { key: 'activo', label: 'Estado', render: (p: Profesor) => <Badge variant={p.activo ? 'success' : 'danger'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'acciones', label: '', render: actions }
  ];

  return (
    <div className="people-directory mx-auto max-w-7xl space-y-5">
      <DirectoryHeader title="Profesores" description="Consulta los profesores activos y gestiona sus perfiles y asignaciones." total={total} loading={loading} error={loadError} refresh={()=>void loadData()}>
        <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuevo Profesor
        </button>
      </DirectoryHeader>
      <section className="card"><p className="mb-2 block text-sm font-medium">Buscar profesores</p><div><SearchInput value={search} onChange={value=>{setSearch(value);setPage(1);}} placeholder="Buscar profesor..." /></div></section>
      {loadError&&<div role="alert" className="card text-red-600 dark:text-red-400"><p>{loadError}</p><button className="btn-secondary mt-2" onClick={()=>void loadData()}>Reintentar</button></div>}
      {!loadError && <DataTable className="people-table" renderMobileCard={p=><PersonCard name={`${p.nombre} ${p.apellido}`} email={p.email} active={p.activo} fields={[['Especialidad',p.especialidad],['Título',p.titulo_profesional]]} actions={actions(p)}/>} columns={columns} data={profesores} page={page} totalPages={totalPages} total={total}
        onPageChange={setPage} onRowClick={(profesor) => navigate(`/profesores/${profesor.id}`)}
        isLoading={loading} emptyMessage="No se encontraron profesores" />}
      <Modal isOpen={showModal} className="people-dialog" onClose={() => { if(!saving){setShowModal(false); setEditing(null);} }} title={editing ? 'Editar Profesor' : 'Registrar Profesor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4"><fieldset disabled={saving} className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editing&&<DniLookupField id="teacher-dni-lookup" value={formData.dni} onChange={dni=>setFormData(f=>({...f,dni}))} onFound={p=>setFormData(f=>({...f,nombre:p.nombre,apellido:p.apellido}))}/>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input aria-label="Nombre" readOnly={!!editing} type="text" maxLength={100} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label><input aria-label="Apellido" readOnly={!!editing} type="text" maxLength={100} value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="input-field" required /></div>
            {editing ? <div><label className="block text-sm font-medium text-gray-700 mb-1">Usuario de acceso</label><input aria-label="Usuario de acceso" readOnly type="text" value={formData.email} className="input-field" /></div> : <p className="sm:col-span-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">El usuario institucional y la contraseña temporal se generarán al registrar la cuenta. No se crea un buzón de correo.</p>}
            {editing && <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {editing ? '(opcional)' : '*'}</label>
              <div className="relative">
                <input
                  aria-label="Contraseña" type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="input-field pr-10"
                  placeholder={editing ? 'Vacío para conservar la actual' : 'Mínimo 6 caracteres'}
                  autoComplete="new-password"
                  minLength={6}
                  required={!editing}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar contraseña escrita' : 'Mostrar contraseña escrita'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>}
            {editing&&<div><label className="block text-sm font-medium text-gray-700 mb-1">DNI</label><input aria-label="DNI" readOnly={!!editing} type="text" maxLength={20} value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="input-field" /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input aria-label="Teléfono" readOnly={!!editing} type="text" maxLength={20} value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="input-field" /></div>
            {!editing && <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input aria-label="Dirección" type="text" maxLength={500} value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="input-field" /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label><input aria-label="Especialidad" type="text" maxLength={200} value={formData.especialidad} onChange={e => setFormData({...formData, especialidad: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Título Profesional</label><input aria-label="Título Profesional" type="text" maxLength={200} value={formData.titulo_profesional} onChange={e => setFormData({...formData, titulo_profesional: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label><input aria-label="Fecha de Ingreso" type="date" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} className="input-field" /></div>
          </div>
          {editing&&<p className="text-sm text-gray-500">Nombre, apellido, correo, DNI y teléfono son de consulta aquí. Para corregirlos, usa Usuarios.</p>}
          <p className="text-sm text-gray-600">Los cursos, grados y periodos se asignan desde Estructura académica. Editar este perfil conserva esas asignaciones.</p>
          {editing&&<button type="button" className="btn-secondary" onClick={()=>navigate(`/admin/configuracion-academica?profesor_id=${editing.id}`)}>Gestionar asignaciones en Estructura</button>}
          </fieldset>
          {formError&&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="form-actions">
            <button type="button" disabled={saving} onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Guardando…':editing ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
      <CreatedCredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />
      <ConfirmDialog isOpen={deleteId !== null} onClose={() => {if(!deleting)setDeleteId(null);}} onConfirm={handleDelete} isLoading={deleting}
        title="Desactivar profesor" message="El profesor perderá acceso al sistema, pero se conservarán sus registros académicos y de pago." confirmLabel="Desactivar" />
    </div>
  );
}
