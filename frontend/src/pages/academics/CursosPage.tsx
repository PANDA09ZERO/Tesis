import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { cursosApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Curso } from '../../types';
import toast from 'react-hot-toast';

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nombre: '', codigo: '', descripcion: '' });

  useEffect(() => { loadData(); }, [page, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await cursosApi.getAll({ page, limit: 20, search: debouncedSearch });
      setCursos(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await cursosApi.update(editing.id, formData); toast.success('Curso actualizado'); }
      else { await cursosApi.create(formData); toast.success('Curso creado'); }
      setShowModal(false); setEditing(null); setFormData({ nombre: '', codigo: '', descripcion: '' }); loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await cursosApi.delete(deleteId); toast.success('Curso eliminado'); setDeleteId(null); loadData(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'codigo', label: 'Código', render: (c: Curso) => <span className="font-mono text-xs">{c.codigo || '-'}</span> },
    { key: 'nombre', label: 'Nombre' },
    { key: 'grado_nombre', label: 'Grado', render: (c: Curso) => c.grado_nombre || '-' },
    { key: 'acciones', label: '', render: (c: Curso) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(c); setFormData({ nombre: c.nombre, codigo: c.codigo || '', descripcion: c.descripcion || '' }); setShowModal(true); }}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
          className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar curso..." className="w-full sm:w-80" />
        <button onClick={() => { setFormData({ nombre: '', codigo: '', descripcion: '' }); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Curso
        </button>
      </div>
      <DataTable columns={columns} data={cursos} page={page} totalPages={totalPages} total={total} onPageChange={setPage} isLoading={loading} emptyMessage="No hay cursos" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Curso' : 'Nuevo Curso'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Código</label><input type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar Curso" message="¿Está seguro de eliminar este curso? Esta acción no se puede deshacer." />
    </div>
  );
}
