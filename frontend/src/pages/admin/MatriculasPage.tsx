import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FileText, Users, TrendingUp } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatCard from '../../components/ui/StatCard';
import { matriculasApi, alumnosApi, gradosApi, cursosApi, configuracionApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { usePeriodo } from '../../context/PeriodoContext';
import toast from 'react-hot-toast';

export default function MatriculasPage() {
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const { periodoId: periodoFilter, setPeriodoId: setPeriodoFilter, periodos } = usePeriodo();

  // Datos para formularios
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [grados, setGrados] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [cursosDelGrado, setCursosDelGrado] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    alumno_id: '', curso_id: '', periodo_academico_id: '', grado_id: '', observaciones: '',
    auto_cursos: true
  });

  // Cuando se elige grado y periodo (sin curso concreto), se muestran
  // los cursos que se inscribirán automáticamente según la configuración
  useEffect(() => {
    const cargarCursosDelGrado = async () => {
      if (!formData.grado_id || !formData.periodo_academico_id || formData.curso_id) {
        setCursosDelGrado([]);
        return;
      }
      try {
        const res = await configuracionApi.getCursosDeGrado(
          Number(formData.periodo_academico_id),
          Number(formData.grado_id)
        );
        setCursosDelGrado(res.data.data || []);
      } catch (error) {
        console.error(error);
        setCursosDelGrado([]);
      }
    };
    cargarCursosDelGrado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.grado_id, formData.periodo_academico_id, formData.curso_id]);

  useEffect(() => { loadReferencias(); }, []);
  useEffect(() => { setPage(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodoFilter]);
  useEffect(() => { loadData(); loadEstadisticas(); }, [page, periodoFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await matriculasApi.getAll({ page, limit: 20, periodo_id: periodoFilter || undefined });
      setMatriculas(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferencias = async () => {
    try {
      const [alumRes, gradRes, curRes] = await Promise.all([
        alumnosApi.getAll({ limit: 100 }),
        gradosApi.getAll(),
        cursosApi.getAll({ limit: 100 })
      ]);
      setAlumnos(alumRes.data.data || []);
      setGrados(gradRes.data.data || []);
      setCursos(curRes.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadEstadisticas = async () => {
    try {
      const res = await matriculasApi.getEstadisticas(periodoFilter ? { periodo_id: Number(periodoFilter) } : undefined);
      setEstadisticas(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        grado_id: formData.grado_id || null,
        curso_id: formData.curso_id || null,
        observaciones: formData.observaciones || undefined
      };
      if (editing) {
        await matriculasApi.update(editing.id, payload);
        toast.success('Matrícula actualizada');
      } else {
        const res = await matriculasApi.create(payload);
        const creados = res.data.data as any;
        const inscritos = creados?.cursos_inscritos;
        toast.success(
          inscritos && inscritos > 1
            ? `Matrícula registrada: ${inscritos} cursos inscritos`
            : res.data.message || 'Matrícula registrada'
        );
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
      loadData();
      loadEstadisticas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await matriculasApi.delete(deleteId);
      toast.success('Matrícula eliminada');
      setDeleteId(null);
      loadData();
      loadEstadisticas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const resetForm = () => {
    setFormData({ alumno_id: '', curso_id: '', periodo_academico_id: '', grado_id: '', observaciones: '', auto_cursos: true });
  };

  const openEdit = (matricula: any) => {
    setEditing(matricula);
    setFormData({
      alumno_id: matricula.alumno_id?.toString() || '',
      curso_id: matricula.curso_id?.toString() || '',
      periodo_academico_id: matricula.periodo_academico_id?.toString() || '',
      grado_id: matricula.grado_id?.toString() || '',
      observaciones: matricula.observaciones || '',
      auto_cursos: false
    });
    setShowModal(true);
  };

  const columns = [
    { key: 'alumno_nombre', label: 'Alumno', render: (m: any) => `${m.alumno_nombre} ${m.alumno_apellido}` },
    { key: 'codigo_alumno', label: 'Código', render: (m: any) => <span className="font-mono text-xs">{m.codigo_alumno}</span> },
    { key: 'curso', label: 'Curso', render: (m: any) => m.curso || '-' },
    { key: 'grado', label: 'Grado', render: (m: any) => m.grado || '-' },
    { key: 'periodo', label: 'Periodo' },
    { key: 'fecha_matricula', label: 'Fecha', render: (m: any) => new Date(m.fecha_matricula).toLocaleDateString() },
    { key: 'estado', label: 'Estado', render: (m: any) => <Badge variant={m.estado === 'activa' ? 'success' : m.estado === 'cancelada' ? 'danger' : 'warning'}>{m.estado}</Badge> },
    { key: 'acciones', label: '', render: (m: any) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Matrículas" value={estadisticas.general?.total_matriculas || 0} icon={FileText} color="blue" />
          <StatCard title="Activas" value={estadisticas.general?.activas || 0} icon={Users} color="green" />
          <StatCard title="Pendientes" value={estadisticas.general?.pendientes || 0} icon={TrendingUp} color="yellow" />
          <StatCard title="Canceladas" value={estadisticas.general?.canceladas || 0} icon={Trash2} color="red" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-900">Gestión de Matrículas</h1>
        </div>
        <button onClick={() => { resetForm(); setEditing(null); setFormData(fd => ({ ...fd, periodo_academico_id: periodoFilter })); setShowModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nueva Matrícula
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {periodoFilter
          ? <>Mostrando matrículas de <span className="font-medium text-gray-700">{periodos.find(p => String(p.id) === periodoFilter)?.nombre}</span>. Cambia el periodo en la barra superior para consultar el histórico.</>
          : 'Mostrando matrículas de todos los periodos académicos.'}
      </p>

      <DataTable
        columns={columns}
        data={matriculas}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage={periodoFilter ? 'No hay matrículas para el periodo seleccionado' : 'No hay matrículas registradas'}
      />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Matrícula' : 'Nueva Matrícula'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alumno *</label>
              <select value={formData.alumno_id} onChange={e => setFormData({...formData, alumno_id: e.target.value})} className="input-field" required>
                <option value="">Seleccionar alumno...</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.codigo_alumno})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Académico *</label>
              <select value={formData.periodo_academico_id} onChange={e => setFormData({...formData, periodo_academico_id: e.target.value})} className="input-field" required>
                <option value="">Seleccionar periodo...</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado *</label>
              <select value={formData.grado_id} onChange={e => setFormData({...formData, grado_id: e.target.value})} className="input-field" required>
                <option value="">Seleccionar grado...</option>
                {grados.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso (opcional)</label>
              <select value={formData.curso_id} onChange={e => setFormData({...formData, curso_id: e.target.value})} className="input-field">
                <option value="">Sin curso asignado</option>
                {cursos.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.grado_nombre ? ` · ${c.grado_nombre}` : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Si eliges un curso se crea solo esa matrícula; si lo dejas vacío se inscriben todos los cursos del grado.</p>
            </div>
          </div>

          {/* Inscripción automática de cursos configurados */}
          {!editing && !formData.curso_id && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_cursos}
                  onChange={e => setFormData({ ...formData, auto_cursos: e.target.checked })}
                  className="mt-0.5 rounded"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Inscribir automáticamente los cursos del grado</span>
                  <br />
                  <span className="text-xs text-gray-500">Usa la configuración del periodo académico (Estructura Académica).</span>
                </span>
              </label>
              {formData.auto_cursos && (
                cursosDelGrado.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cursosDelGrado.map(curso => (
                      <span key={curso.curso_id} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                        {curso.curso}{curso.profesores?.length > 0 ? ` · ${curso.profesores.map((p: any) => `${p.nombre} ${p.apellido}`).join(', ')}` : ' · sin profesor'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-600">
                    {formData.grado_id && formData.periodo_academico_id
                      ? 'Este grado no tiene cursos configurados en el periodo (se creará una sola matrícula).'
                      : 'Elige periodo y grado para ver los cursos que se inscribirán.'}
                  </p>
                )
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="input-field" rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar Matrícula" message="¿Está seguro de eliminar esta matrícula? Esta acción no se puede deshacer." />
    </div>
  );
}