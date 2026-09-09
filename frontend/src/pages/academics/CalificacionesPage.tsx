import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { calificacionesApi, alumnosApi, cursosApi, periodosApi } from '../../api/endpoints';
import type { Calificacion, Alumno, Curso, PeriodoAcademico } from '../../types';
import toast from 'react-hot-toast';

export default function CalificacionesPage() {
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    alumno_id: '', curso_id: '', periodo_academico_id: '', nota: '', tipo_evaluacion: 'general', observaciones: ''
  });

  useEffect(() => {
    Promise.all([
      alumnosApi.getAll({ limit: 100 }),
      cursosApi.getAll({ limit: 100 }),
      periodosApi.getAll()
    ]).then(([a, c, p]) => {
      setAlumnos(a.data.data || []);
      setCursos(c.data.data || []);
      setPeriodos(p.data.data || []);
    });
  }, []);

  useEffect(() => { loadCalificaciones(); }, [selectedAlumno]);

  const loadCalificaciones = async () => {
    if (!selectedAlumno) { setCalificaciones([]); return; }
    setLoading(true);
    try {
      const res = await calificacionesApi.getByAlumno(parseInt(selectedAlumno));
      setCalificaciones(res.data.data?.calificaciones || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await calificacionesApi.register({
        ...formData,
        alumno_id: parseInt(formData.alumno_id),
        curso_id: parseInt(formData.curso_id),
        periodo_academico_id: parseInt(formData.periodo_academico_id),
        nota: parseFloat(formData.nota)
      });
      toast.success('Calificación registrada');
      setShowModal(false);
      setFormData({ alumno_id: '', curso_id: '', periodo_academico_id: '', nota: '', tipo_evaluacion: 'general', observaciones: '' });
      loadCalificaciones();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const activePeriodo = periodos.find(p => p.activo);

  const columns = [
    { key: 'curso_nombre', label: 'Curso' },
    { key: 'nota', label: 'Nota', render: (c: Calificacion) => (
      <span className={`font-bold ${c.nota >= 11 ? 'text-green-600' : 'text-red-600'}`}>{c.nota}</span>
    )},
    { key: 'tipo_evaluacion', label: 'Tipo', render: (c: Calificacion) => <Badge variant="info">{c.tipo_evaluacion}</Badge> },
    { key: 'periodo_nombre', label: 'Periodo' },
    { key: 'fecha_evaluacion', label: 'Fecha', render: (c: Calificacion) => c.fecha_evaluacion ? new Date(c.fecha_evaluacion).toLocaleDateString() : '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select value={selectedAlumno} onChange={e => setSelectedAlumno(e.target.value)} className="input-field w-full sm:w-64">
            <option value="">Seleccionar alumno...</option>
            {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
          </select>
        </div>
        <button onClick={() => { setFormData({ ...formData, alumno_id: selectedAlumno, periodo_academico_id: activePeriodo?.id?.toString() || '' }); setShowModal(true); }}
          disabled={!selectedAlumno} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Nueva Calificación
        </button>
      </div>

      {selectedAlumno ? (
        <DataTable columns={columns} data={calificaciones} isLoading={loading} emptyMessage="Sin calificaciones registradas" />
      ) : (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Seleccione un alumno para ver sus calificaciones</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Calificación">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alumno *</label>
            <select value={formData.alumno_id} onChange={e => setFormData({...formData, alumno_id: e.target.value})} className="input-field" required>
              <option value="">Seleccionar...</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
            <select value={formData.curso_id} onChange={e => setFormData({...formData, curso_id: e.target.value})} className="input-field" required>
              <option value="">Seleccionar...</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo *</label>
            <select value={formData.periodo_academico_id} onChange={e => setFormData({...formData, periodo_academico_id: e.target.value})} className="input-field" required>
              <option value="">Seleccionar...</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota (0-20) *</label>
              <input type="number" min="0" max="20" step="0.5" value={formData.nota} onChange={e => setFormData({...formData, nota: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={formData.tipo_evaluacion} onChange={e => setFormData({...formData, tipo_evaluacion: e.target.value})} className="input-field">
                <option value="general">General</option>
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
                <option value="practica">Práctica</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
