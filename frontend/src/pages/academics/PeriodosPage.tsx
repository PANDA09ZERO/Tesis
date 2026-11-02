import PageHeading from '../../components/ui/PageHeading';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { periodosApi } from '../../api/endpoints';
import type { PeriodoAcademico } from '../../types';
import toast from 'react-hot-toast';

export default function PeriodosPage() {
  const {user} = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'}).format(new Date());
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PeriodoAcademico | null>(null);
  const [formData, setFormData] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', activo: false });

  const validActivation = Boolean(formData.fecha_inicio && formData.fecha_fin && formData.fecha_inicio <= today && today <= formData.fecha_fin);

  useEffect(() => { loadPeriodos(); }, []);

  const loadPeriodos = async () => {
    setLoading(true);setError('');
    try { const res = await periodosApi.getAll(); setPeriodos(res.data.data || []); }
    catch (error:any) { setError(error.response?.data?.message || 'No se pudieron cargar los periodos'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(saving)return;
    if(!formData.nombre.trim()||formData.fecha_inicio>formData.fecha_fin){toast.error('Revisa el nombre y el orden de las fechas');return;}
    if(formData.activo && !validActivation){toast.error('Solo puedes activar un periodo dentro de sus fechas (hora de Lima)');return;}
    setSaving(true);
    try {
      if (editing) { await periodosApi.update(editing.id, { ...formData, activo: formData.activo ? 1 : 0 }); toast.success('Periodo actualizado'); }
      else { await periodosApi.create({ ...formData, activo: formData.activo ? 1 : 0 }); toast.success('Periodo creado'); }
      setShowModal(false); setEditing(null); loadPeriodos();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); } finally {setSaving(false);}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este periodo?')) return;
    try { await periodosApi.delete(id); toast.success('Eliminado'); loadPeriodos(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <PageHeading title="Periodos académicos" description="Consulta los calendarios vigentes e históricos y el detalle de cada periodo."/>
      {error&&<div role="alert" className="card text-red-600">{error}<button onClick={loadPeriodos} className="btn-secondary ml-3">Reintentar</button></div>}
      {loading&&<p role="status">Cargando periodos…</p>}
      {isAdmin && <div className="flex justify-end">
        <button onClick={() => { setFormData({ nombre: '', fecha_inicio: '', fecha_fin: '', activo: false }); setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Periodo
        </button>
      </div>}

      {!loading && !error && !periodos.length && <div className="card text-gray-500">No hay periodos disponibles.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periodos.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{p.nombre}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {p.fecha_inicio.slice(0,10).split('-').reverse().join('/')} - {p.fecha_fin.slice(0,10).split('-').reverse().join('/')}
                </p>
              </div>
              {p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="default">Inactivo</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link to={`/periodos/${p.id}`} className="btn-secondary text-xs py-1 px-2" aria-label={`Ver detalle de ${p.nombre}`}>Ver detalle</Link>
              {isAdmin && <>
              <button onClick={() => { setEditing(p); setFormData({ nombre: p.nombre, fecha_inicio: p.fecha_inicio.slice(0,10), fecha_fin: p.fecha_fin.slice(0,10), activo: !!p.activo }); setShowModal(true); }}
                className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Edit className="w-3 h-3" /> Editar</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs py-1 px-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Eliminar
              </button></>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isAdmin && showModal} onClose={() => {if(!saving)setShowModal(false);}} title={editing ? 'Editar Periodo' : 'Nuevo Periodo'}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label htmlFor="period-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input id="period-name" type="text" maxLength={100} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="input-field" placeholder="Ej: 2024-I" required /></div>
              {!loading && !error && !periodos.length && <div className="card text-gray-500">No hay periodos disponibles.</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label htmlFor="period-start" className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
                  <input id="period-start" type="date" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="input-field" required /></div>
                <div><label htmlFor="period-end" className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
                  <input id="period-end" type="date" value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} className="input-field" required /></div>
              </div>
              <label className="flex items-center gap-2">
                <input disabled={saving || (!validActivation && !formData.activo)} type="checkbox" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="rounded" />
                <span className="text-sm text-gray-700">Periodo activo (desactiva otros)</span>
              </label>
              {!validActivation && <p className="text-sm text-amber-700">Hoy ({today.split('-').reverse().join('/')}) no está dentro del rango indicado. Puedes guardar el periodo inactivo.</p>}
              <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row sm:gap-3">
                <button type="button" disabled={saving} onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
