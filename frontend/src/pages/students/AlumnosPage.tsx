import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GraduationCap, Edit, Eye } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import { alumnosApi, cursosApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Alumno } from '../../types';
import toast from 'react-hot-toast';

export default function AlumnosPage() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', dni: '', telefono: '',
    fecha_nacimiento: '', genero: 'M', grado_id: '', seccion_id: ''
  });

  useEffect(() => {
    loadAlumnos();
  }, [page, debouncedSearch]);

  const loadAlumnos = async () => {
    setLoading(true);
    try {
      const res = await alumnosApi.getAll({ page, limit: 20, search: debouncedSearch });
      setAlumnos(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAlumno) {
        await alumnosApi.update(editingAlumno.id, formData);
        toast.success('Alumno actualizado');
      } else {
        await alumnosApi.create(formData);
        toast.success('Alumno registrado');
      }
      setShowModal(false);
      setEditingAlumno(null);
      resetForm();
      loadAlumnos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '', apellido: '', email: '', dni: '', telefono: '',
      fecha_nacimiento: '', genero: 'M', grado_id: '', seccion_id: ''
    });
  };

  const openEdit = (alumno: Alumno) => {
    setEditingAlumno(alumno);
    setFormData({
      nombre: alumno.nombre, apellido: alumno.apellido, email: alumno.email,
      dni: alumno.dni || '', telefono: alumno.telefono || '',
      fecha_nacimiento: alumno.fecha_nacimiento || '', genero: alumno.genero || 'M',
      grado_id: '', seccion_id: ''
    });
    setShowModal(true);
  };

  const columns = [
    { key: 'codigo_alumno', label: 'Código', render: (a: Alumno) => <span className="font-mono text-xs">{a.codigo_alumno}</span> },
    { key: 'nombre', label: 'Nombre', render: (a: Alumno) => `${a.nombre} ${a.apellido}` },
    { key: 'email', label: 'Email' },
    { key: 'grado', label: 'Grado', render: (a: Alumno) => a.grado ? `${a.grado} - ${a.seccion}` : '-' },
    { key: 'estado', label: 'Estado', render: (a: Alumno) => (
      <Badge variant={a.estado === 'matriculado' ? 'success' : a.estado === 'retirado' ? 'danger' : 'info'}>
        {a.estado}
      </Badge>
    )},
    { key: 'acciones', label: 'Acciones', render: (a: Alumno) => (
      <div className="flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/alumnos/${a.id}`); }}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(a); }}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded">
          <Edit className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno..." className="w-full sm:w-80" />
        <button onClick={() => { resetForm(); setEditingAlumno(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuevo Alumno
        </button>
      </div>

      <DataTable
        columns={columns}
        data={alumnos}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        onRowClick={(a) => navigate(`/alumnos/${a.id}`)}
        isLoading={loading}
        emptyMessage="No se encontraron alumnos"
      />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingAlumno(null); }}
        title={editingAlumno ? 'Editar Alumno' : 'Registrar Alumno'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input type="text" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})} className="input-field">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowModal(false); setEditingAlumno(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editingAlumno ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
