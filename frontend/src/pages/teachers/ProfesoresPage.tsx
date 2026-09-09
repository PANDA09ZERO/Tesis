import React, { useEffect, useState } from 'react';
import { Plus, Edit, Users } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import { profesoresApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Profesor } from '../../types';
import toast from 'react-hot-toast';

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profesor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', dni: '', telefono: '',
    especialidad: '', titulo_profesional: '', fecha_ingreso: ''
  });

  useEffect(() => { loadData(); }, [page, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await profesoresApi.getAll({ page, limit: 20, search: debouncedSearch });
      setProfesores(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await profesoresApi.update(editing.id, formData);
        toast.success('Profesor actualizado');
      } else {
        await profesoresApi.create(formData);
        toast.success('Profesor registrado');
      }
      setShowModal(false); setEditing(null); resetForm(); loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const resetForm = () => setFormData({ nombre: '', apellido: '', email: '', dni: '', telefono: '', especialidad: '', titulo_profesional: '', fecha_ingreso: '' });

  const openEdit = (p: Profesor) => {
    setEditing(p);
    setFormData({ nombre: p.nombre, apellido: p.apellido, email: p.email, dni: p.dni || '', telefono: p.telefono || '', especialidad: p.especialidad || '', titulo_profesional: p.titulo_profesional || '', fecha_ingreso: p.fecha_ingreso || '' });
    setShowModal(true);
  };

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (p: Profesor) => `${p.nombre} ${p.apellido}` },
    { key: 'email', label: 'Email' },
    { key: 'especialidad', label: 'Especialidad', render: (p: Profesor) => p.especialidad || '-' },
    { key: 'titulo_profesional', label: 'Título', render: (p: Profesor) => p.titulo_profesional || '-' },
    { key: 'activo', label: 'Estado', render: (p: Profesor) => <Badge variant={p.activo ? 'success' : 'danger'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'acciones', label: '', render: (p: Profesor) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <Edit className="w-4 h-4" />
      </button>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar profesor..." className="w-full sm:w-80" />
        <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuevo Profesor
        </button>
      </div>
      <DataTable columns={columns} data={profesores} page={page} totalPages={totalPages} total={total}
        onPageChange={setPage} isLoading={loading} emptyMessage="No se encontraron profesores" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Profesor' : 'Registrar Profesor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label><input type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">DNI</label><input type="text" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label><input type="text" value={formData.especialidad} onChange={e => setFormData({...formData, especialidad: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Título Profesional</label><input type="text" value={formData.titulo_profesional} onChange={e => setFormData({...formData, titulo_profesional: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label><input type="date" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
