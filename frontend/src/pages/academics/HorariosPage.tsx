import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { horariosApi, cursosApi, profesoresApi, periodosApi } from '../../api/endpoints';
import type { Horario, Curso, Profesor, PeriodoAcademico } from '../../types';
import toast from 'react-hot-toast';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function HorariosPage() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedSeccion, setSelectedSeccion] = useState('');
  const [formData, setFormData] = useState({
    curso_id: '', profesor_id: '', seccion_id: '', periodo_academico_id: '',
    dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', aula: ''
  });

  useEffect(() => {
    Promise.all([cursosApi.getAll({ limit: 100 }), profesoresApi.getAll({ limit: 100 }), periodosApi.getAll()])
      .then(([c, p, per]) => {
        setCursos(c.data.data || []);
        setProfesores(p.data.data || []);
        setPeriodos(per.data.data || []);
        const active = per.data.data?.find((p: PeriodoAcademico) => p.activo);
        if (active) setSelectedPeriodo(active.id.toString());
      });
  }, []);

  useEffect(() => { loadHorarios(); }, [selectedPeriodo]);

  const loadHorarios = async () => {
    try {
      const params: any = {};
      if (selectedPeriodo) params.periodo_id = selectedPeriodo;
      const res = await horariosApi.getAll(params);
      setHorarios(res.data.data || []);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await horariosApi.create({
        ...formData,
        curso_id: parseInt(formData.curso_id),
        profesor_id: parseInt(formData.profesor_id),
        seccion_id: parseInt(formData.seccion_id),
        periodo_academico_id: parseInt(formData.periodo_academico_id)
      });
      toast.success('Horario creado');
      setShowModal(false);
      loadHorarios();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    try { await horariosApi.delete(id); toast.success('Horario eliminado'); loadHorarios(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const groupedHorarios = DIAS.map(dia => ({
    dia,
    horarios: horarios.filter(h => h.dia_semana === dia)
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select value={selectedPeriodo} onChange={e => setSelectedPeriodo(e.target.value)} className="input-field w-56">
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Horario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedHorarios.map(({ dia, horarios: hrs }) => (
          <div key={dia} className="card">
            <h3 className="font-semibold text-gray-900 mb-3">{dia}</h3>
            {hrs.length === 0 ? (
              <p className="text-sm text-gray-400">Sin clases</p>
            ) : (
              <div className="space-y-2">
                {hrs.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{h.curso_nombre}</p>
                      <p className="text-xs text-gray-500">{h.profesor_nombre} - {h.aula || 'S/A'}</p>
                      <p className="text-xs text-gray-400">{h.hora_inicio?.substring(0,5)} - {h.hora_fin?.substring(0,5)}</p>
                    </div>
                    <button onClick={() => handleDelete(h.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Horario">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
            <select value={formData.curso_id} onChange={e => setFormData({...formData, curso_id: e.target.value})} className="input-field" required>
              <option value="">Seleccionar...</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Profesor *</label>
            <select value={formData.profesor_id} onChange={e => setFormData({...formData, profesor_id: e.target.value})} className="input-field" required>
              <option value="">Seleccionar...</option>
              {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Periodo *</label>
              <select value={formData.periodo_academico_id} onChange={e => setFormData({...formData, periodo_academico_id: e.target.value})} className="input-field" required>
                <option value="">Seleccionar...</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Aula</label>
              <input type="text" value={formData.aula} onChange={e => setFormData({...formData, aula: e.target.value})} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Día *</label>
              <select value={formData.dia_semana} onChange={e => setFormData({...formData, dia_semana: e.target.value})} className="input-field" required>
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio *</label>
              <input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin *</label>
              <input type="time" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} className="input-field" required /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
