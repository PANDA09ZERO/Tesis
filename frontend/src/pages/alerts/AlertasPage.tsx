import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/ui/SearchInput';
import { alertasApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Alerta } from '../../types';
import toast from 'react-hot-toast';

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('activa');
  const [filtroRiesgo, setFiltroRiesgo] = useState('');
  const [stats, setStats] = useState<any>(null);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();

  useEffect(() => { loadAlertas(); loadStats(); }, [page, filtroEstado, filtroRiesgo]);

  const loadAlertas = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, estado: filtroEstado };
      if (filtroRiesgo) params.tipo_riesgo = filtroRiesgo;
      const res = await alertasApi.getAll(params);
      setAlertas(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try { const res = await alertasApi.getEstadisticas(); setStats(res.data.data); } catch (error) {}
  };

  const handleEstado = async (id: number, estado: string) => {
    try { await alertasApi.updateEstado(id, estado); toast.success('Alerta actualizada'); loadAlertas(); loadStats(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const getRiesgoColor = (tipo: string) => {
    switch (tipo) {
      case 'alto': return 'bg-red-50 border-red-200';
      case 'medio': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.activas || 0}</p>
            <p className="text-xs text-gray-500">Alertas Activas</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.alto_riesgo || 0}</p>
            <p className="text-xs text-gray-500">Alto Riesgo</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.medio_riesgo || 0}</p>
            <p className="text-xs text-gray-500">Medio Riesgo</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.bajo_riesgo || 0}</p>
            <p className="text-xs text-gray-500">Bajo Riesgo</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-field w-44">
          <option value="activa">Activas</option>
          <option value="atendida">Atendidas</option>
          <option value="resuelta">Resueltas</option>
          <option value="">Todas</option>
        </select>
        <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)} className="input-field w-44">
          <option value="">Todos los niveles</option>
          <option value="alto">Alto Riesgo</option>
          <option value="medio">Medio Riesgo</option>
          <option value="bajo">Bajo Riesgo</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-32" />)
        ) : alertas.length === 0 ? (
          <div className="card text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay alertas {filtroEstado === 'activa' ? 'activas' : ''}</p>
          </div>
        ) : (
          alertas.map(alerta => (
            <div key={alerta.id} className={`card border-l-4 ${getRiesgoColor(alerta.tipo_riesgo)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={alerta.tipo_riesgo === 'alto' ? 'danger' : alerta.tipo_riesgo === 'medio' ? 'warning' : 'success'}>
                      Riesgo {alerta.tipo_riesgo?.toUpperCase()}
                    </Badge>
                    <Badge variant="default">{alerta.estado}</Badge>
                  </div>
                  <h4 className="font-semibold text-gray-900">{alerta.alumno_nombre} {alerta.alumno_apellido}</h4>
                  <p className="text-sm text-gray-500">{alerta.codigo_alumno} - {alerta.grado} {alerta.seccion}</p>
                  <p className="text-sm text-gray-600 mt-1">{alerta.descripcion}</p>
                  {alerta.recomendacion && (
                    <p className="text-sm text-blue-600 mt-1 italic">Recomendación: {alerta.recomendacion}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(alerta.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {alerta.estado === 'activa' && (
                    <>
                      <button onClick={() => handleEstado(alerta.id, 'atendida')} className="btn-secondary text-xs py-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Atender
                      </button>
                      <button onClick={() => handleEstado(alerta.id, 'resuelta')} className="btn-success text-xs py-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Resolver
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-primary-600 text-white' : 'hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}