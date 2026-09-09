import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usersApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { User } from '../../types';
import toast from 'react-hot-toast';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filtroRol, setFiltroRol] = useState('');
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '', password: '', nombre: '', apellido: '', dni: '', telefono: '',
    fecha_nacimiento: '', genero: 'M', rol_id: '4'
  });

  useEffect(() => { loadData(); }, [page, debouncedSearch, filtroRol]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, search: debouncedSearch };
      if (filtroRol) params.rol = filtroRol;
      const res = await usersApi.getAll(params);
      setUsuarios(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await usersApi.update(editing.id, formData); toast.success('Usuario actualizado'); }
      else { await usersApi.create(formData); toast.success('Usuario creado'); }
      setShowModal(false); setEditing(null); resetForm(); loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await usersApi.delete(deleteId); toast.success('Usuario desactivado'); setDeleteId(null); loadData(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const resetForm = () => setFormData({ email: '', password: '', nombre: '', apellido: '', dni: '', telefono: '', fecha_nacimiento: '', genero: 'M', rol_id: '4' });

  const openEdit = (u: User) => {
    setEditing(u);
    setFormData({
      email: u.email, password: '', nombre: u.nombre, apellido: u.apellido,
      dni: (u as any).dni || '', telefono: (u as any).telefono || '',
      fecha_nacimiento: (u as any).fecha_nacimiento || '', genero: (u as any).genero || 'M', rol_id: '4'
    });
    setShowModal(true);
  };

  const getRolBadge = (rol: string) => {
    switch (rol) {
      case 'administrador': return 'danger';
      case 'profesor': return 'info';
      case 'alumno': return 'success';
      default: return 'default';
    }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (u: User) => `${u.nombre} ${u.apellido}` },
    { key: 'email', label: 'Email' },
    { key: 'rol', label: 'Rol', render: (u: User) => <Badge variant={getRolBadge(u.rol) as any}>{u.rol}</Badge> },
    { key: 'activo', label: 'Estado', render: (u: User) => <Badge variant={(u as any).activo ? 'success' : 'danger'}>{(u as any).activo ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'acciones', label: '', render: (u: User) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(u); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(u.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuario..." className="w-full sm:w-64" />
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} className="input-field w-40">
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="profesor">Profesor</option>
            <option value="alumno">Alumno</option>
            <option value="apoderado">Apoderado</option>
          </select>
        </div>
        <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <DataTable columns={columns} data={usuarios} page={page} totalPages={totalPages} total={total}
        onPageChange={setPage} isLoading={loading} emptyMessage="No hay usuarios" />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label><input type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" required /></div>
            {!editing && <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" placeholder="123456" /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">DNI</label><input type="text" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label><input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})} className="input-field">
                <option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select value={formData.rol_id} onChange={e => setFormData({...formData, rol_id: e.target.value})} className="input-field" required>
                <option value="1">Administrador</option><option value="2">Profesor</option><option value="3">Alumno</option><option value="4">Apoderado</option>
              </select></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Desactivar Usuario" message="¿Está seguro de desactivar este usuario? No podrá acceder al sistema." confirmLabel="Desactivar" />
    </div>
  );
}