import React, { useState } from 'react';
import { Archive, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { alumnosApi } from '../../api/endpoints';
import { ESTADOS_ALUMNO } from '../tramites/tramites';

/** Datos del alumno anteriores al sistema (exalumnos importados o registrados a mano). */
export default function HistorialPrevio({ alumno, editable, onSaved }: { alumno: any; editable: boolean; onSaved: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [saving, setSaving] = useState(false);
  const inicial = () => ({
    estado: alumno.estado || 'egresado',
    anio_ingreso: alumno.anio_ingreso ? String(alumno.anio_ingreso) : '',
    anio_ultimo_estudio: alumno.anio_ultimo_estudio ? String(alumno.anio_ultimo_estudio) : '',
    ultimo_grado_cursado: alumno.ultimo_grado_cursado || '',
    observaciones_historicas: alumno.observaciones_historicas || ''
  });
  const [form, setForm] = useState(inicial);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return;
    setSaving(true);
    try {
      const { estado, ...historial } = form;
      await alumnosApi.actualizarHistorico(alumno.id, historial);
      if (estado !== alumno.estado) await alumnosApi.update(alumno.id, { estado });
      toast.success('Historial actualizado'); setAbierto(false); onSaved();
    } catch (err: any) { toast.error(err.response?.data?.message || 'No se pudo guardar'); }
    finally { setSaving(false); }
  };

  const anios = alumno.anio_ingreso && alumno.anio_ultimo_estudio ? `${alumno.anio_ingreso} – ${alumno.anio_ultimo_estudio}` : alumno.anio_ultimo_estudio || alumno.anio_ingreso || 'Sin registrar';
  const anioActual = new Date().getFullYear();

  return (
    <section className="card" aria-labelledby="historial-previo-titulo">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 id="historial-previo-titulo" className="flex items-center gap-2 text-lg font-semibold"><Archive className="h-5 w-5 text-primary-600" /> Historial previo al sistema</h3>
        {editable && <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm text-primary-600" onClick={() => { setForm(inicial()); setAbierto(true); }}><Edit className="h-4 w-4" /> Editar</button>}
      </div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-gray-500">Situación</dt><dd className="font-medium">{ESTADOS_ALUMNO[alumno.estado] || alumno.estado || '—'}</dd></div>
        <div><dt className="text-gray-500">Años de estudio</dt><dd className="font-medium">{anios}</dd></div>
        <div><dt className="text-gray-500">Último grado cursado</dt><dd className="font-medium">{alumno.ultimo_grado_cursado || 'Sin registrar'}</dd></div>
      </dl>
      {alumno.observaciones_historicas && <p className="mt-3 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{alumno.observaciones_historicas}</p>}
      {alumno.es_historico === 1 && <p className="mt-3 text-xs text-gray-500">Exalumno registrado sin cuenta de acceso. Si vuelve a estudiar, matricúlalo desde Matrículas y pasará a la lista de alumnos actuales.</p>}

      <Modal isOpen={abierto} onClose={() => { if (!saving) setAbierto(false); }} title="Editar historial previo" size="md" className="student-dialog">
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label htmlFor="hist-estado" className="mb-1 block text-sm font-medium">Situación</label>
            <select id="hist-estado" className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
              {Object.entries(ESTADOS_ALUMNO).filter(([v]) => v !== 'matriculado' || alumno.estado === 'matriculado').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hist-ingreso" className="mb-1 block text-sm font-medium">Año de ingreso</label>
              <input id="hist-ingreso" type="number" min={1950} max={anioActual} className="input-field" value={form.anio_ingreso} onChange={e => setForm({ ...form, anio_ingreso: e.target.value })} />
            </div>
            <div>
              <label htmlFor="hist-ultimo" className="mb-1 block text-sm font-medium">Último año</label>
              <input id="hist-ultimo" type="number" min={1950} max={anioActual} className="input-field" value={form.anio_ultimo_estudio} onChange={e => setForm({ ...form, anio_ultimo_estudio: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="hist-grado" className="mb-1 block text-sm font-medium">Último grado cursado</label>
            <input id="hist-grado" className="input-field" maxLength={80} placeholder="Ej.: 5.° de secundaria" value={form.ultimo_grado_cursado} onChange={e => setForm({ ...form, ultimo_grado_cursado: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hist-obs" className="mb-1 block text-sm font-medium">Observaciones</label>
            <textarea id="hist-obs" className="input-field" rows={3} maxLength={2000} value={form.observaciones_historicas} onChange={e => setForm({ ...form, observaciones_historicas: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
