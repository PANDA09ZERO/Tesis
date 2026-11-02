import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Flag, Info, Plus, Trash2
} from 'lucide-react';
import { calendarApi, estudianteApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePeriodo } from '../context/PeriodoContext';
import Modal from '../components/ui/Modal';
import type { CalendarEvent, PeriodoAcademico } from '../types';

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type EventFilter = 'todos' | 'clase' | 'evaluacion' | 'evento';
type EventoTipo = 'institucional' | 'feriado' | 'reunion' | 'otro';

const EVENTO_LABELS: Record<EventoTipo, string> = {
  institucional: 'Institucional',
  feriado: 'Feriado',
  reunion: 'Reunión',
  otro: 'Otro'
};

const esEvento = (tipo: string) => ['institucional', 'feriado', 'reunion', 'otro'].includes(tipo);

function tipoEtiqueta(tipo: string): string {
  if (tipo === 'clase') return 'Clase';
  if (tipo === 'evaluacion') return 'Evaluación';
  return EVENTO_LABELS[tipo as EventoTipo] || 'Evento';
}

function tipoDot(tipo: string): string {
  switch (tipo) {
    case 'evaluacion': return 'bg-red-500';
    case 'feriado': return 'bg-amber-500';
    case 'reunion': return 'bg-emerald-500';
    case 'institucional': return 'bg-indigo-500';
    case 'otro': return 'bg-gray-500';
    default: return 'bg-primary-500';
  }
}

function tipoCard(tipo: string): string {
  switch (tipo) {
    case 'evaluacion': return 'border-red-200 bg-red-50 hover:bg-red-100/60';
    case 'feriado': return 'border-amber-200 bg-amber-50 hover:bg-amber-100/60';
    case 'reunion': return 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60';
    case 'institucional': return 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100/60';
    case 'otro': return 'border-gray-200 bg-gray-50 hover:bg-gray-100/60';
    default: return 'border-primary-200 bg-primary-50 hover:bg-primary-100/60';
  }
}

function tipoIcono(tipo: string) {
  if (tipo === 'clase') return <BookOpen className="w-3.5 h-3.5 text-primary-600" />;
  if (tipo === 'evaluacion') return <Flag className="w-3.5 h-3.5 text-red-600" />;
  if (tipo === 'feriado') return <Flag className="w-3.5 h-3.5 text-amber-600" />;
  if (tipo === 'reunion') return <Info className="w-3.5 h-3.5 text-emerald-600" />;
  return <Info className="w-3.5 h-3.5 text-indigo-600" />;
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'No se pudo cargar el calendario';
  }
  return error instanceof Error ? error.message : 'No se pudo cargar el calendario';
}

function formatEventDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isStudent = user?.rol === 'alumno';
  // Admin/profesor usan el contexto global de periodo (vigente por defecto);
  // los alumnos conservan su propio filtro derivado de sus matrículas.
  const { periodoId: globalPeriodo, periodos: globalPeriodos } = usePeriodo();
  const [studentPeriodos, setStudentPeriodos] = useState<PeriodoAcademico[]>([]);
  const [studentPeriodo, setStudentPeriodo] = useState('');
  const periodos = isStudent ? studentPeriodos : globalPeriodos;
  const selectedPeriodo = isStudent ? studentPeriodo : globalPeriodo;
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'dia' | 'mes'>('mes');
  const [eventFilter, setEventFilter] = useState<EventFilter>('todos');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [reload, setReload] = useState(0);
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [eventForm, setEventForm] = useState({ titulo: '', descripcion: '', fecha: '', hora_inicio: '', hora_fin: '', tipo: 'institucional' as EventoTipo, periodo_academico_id: '' });
  const canManageEvents = user?.rol === 'administrador' || user?.rol === 'profesor';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();

  useEffect(() => {
    let active = true;
    if (!isStudent) return () => { active = false; };
    estudianteApi.getContexto()
      .then(response => {
        if (!active) return;
        const items: PeriodoAcademico[] = response.data.data.periodos || [];
        setStudentPeriodos(items);
        const activePeriod = items.find(period => period.activo);
        if (activePeriod) setStudentPeriodo(String(activePeriod.id));
      })
      .catch(error => {
        if (active) setPeriodError(apiErrorMessage(error));
      });
    return () => { active = false; };
  }, [isStudent, user?.id]);

  useEffect(() => {
    let active = true;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    setLoading(true);
    setLoadError('');
    calendarApi.getEvents({
      fecha_inicio: localDateString(start),
      fecha_fin: localDateString(end),
      ...(selectedPeriodo ? { periodo_id: Number(selectedPeriodo) } : {})
    })
      .then(response => {
        if (active) setEvents(response.data.data || []);
      })
      .catch(error => {
        if (active) {
          setEvents([]);
          setLoadError(apiErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [month, selectedPeriodo, year, reload]);

  const daysGrid = useMemo(() => {
    const grid: Array<number | null> = [];
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let index = 0; index < startDay; index++) grid.push(null);
    for (let day = 1; day <= daysInMonth; day++) grid.push(day);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [daysInMonth, firstDayOfMonth]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'todos') return events;
    if (eventFilter === 'evento') return events.filter(event => esEvento(event.tipo));
    return events.filter(event => event.tipo === eventFilter);
  }, [eventFilter, events]);
  const selectedEvents = filteredEvents.filter(event => event.fecha === localDateString(selectedDate));

  const getEventsForDay = (day: number) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(event => event.fecha === date);
  };

  const navigateMonth = (direction: number) => {
    const nextMonth = new Date(year, month + direction, 1);
    setCurrentDate(nextMonth);
    setSelectedDate(nextMonth);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const openEventForm = () => {
    setEventFormError('');
    setEventForm({
      titulo: '',
      descripcion: '',
      fecha: localDateString(selectedDate),
      hora_inicio: '',
      hora_fin: '',
      tipo: 'institucional',
      periodo_academico_id: selectedPeriodo || ''
    });
    setShowEventForm(true);
  };

  const submitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingEvent) return;
    setEventFormError('');
    if (!eventForm.titulo.trim() || !eventForm.fecha) {
      setEventFormError('Indica un título y una fecha para el evento');
      return;
    }
    if (eventForm.hora_fin && !eventForm.hora_inicio) {
      setEventFormError('Indica primero la hora de inicio');
      return;
    }
    if (eventForm.hora_inicio && eventForm.hora_fin && eventForm.hora_fin <= eventForm.hora_inicio) {
      setEventFormError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }
    setSavingEvent(true);
    try {
      await calendarApi.createEvent({
        titulo: eventForm.titulo.trim(),
        descripcion: eventForm.descripcion.trim() || null,
        fecha: eventForm.fecha,
        hora_inicio: eventForm.hora_inicio || null,
        hora_fin: eventForm.hora_fin || null,
        tipo: eventForm.tipo,
        periodo_academico_id: eventForm.periodo_academico_id ? Number(eventForm.periodo_academico_id) : null
      });
      setShowEventForm(false);
      const created = new Date(`${eventForm.fecha}T12:00:00`);
      if (!Number.isNaN(created.getTime())) {
        setCurrentDate(created);
        setSelectedDate(created);
      }
      setReload(value => value + 1);
    } catch (error) {
      setEventFormError(apiErrorMessage(error));
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteActiveEvent = async () => {
    if (!activeEvent || !activeEvent.id.startsWith('custom-')) return;
    if (!window.confirm(`¿Eliminar el evento "${activeEvent.titulo}"?`)) return;
    try {
      await calendarApi.deleteEvent(Number(activeEvent.id.replace('custom-', '')));
      setActiveEvent(null);
      setReload(value => value + 1);
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    }
  };

  return (
    <div className="calendar-page overflow-hidden rounded-2xl border border-gray-200 flex h-auto min-h-[calc(100dvh-3.5rem)] flex-col bg-gray-50 lg:h-full lg:min-h-[32rem]">
      <header className="border-b border-gray-200 bg-white px-3 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
            {isStudent && (
              <select
                value={studentPeriodo}
                onChange={event => { setStudentPeriodo(event.target.value); const chosen=periodos.find(p=>String(p.id)===event.target.value); if (chosen) { const date=new Date(`${chosen.fecha_inicio}T12:00:00`); if (!Number.isNaN(date.getTime())) { setCurrentDate(date); setSelectedDate(date); } } }}
                className="input-field max-w-56 sm:ml-2"
                aria-label="Filtrar por periodo académico"
              >
                <option value="">Todos los periodos</option>
                {periodos.map(period => (
                  <option key={period.id} value={period.id}>{period.nombre}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
              {([
                ['todos', 'Todo'],
                ['clase', 'Clases'],
                ['evaluacion', 'Evaluaciones'],
                ['evento', 'Eventos']
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  onClick={() => setEventFilter(filter)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    eventFilter === filter ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setViewMode('dia')}
              aria-label="Vista de día"
              aria-pressed={viewMode === 'dia'}
              className={`flex h-11 w-11 items-center justify-center rounded-lg ${viewMode === 'dia' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('mes')}
              aria-label="Vista de mes"
              aria-pressed={viewMode === 'mes'}
              className={`flex h-11 w-11 items-center justify-center rounded-lg ${viewMode === 'mes' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button onClick={goToToday} className="min-h-11 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">
              Hoy
            </button>
            {canManageEvents && (
              <button onClick={openEventForm} className="btn-primary flex min-h-11 items-center gap-2">
                <Plus className="w-4 h-4" /> Nuevo evento
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 sm:gap-4">
          <button onClick={() => navigateMonth(-1)} aria-label="Mes anterior" className="flex h-11 w-11 items-center justify-center rounded text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="min-w-40 text-center text-lg font-semibold text-gray-900">
            {MONTHS[month]} de {year}
          </span>
          <button onClick={() => navigateMonth(1)} aria-label="Mes siguiente" className="flex h-11 w-11 items-center justify-center rounded text-gray-500 hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {(periodError || loadError) && (
        <div role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {periodError || loadError}
        </div>
      )}
      {viewMode === 'mes' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="min-w-0 flex-1 overflow-y-auto p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {WEEK_DAYS.map((day, index) => (
                <div key={`${day}-${index}`} className="bg-white py-2 text-center text-[10px] font-semibold text-gray-500 sm:text-xs">
                  {day}
                </div>
              ))}
              {daysGrid.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="min-h-11 bg-white sm:min-h-20 lg:min-h-24" />;
                const date = new Date(year, month, day);
                const dayEvents = getEventsForDay(day);
                const todaySelected = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const selected = localDateString(date) === localDateString(selectedDate);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-11 bg-white p-1 text-left align-top hover:bg-gray-50 sm:min-h-20 sm:p-1.5 lg:min-h-24 ${
                      selected ? 'ring-2 ring-inset ring-primary-500 bg-primary-50' : ''
                    }`}
                  >
                    <span className={`text-xs sm:text-sm ${todaySelected ? 'font-bold text-blue-600' : 'text-gray-700'}`}>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dayEvents.slice(0, 6).map(item => (
                          <span
                            key={item.id}
                            title={`${tipoEtiqueta(item.tipo)}: ${item.titulo}`}
                            className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${tipoDot(item.tipo)}`}
                          />
                        ))}
                        {dayEvents.length > 6 && <span className="text-[10px] text-gray-500">+{dayEvents.length - 6}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="flex max-h-[35vh] w-full shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-white lg:h-full lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">{formatEventDate(localDateString(selectedDate))}</h2>
            </div>
            <EventList events={selectedEvents} loading={loading} onSelectEvent={setActiveEvent} />
          </aside>
        </div>
      ) : (
        <section className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{formatEventDate(localDateString(selectedDate))}</h2>
              <EventList events={selectedEvents} loading={loading} onSelectEvent={setActiveEvent} />
            </div>
          </div>
        </section>
      )}

      {activeEvent && (
        <Modal isOpen={!!activeEvent} onClose={() => setActiveEvent(null)} title={activeEvent.tipo === 'evaluacion' ? 'Detalle de Evaluación' : 'Detalle de Clase'}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">
                {tipoIcono(activeEvent.tipo)}
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-gray-900">{activeEvent.titulo}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{tipoEtiqueta(activeEvent.tipo)}</p>
              </div>
            </div>
            {activeEvent.descripcion && (
              <p className="rounded-lg border border-gray-100 bg-white p-3 text-sm text-gray-700 whitespace-pre-line">{activeEvent.descripcion}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 p-2.5">
                <span className="block text-xs text-gray-500">Fecha</span>
                <span className="font-medium text-gray-900">{formatEventDate(activeEvent.fecha)}</span>
              </div>
              <div className="rounded-lg border border-gray-100 p-2.5">
                <span className="block text-xs text-gray-500">Horario</span>
                <span className="font-medium text-gray-900">
                  {activeEvent.hora_inicio ? `${activeEvent.hora_inicio.substring(0, 5)}${activeEvent.hora_fin ? ` – ${activeEvent.hora_fin.substring(0, 5)}` : ''}` : 'No especificado'}
                </span>
              </div>
              {!esEvento(activeEvent.tipo) && (
                <>
                  <div className="rounded-lg border border-gray-100 p-2.5">
                    <span className="block text-xs text-gray-500">Curso</span>
                    <span className="font-medium text-gray-900">{activeEvent.curso}</span>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-2.5">
                    <span className="block text-xs text-gray-500">Grado / Aula</span>
                    <span className="font-medium text-gray-900">{activeEvent.grado}{activeEvent.aula ? ` · Aula ${activeEvent.aula}` : ''}</span>
                  </div>
                </>
              )}
            </div>
            {activeEvent.periodo && (
              <p className="text-center text-xs text-gray-500">Periodo académico: <span className="font-medium text-gray-700">{activeEvent.periodo}</span></p>
            )}
            <div className="flex justify-between gap-2 pt-2">
              {canManageEvents && activeEvent.id.startsWith('custom-') ? (
                <button onClick={deleteActiveEvent} className="btn-secondary flex items-center gap-2 text-red-700">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              ) : <span />}
              <button onClick={() => setActiveEvent(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={showEventForm} onClose={() => { if (!savingEvent) setShowEventForm(false); }} title="Nuevo evento en el calendario">
        <form onSubmit={submitEvent} className="space-y-4">
          {eventFormError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{eventFormError}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Título *</label>
            <input className="input-field" maxLength={150} value={eventForm.titulo}
              onChange={e => setEventForm({ ...eventForm, titulo: e.target.value })} placeholder="Ej. Reunión de padres, feriado, ceremonia..." required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha *</label>
              <input type="date" className="input-field" value={eventForm.fecha}
                onChange={e => setEventForm({ ...eventForm, fecha: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select className="input-field" value={eventForm.tipo}
                onChange={e => setEventForm({ ...eventForm, tipo: e.target.value as EventoTipo })}>
                <option value="institucional">Institucional</option>
                <option value="feriado">Feriado</option>
                <option value="reunion">Reunión</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora de inicio</label>
              <input type="time" className="input-field" value={eventForm.hora_inicio}
                onChange={e => setEventForm({ ...eventForm, hora_inicio: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora de fin</label>
              <input type="time" className="input-field" value={eventForm.hora_fin}
                onChange={e => setEventForm({ ...eventForm, hora_fin: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Periodo académico</label>
            <select className="input-field" value={eventForm.periodo_academico_id}
              onChange={e => setEventForm({ ...eventForm, periodo_academico_id: e.target.value })}>
              <option value="">General (todos los periodos)</option>
              {periodos.map(period => (
                <option key={period.id} value={period.id}>{period.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea className="input-field min-h-24" maxLength={1000} value={eventForm.descripcion}
              onChange={e => setEventForm({ ...eventForm, descripcion: e.target.value })} placeholder="Detalles opcionales del evento" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" disabled={savingEvent} onClick={() => setShowEventForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingEvent}>{savingEvent ? 'Guardando...' : 'Guardar evento'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EventList({ events, loading, onSelectEvent }: { events: CalendarEvent[]; loading: boolean; onSelectEvent: (event: CalendarEvent) => void }) {
  if (loading) return <p className="px-4 py-8 text-center text-sm text-gray-500">Cargando eventos...</p>;
  if (events.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-gray-500">No hay actividades para este día.</p>;
  }
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {events.map(event => (
        <button
          key={event.id}
          onClick={() => onSelectEvent(event)}
          className={`w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm ${tipoCard(event.tipo)}`}
        >
          <div className="flex items-center gap-2 mb-1">
            {tipoIcono(event.tipo)}
            <span className="text-xs font-semibold text-gray-700">
              {event.hora_inicio
                ? `${event.hora_inicio.substring(0, 5)}${event.hora_fin ? `–${event.hora_fin.substring(0, 5)}` : ''}`
                : 'Sin hora definida'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900">{event.titulo}</h3>
          <p className="text-xs text-gray-600 mt-1">
            {event.curso} · {event.grado}
          </p>
          <p className="text-xs text-gray-500">
            {event.periodo}{event.aula ? ` · Aula ${event.aula}` : ''}
          </p>
        </button>
      ))}
    </div>
  );
}
