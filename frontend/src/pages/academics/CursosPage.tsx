import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Star, BookOpen, Plus, Edit, Trash2, Users, CalendarDays } from 'lucide-react';
import { configuracionApi, cursosApi, gradosApi } from '../../api/endpoints';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { Curso, OfertaAcademica } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePeriodo } from '../../context/PeriodoContext';

export default function CursosPage() {
  const { user } = useAuth();
  const canManageCourses = user?.rol === 'administrador';
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ofertas, setOfertas] = useState<OfertaAcademica[]>([]);
  // Contexto global de periodo académico (vigente por defecto)
  const { periodoId } = usePeriodo();
  const [vista, setVista] = useState<'ofertas' | 'catalogo'>('ofertas');
  const [loading, setLoading] = useState(true);
  const [loadingOfertas, setLoadingOfertas] = useState(true);
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

  useEffect(() => {
    if (!periodoId) return;
    setLoadingOfertas(true);
    configuracionApi.getOfertas({
      periodo_id: Number(periodoId),
      grado_id: gradoId ? Number(gradoId) : undefined,
      nivel: nivel || undefined,
      search: search || undefined
    }).then(response => setOfertas(response.data.data || []))
      .catch(() => {
        setOfertas([]);
        toast.error('No se pudieron cargar las ofertas académicas');
      })
      .finally(() => setLoadingOfertas(false));
  }, [periodoId, gradoId, nivel, search]);

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

  const cursosToShow = cursos;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Cursos y ofertas académicas</h1>
            <p className="text-sm text-gray-500 mt-1">El catálogo define los cursos. Las ofertas y sus docentes se configuran una sola vez en Estructura académica.</p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center lg:gap-3">{canManageCourses&&<button className="btn-secondary" onClick={()=>navigate(`/admin/configuracion-academica?periodo_id=${periodoId}${gradoId?`&grado_id=${gradoId}`:''}`)}>Gestionar estructura</button>}
            <select
              className="input-field lg:w-auto"
              onChange={(e) => handleNivelChange(e.target.value)}
              value={nivel}
            >
              <option value="">Todos los niveles</option>
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
            <select
              className="input-field lg:w-auto"
              onChange={(e) => handleGradoChange(e.target.value)}
              value={gradoId}
            >
              <option value="">Todos los grados</option>
              {gradosFiltrados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            {canManageCourses && vista === 'catalogo' && <button
              onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
              className="btn-primary col-span-full flex items-center gap-2 lg:col-span-1"
            >
              <Plus className="w-4 h-4" /> Nuevo Curso
            </button>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        <button onClick={() => setVista('ofertas')} className={`px-4 py-2 text-sm font-medium ${vista === 'ofertas' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}>
          Ofertas académicas
        </button>
        <button onClick={() => setVista('catalogo')} className={`px-4 py-2 text-sm font-medium ${vista === 'catalogo' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}>
          Catálogo de cursos
        </button>
      </div>
      {vista === 'ofertas' && (loadingOfertas ? (
        <div className="card animate-pulse h-40" />
      ) : ofertas.length === 0 ? (
        <div className="card py-10 text-center text-gray-500">No hay ofertas configuradas para este periodo y filtros.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ofertas.map(oferta => (
            <button key={oferta.periodo_grado_curso_id} onClick={() => navigate(`/cursos/oferta/${oferta.periodo_grado_curso_id}`)} className="card text-left hover:border-primary-400 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-500">{oferta.codigo || `CUR-${oferta.curso_id}`}</p>
                  <h3 className="mt-1 font-semibold text-gray-900">{oferta.curso}</h3>
                  <p className="mt-1 text-sm text-gray-600">{oferta.nivel} · {oferta.grado}</p>
                  <p className="mt-1 text-xs text-gray-500">{oferta.periodo}</p>
                </div>
                <BookOpen className="h-5 w-5 shrink-0 text-primary-600" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {oferta.alumnos_count || 0} alumnos</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Ver oferta</span>
              </div>
            </button>
          ))}
        </div>
      ))}
      {vista === 'catalogo' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                {(curso as any).profesores && (curso as any).profesores.length > 0
                  ? `Prof. ${(curso as any).profesores[0].nombre} ${(curso as any).profesores[0].apellido}`
                  : curso.descripcion || 'Sin profesor asignado'}
              </p>
              {canManageCourses && <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
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
              </div>}
            </div>
          </div>
        ))}
      </div>}

      {canManageCourses && <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Curso' : 'Nuevo Curso'} size="md">
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
          <div className="form-actions">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>}

      {canManageCourses && <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Curso"
        message="¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer."
      />}
    </div>
  );
}
