import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { periodosApi } from '../../api/endpoints';
import type { PeriodoAcademico } from '../../types';
import toast from 'react-hot-toast';

export default function PeriodosPage() {
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PeriodoAcademico | null>(null);
  const [formData, setFormData] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', activo: false });

  useEffect(() => { loadPeriodos(); }, []);

  const loadPeriodos = async () => {
    try { const res = await periodosApi.getAll(); setPeriodos(res.data.data || []); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await periodosApi.update(editing.id, { ...formData, activo: formData.activo ? 1 : 0 }); toast.success('Periodo actualizado'); }
      else { await periodosApi.create({ ...formData, activo: formData.activo ? 1 : 0 }); toast.success('Periodo creado'); }
      setShowModal(false); setEditing(null); loadPeriodos();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este periodo?')) return;
    try { await periodosApi.delete(id); toast.success('Eliminado'); loadPeriodos(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setFormData({ nombre: '', fecha_inicio: '', fecha_fin: '', activo: false }); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Periodo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periodos.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{p.nombre}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(p.fecha_inicio).toLocaleDateString()} - {new Date(p.fecha_fin).toLocaleDateString()}
                </p>
              </div>
              {p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="default">Inactivo</Badge>}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setEditing(p); setFormData({ nombre: p.nombre, fecha_inicio: p.fecha_inicio, fecha_fin: p.fecha_fin, activo: !!p.activo }); setShowModal(true); }}
                className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Edit className="w-3 h-3" /> Editar</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs py-1 px-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar Periodo' : 'Nuevo Periodo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" placeholder="Ej: 2024-I" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
                  <input type="date" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
                  <input type="date" value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} className="input-field" required /></div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="rounded" />
                <span className="text-sm text-gray-700">Periodo activo (desactiva otros)</span>
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
