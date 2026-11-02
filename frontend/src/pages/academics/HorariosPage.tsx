import {Link} from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Pencil, Plus, Trash2, CalendarDays, RefreshCw } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import WeeklySchedule, { SCHEDULE_DAYS, dayLabel } from '../../components/academics/WeeklySchedule';
import { useAuth } from '../../context/AuthContext';
import { usePeriodo } from '../../context/PeriodoContext';
import { configuracionApi, horariosApi } from '../../api/endpoints';
import type { Horario, HorarioPayload, OfertaAcademica, Profesor } from '../../types';
import toast from 'react-hot-toast';

const DIAS = SCHEDULE_DAYS;
const EMPTY_FORM = {
  periodo_grado_curso_id: '',
  profesor_id: '',
  dia_semana: 'Lunes',
  hora_inicio: '08:00',
  hora_fin: '09:00',
  aula: ''
};

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'No se pudo completar la solicitud';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud';
}

function ofertaLabel(oferta: OfertaAcademica): string {
  return `${oferta.periodo} · ${oferta.grado} · ${oferta.curso}`;
}

export default function HorariosPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [ofertas, setOfertas] = useState<OfertaAcademica[]>([]);
  const [profesoresOferta, setProfesoresOferta] = useState<Profesor[]>([]);
  const [teachersLoading,setTeachersLoading]=useState(false),[teachersError,setTeachersError]=useState(''),[loadedOffer,setLoadedOffer]=useState('');
  const [teacherReload,setTeacherReload]=useState(0),[listReload,setListReload]=useState(0);
  // Contexto global de periodo académico (vigente por defecto)
  const { periodoId: selectedPeriodo, periodo } = usePeriodo();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Horario | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setLoadError('');setHorarios([]);setOfertas([]);
      try {
        const periodId = selectedPeriodo ? Number(selectedPeriodo) : undefined;
        const [scheduleResponse, offerResponse] = await Promise.all([
          horariosApi.getAll(periodId ? { periodo_id: periodId } : undefined),
          isAdmin ? configuracionApi.getOfertas(periodId ? { periodo_id: periodId } : undefined) : Promise.resolve(null)
        ]);
        if (!active) return;
        setHorarios(scheduleResponse.data.data || []);
        if (offerResponse) setOfertas(offerResponse.data.data || []);
      } catch (error) {
        if (active) {
          setLoadError(errorMessage(error));
          toast.error(errorMessage(error));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, [isAdmin, selectedPeriodo,listReload]);

  useEffect(()=>{
    setProfesoresOferta([]);setTeachersError('');setLoadedOffer('');
    if(!showModal||!formData.periodo_grado_curso_id){setTeachersLoading(false);return;}
    let active=true;const requested=formData.periodo_grado_curso_id;setTeachersLoading(true);
    configuracionApi.getOferta(Number(requested)).then(response=>{
      if(!active)return;const teachers=(response.data.data?.profesores||[]).filter(p=>Number(p.activo)===1||(editing?.periodo_grado_curso_id===Number(requested)&&editing.profesor_id===p.id));
      setProfesoresOferta(teachers);setLoadedOffer(requested);
      setFormData(current=>current.periodo_grado_curso_id!==requested?current:current.profesor_id?current:teachers.length===1?{...current,profesor_id:String(teachers[0].id)}:current);
    }).catch(error=>{if(active)setTeachersError(errorMessage(error));}).finally(()=>{if(active)setTeachersLoading(false);});
    return()=>{active=false;};
  },[formData.periodo_grado_curso_id,showModal,teacherReload,editing?.id]);

  const closeModal = () => {
    setFormError('');
    setShowModal(false);
    setEditing(null);
    setFormData(EMPTY_FORM);
  };

  const openCreate = () => {
    setFormError('');
    const preferredOffer = ofertas[0];
    setEditing(null);
    setFormData({
      ...EMPTY_FORM,
      periodo_grado_curso_id: preferredOffer ? String(preferredOffer.periodo_grado_curso_id) : ''
    });
    setShowModal(true);
  };

  const openEdit = async (schedule: Horario) => {
    setFormError('');
    setEditing(schedule);
    try {
      if (isAdmin && schedule.periodo_academico_id) {
        const response = await configuracionApi.getOfertas({ periodo_id: schedule.periodo_academico_id });
        setOfertas(response.data.data || []);
      }
      setFormData({
        periodo_grado_curso_id: schedule.periodo_grado_curso_id
          ? String(schedule.periodo_grado_curso_id)
          : '',
        profesor_id: String(schedule.profesor_id),
        dia_semana: schedule.dia_semana,
        hora_inicio: schedule.hora_inicio.substring(0, 5),
        hora_fin: schedule.hora_fin.substring(0, 5),
        aula: schedule.aula || ''
      });
      setShowModal(true);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError('');
    if (formData.hora_fin <= formData.hora_inicio) { setFormError('La hora de fin debe ser posterior a la hora de inicio'); return; }
    if(teachersLoading||teachersError||loadedOffer!==formData.periodo_grado_curso_id||!profesoresOferta.some(p=>String(p.id)===formData.profesor_id)){toast.error('Selecciona una oferta y un docente activo asignado');return;}
    const payload: HorarioPayload = {
      periodo_grado_curso_id: Number(formData.periodo_grado_curso_id),
      profesor_id: Number(formData.profesor_id),
      dia_semana: formData.dia_semana,
      hora_inicio: formData.hora_inicio,
      hora_fin: formData.hora_fin,
      aula: formData.aula.trim() || null
    };
    setSaving(true);
    try {
      if (editing) await horariosApi.update(editing.id, payload);
      else await horariosApi.create(payload);
      toast.success(editing ? 'Horario actualizado' : 'Horario creado');
      closeModal();
      setListReload(n => n + 1);
    } catch (error) {
      setFormError(errorMessage(error));
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: Horario) => {
    if (!window.confirm(`¿Eliminar el horario de ${schedule.curso_nombre || 'este curso'}?`)) return;
    try {
      await horariosApi.delete(schedule.id);
      setHorarios(current => current.filter(item => item.id !== schedule.id));
      toast.success('Horario eliminado');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (!isAdmin && user?.rol !== 'profesor') {
    return <div className="card text-sm text-gray-600">No tienes permisos para consultar horarios.</div>;
  }

  return (
    <div className="schedule-page mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-xl font-bold">{isAdmin ? 'Horarios de clases' : 'Mis horarios'}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{isAdmin ? 'Organiza los bloques de las ofertas académicas.' : 'Consulta los bloques de clase que tienes asignados.'}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary gap-2" disabled={loading} onClick={() => setListReload(n => n + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4"/>Actualizar horarios</button>{isAdmin && <button type="button" onClick={openCreate} disabled={loading || !!loadError || ofertas.length === 0} className="btn-primary gap-2"><Plus aria-hidden="true" className="h-4 w-4"/>Nuevo horario</button>}</div>
      </header>
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"><CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"/><div><p className="text-sm font-semibold">{periodo?.nombre || 'Todos los periodos'}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cambia el periodo desde el selector de la barra superior.{!isAdmin && ' Esta vista es de consulta.'}</p></div></div>
      {loadError ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{loadError}</p><button className="btn-secondary mt-3" onClick={() => setListReload(n => n + 1)}>Reintentar horarios</button></div> : loading ? <div role="status" className="space-y-3"><p className="text-sm text-gray-500 dark:text-gray-400">Cargando horarios…</p><div className="grid grid-cols-3 gap-3">{[1,2,3].map(n => <div key={n} className="card h-24 animate-pulse"/>)}</div></div> : <WeeklySchedule key={selectedPeriodo} blocks={horarios.map(h => ({ ...h, curso: h.curso_nombre, profesor: h.profesor_nombre, historical: !h.periodo_grado_curso_id }))} actions={isAdmin ? block => {
        const schedule = horarios.find(h => h.id === block.id)!;
        return <><button type="button" onClick={() => void openEdit(schedule)} className="btn-secondary gap-2 text-xs" aria-label="Editar horario"><Pencil aria-hidden="true" className="h-4 w-4"/>Editar</button><button type="button" onClick={() => void handleDelete(schedule)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" aria-label="Eliminar horario"><Trash2 aria-hidden="true" className="h-4 w-4"/>Eliminar</button></>;
      } : undefined}/>}

      <Modal
        isOpen={showModal}
        onClose={() => { if (!saving) closeModal(); }}
        className="dark:bg-gray-900 [&_h2]:dark:text-gray-100 [&_label]:dark:text-gray-200"
        title={editing ? 'Editar horario' : 'Nuevo horario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800 dark:text-gray-200">
          <p className="text-sm text-gray-500 dark:text-gray-400">Usa una oferta existente. El docente se toma de sus asignaciones; aquí defines el día, las horas y el aula.</p>
          <fieldset disabled={saving} className="min-w-0 space-y-4 border-0 p-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oferta académica *</label>
            <select
              aria-label="Oferta académica" value={formData.periodo_grado_curso_id}
              onChange={event => setFormData(current => ({
                ...current,
                periodo_grado_curso_id: event.target.value,
                profesor_id: ''
              }))}
              className="input-field"
              required
            >
              <option value="">Seleccionar periodo, grado y curso...</option>
              {ofertas.map(offer => (
                <option key={offer.periodo_grado_curso_id} value={offer.periodo_grado_curso_id}>
                  {ofertaLabel(offer)}
                </option>
              ))}
            </select>
            {ofertas.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                No hay ofertas académicas configuradas para el periodo seleccionado.
              </p>
            )}
          </div>
          <div className="space-y-2">
            {teachersLoading?<p role="status">Consultando docentes asignados…</p>:teachersError?<div role="alert" className="text-red-600 dark:text-red-400"><p>{teachersError}</p><button type="button" className="btn-secondary mt-2" onClick={()=>setTeacherReload(n=>n+1)}>Reintentar docentes</button></div>:profesoresOferta.length===1&&formData.profesor_id===String(profesoresOferta[0].id)?<p>Docente asignado: <strong>{profesoresOferta[0].nombre} {profesoresOferta[0].apellido}{Number(profesoresOferta[0].activo)===0?' (Inactivo: se conserva el responsable de este registro)':''}</strong></p>:profesoresOferta.length>0?<label className="block text-sm font-medium">Profesor asignado al bloque *<select aria-label="Profesor asignado al bloque" className="input-field mt-1" value={formData.profesor_id} onChange={e=>setFormData(current=>({...current,profesor_id:e.target.value}))} required><option value="">Seleccionar docente asignado…</option>{profesoresOferta.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}{Number(p.activo)===0?' (Inactivo: responsable registrado)':''}</option>)}</select></label>:<p role="alert" className="text-amber-700 dark:text-amber-300">Esta oferta no tiene docentes activos asignados.</p>}
            {!teachersLoading&&formData.profesor_id&&!profesoresOferta.some(p=>String(p.id)===formData.profesor_id)&&<p role="alert">El responsable registrado ya no está habilitado para esta oferta. No se reemplazará automáticamente.</p>}
            <Link className="text-sm text-primary-700 underline" to={`/admin/configuracion-academica?periodo_id=${ofertas.find(o=>String(o.periodo_grado_curso_id)===formData.periodo_grado_curso_id)?.periodo_academico_id||selectedPeriodo}`}>Revisar asignaciones en Estructura académica</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día *</label>
              <select
                aria-label="Día" value={formData.dia_semana}
                onChange={event => setFormData(current => ({ ...current, dia_semana: event.target.value }))}
                className="input-field"
                required
              >
                {DIAS.map(day => <option key={day} value={day}>{dayLabel(day)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aula</label>
              <input
                aria-label="Aula" value={formData.aula}
                onChange={event => setFormData(current => ({ ...current, aula: event.target.value }))}
                className="input-field"
                maxLength={50}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio *</label>
              <input
                type="time"
                aria-label="Hora inicio" value={formData.hora_inicio}
                onChange={event => setFormData(current => ({ ...current, hora_inicio: event.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin *</label>
              <input
                type="time"
                aria-label="Hora fin" value={formData.hora_fin}
                onChange={event => setFormData(current => ({ ...current, hora_fin: event.target.value }))}
                className="input-field"
                required
              />
            </div>
          </div>
          </fieldset>
          {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>}
          <div className="form-actions">
            <button type="button" onClick={closeModal} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || ofertas.length === 0 || teachersLoading || !!teachersError || loadedOffer!==formData.periodo_grado_curso_id || !profesoresOferta.some(p=>String(p.id)===formData.profesor_id)}>
              <Clock className="inline w-4 h-4 mr-1" /> {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
