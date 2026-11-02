import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Plus, Filter, Send } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { notificacionesApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function NotificacionesPage() {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loadError,setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLeida, setFiltroLeida] = useState('');
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [showMassiveModal, setShowMassiveModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    titulo: '', mensaje: '', tipo: 'info', link: '', prioridad: 'normal'
  });
  const [massiveData, setMassiveData] = useState({
    titulo: '', mensaje: '', tipo: 'info', link: '', prioridad: 'normal', rol_ids: [] as number[]
  });

  useEffect(() => { loadData(); }, [page, debouncedSearch, filtroTipo, filtroLeida]);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      const params: any = { page, limit: 20, search: debouncedSearch };
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroLeida) params.leida = filtroLeida;
      const res = await notificacionesApi.getAll(params);
      setNotificaciones(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error: any) {
      setLoadError(error.response?.data?.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await notificacionesApi.create(formData);
      toast.success('Notificación creada');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear notificación');
    }
  };

  const handleMassiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await notificacionesApi.enviarMasiva(massiveData);
      toast.success('Notificación enviada masivamente');
      setShowMassiveModal(false);
      resetMassiveForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar notificación');
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificacionesApi.marcarLeida(id);
      toast.success('Notificación marcada como leída');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificacionesApi.marcarTodasLeidas();
      toast.success('Todas las notificaciones marcadas como leídas');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notificacionesApi.delete(deleteId);
      toast.success('Notificación eliminada');
      setDeleteId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const resetForm = () => {
    setFormData({ titulo: '', mensaje: '', tipo: 'info', link: '', prioridad: 'normal' });
  };

  const resetMassiveForm = () => {
    setMassiveData({ titulo: '', mensaje: '', tipo: 'info', link: '', prioridad: 'normal', rol_ids: [] });
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'alerta': return 'danger';
      default: return 'info';
    }
  };

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'default';
      case 'normal': return 'info';
      case 'alta': return 'warning';
      case 'urgente': return 'danger';
      default: return 'default';
    }
  };

  const columns = [
    { key: 'titulo', label: 'Título', render: (n: any) => (
      <div className="flex items-center gap-2">
        {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
        <span className={n.leida ? 'text-gray-500' : 'font-medium'}>{n.titulo}</span>
      </div>
    )},
    { key: 'mensaje', label: 'Mensaje', render: (n: any) => <span className="text-sm text-gray-600 truncate max-w-xs">{n.mensaje}</span> },
    { key: 'tipo', label: 'Tipo', render: (n: any) => <Badge variant={getTipoBadge(n.tipo) as any}>{n.tipo}</Badge> },
    { key: 'prioridad', label: 'Prioridad', render: (n: any) => <Badge variant={getPrioridadBadge(n.prioridad) as any}>{n.prioridad}</Badge> },
    { key: 'usuario_nombre', label: 'Destinatario', render: (n: any) => n.usuario_nombre ? `${n.usuario_nombre} ${n.usuario_apellido}` : 'Todos' },
    { key: 'created_at', label: 'Fecha', render: (n: any) => new Date(n.created_at).toLocaleString() },
    { key: 'acciones', label: '', render: (n: any) => (
      <div className="flex gap-1">
        {!n.leida && (
          <button onClick={() => handleMarkAsRead(n.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Marcar como leída">
            <Check className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => setDeleteId(n.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  if (loadError) return <div className="card text-red-600" role="alert">{loadError}<button className="btn-secondary ml-3" onClick={loadData}>Reintentar</button></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-900">Centro de Notificaciones</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.rol === 'administrador' && (
            <>
              <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-secondary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nueva
              </button>
              <button onClick={() => { resetMassiveForm(); setShowMassiveModal(true); }} className="btn-primary flex items-center gap-2">
                <Send className="w-4 h-4" /> Enviar Masiva
              </button>
            </>
          )}
          <button onClick={handleMarkAllAsRead} className="btn-secondary flex items-center gap-2">
            <Check className="w-4 h-4" /> Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar notificación..." className="w-full sm:w-64" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input-field w-40">
            <option value="">Todos los tipos</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="alerta">Alerta</option>
          </select>
          <select value={filtroLeida} onChange={e => setFiltroLeida(e.target.value)} className="input-field w-40">
            <option value="">Todos los estados</option>
            <option value="false">No leídas</option>
            <option value="true">Leídas</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={notificaciones}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No hay notificaciones"
      />

      {/* Modal Nueva Notificación */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Notificación" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
            <textarea value={formData.mensaje} onChange={e => setFormData({...formData, mensaje: e.target.value})} className="input-field" rows={3} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="input-field">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="alerta">Alerta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})} className="input-field">
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (opcional)</label>
            <input type="text" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="input-field" placeholder="https://..." />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear</button>
          </div>
        </form>
      </Modal>

      {/* Modal Notificación Masiva */}
      <Modal isOpen={showMassiveModal} onClose={() => setShowMassiveModal(false)} title="Enviar Notificación Masiva" size="md">
        <form onSubmit={handleMassiveSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" value={massiveData.titulo} onChange={e => setMassiveData({...massiveData, titulo: e.target.value})} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
            <textarea value={massiveData.mensaje} onChange={e => setMassiveData({...massiveData, mensaje: e.target.value})} className="input-field" rows={3} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={massiveData.tipo} onChange={e => setMassiveData({...massiveData, tipo: e.target.value})} className="input-field">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="alerta">Alerta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select value={massiveData.prioridad} onChange={e => setMassiveData({...massiveData, prioridad: e.target.value})} className="input-field">
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roles Destinatarios *</label>
            <div className="space-y-2">
              {[1, 2, 3, 4].map(rol => (
                <label key={rol} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={massiveData.rol_ids.includes(rol)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMassiveData({...massiveData, rol_ids: [...massiveData.rol_ids, rol]});
                      } else {
                        setMassiveData({...massiveData, rol_ids: massiveData.rol_ids.filter(r => r !== rol)});
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {rol === 1 ? 'Administradores' : rol === 2 ? 'Profesores' : rol === 3 ? 'Alumnos' : 'Apoderados'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (opcional)</label>
            <input type="text" value={massiveData.link} onChange={e => setMassiveData({...massiveData, link: e.target.value})} className="input-field" placeholder="https://..." />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowMassiveModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Enviar Masivamente</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar Notificación" message="¿Está seguro de eliminar esta notificación?" />
    </div>
  );
}