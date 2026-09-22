import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Star, BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import { cursosApi, gradosApi } from '../../api/endpoints';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { Curso } from '../../types';
import toast from 'react-hot-toast';

export default function CursosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [grados, setGrados] = useState<any[]>([]);
  const search = searchParams.get('search') || '';
  const gradoId = searchParams.get('grado_id') || '';
  const nivel = searchParams.get('nivel') || '';
  const pageParam = parseInt(new URLSearchParams(location.search).get('page') || '1');
  const [page, setPage] = useState(pageParam);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', codigo: '', descripcion: '', nivel: '', grado_id: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (gradoId) params.grado_id = gradoId;
      if (nivel) params.nivel = nivel;
      const res = await cursosApi.getAll(params);
      setCursos(res.data?.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, gradoId, nivel]);

  const loadGrados = async () => {
    try {
      const res = await gradosApi.getAll();
      setGrados(res.data.data || []);
    } catch (error) {
      console.error('Error loading grados:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadGrados();
  }, [loadData]);

  const handleGradoChange = (newGradoId: string) => {
    const params: any = { page: '1' };
    if (search) params.search = search;
    if (nivel) params.nivel = nivel;
    if (newGradoId) params.grado_id = newGradoId;
    setSearchParams(params);
  };

  const handleNivelChange = (newNivel: string) => {
    const params: any = { page: '1' };
    if (search) params.search = search;
    if (newNivel) params.nivel = newNivel;
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params: any = { page: newPage.toString() };
    if (search) params.search = search;
    if (gradoId) params.grado_id = gradoId;
    if (nivel) params.nivel = nivel;
    setSearchParams(params);
  };

  const gradosFiltrados = nivel ? grados.filter(g => g.nivel === nivel) : grados;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        nombre: formData.nombre,
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        grado_id: formData.grado_id ? parseInt(formData.grado_id) : null
      };
      if (editing) {
        await cursosApi.update(editing.id, dataToSend);
        toast.success('Curso actualizado');
      } else {
        await cursosApi.create(dataToSend);
        toast.success('Curso creado');
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', codigo: '', descripcion: '', nivel: '', grado_id: '' });
  };

  const openEdit = (curso: Curso) => {
    setEditing(curso);
    setFormData({
      nombre: curso.nombre,
      codigo: curso.codigo || '',
      descripcion: curso.descripcion || '',
      nivel: (curso as any).nivel || '',
      grado_id: curso.grado_id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await cursosApi.delete(deleteId);
      toast.success('Curso eliminado');
      setDeleteId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const dummyCursos: Curso[] = [
    { id: 1, nombre: 'MATEMÁTICAS IV', codigo: 'MAT-4', estado: 'Abierto', descripcion: 'Ing. María García', grado_id: 1 },
    { id: 2, nombre: 'COMUNICACIÓN IV', codigo: 'COM-4', estado: 'Abierto', descripcion: 'Lic. Carlos Pérez', grado_id: 1 },
    { id: 3, nombre: 'CIENCIA Y TECNOLOGÍA', codigo: 'CYT-4', estado: 'Abierto', descripcion: 'Dr. Luis Romero', grado_id: 1 },
    { id: 4, nombre: 'HISTORIA IV', codigo: 'HIS-4', estado: 'Abierto', descripcion: 'Lic. Ana López', grado_id: 1 },
    { id: 5, nombre: 'INGLÉS IV', codigo: 'ING-4', estado: 'Abierto', descripcion: 'Sra. Patricia Díaz', grado_id: 1 },
    { id: 6, nombre: 'ARTE IV', codigo: 'ART-4', estado: 'Abierto', descripcion: 'Prof. Juan Torres', grado_id: 1 },
    { id: 7, nombre: 'EDUCACIÓN FÍSICA IV', codigo: 'EF-4', estado: 'Abierto', descripcion: 'Prof. Miguel Soto', grado_id: 1 },
    { id: 8, nombre: 'FILOSOFÍA IV', codigo: 'FIL-4', estado: 'Cerrado', descripcion: 'Lic. Rosa Velez', grado_id: 1 },
  ];

  const cursosToShow = cursos.length > 0 ? cursos : dummyCursos;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">2026-II — Formación Profesional</h2>
            <p className="text-sm text-gray-500 mt-1">Cursos del período académico vigente</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer"
              onChange={(e) => handleNivelChange(e.target.value)}
              value={nivel}
            >
              <option value="">Todos los niveles</option>
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
            <select
              className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer"
              onChange={(e) => handleGradoChange(e.target.value)}
              value={gradoId}
            >
              <option value="">Todos los grados</option>
              {gradosFiltrados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            <button
              onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Curso
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cursosToShow.map((curso) => (
          <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="h-36 overflow-hidden relative bg-gray-200 flex items-center justify-center cursor-pointer" onClick={() => navigate(`/cursos/${curso.id}`)}>
              <span className="text-6xl">📚</span>
              <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full ${
                curso.estado === 'Abierto' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {curso.estado || 'Abierto'}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400">{curso.codigo || `CUR-${curso.id}`}</span>
              </div>
              <h3 className="font-bold text-sm text-gray-900 uppercase mb-2 line-clamp-2 cursor-pointer hover:text-primary-600" onClick={() => navigate(`/cursos/${curso.id}`)}>{curso.nombre}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Grado {curso.grado_nombre || curso.grado_id || '?'}</span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs text-gray-500">Favorito</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {curso.descripcion || 'Profesor'}
              </p>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(curso); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(curso.id); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Curso' : 'Nuevo Curso'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input
              type="text"
              value={formData.codigo}
              onChange={e => setFormData({...formData, codigo: e.target.value})}
              className="input-field"
              placeholder="Ej: MAT-4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              className="input-field"
              rows={3}
              placeholder="Descripción del curso..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
            <select
              value={formData.nivel}
              onChange={e => setFormData({...formData, nivel: e.target.value, grado_id: ''})}
              className="input-field"
            >
              <option value="">Sin nivel</option>
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
            <select
              value={formData.grado_id}
              onChange={e => setFormData({...formData, grado_id: e.target.value})}
              className="input-field"
              disabled={!formData.nivel}
            >
              <option value="">Sin grado</option>
              {formData.nivel ? grados.filter(g => g.nivel === formData.nivel).map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              )) : grados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            {!formData.nivel && <small className="text-gray-500">Seleccione un nivel primero</small>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Curso"
        message="¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer."
      />
    </div>
  );
}
