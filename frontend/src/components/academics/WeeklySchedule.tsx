import { useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, Clock, MapPin, Search, UserRound } from 'lucide-react';

export const SCHEDULE_DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
export const dayLabel = (day: string) => ({ Miercoles: 'Miércoles', Sabado: 'Sábado' }[day] || day);
export interface ScheduleBlock {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  curso?: string;
  grado?: string;
  profesor?: string;
  aula?: string | null;
  periodo?: string;
  historical?: boolean;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default function WeeklySchedule({ blocks, actions, emptyMessage = 'No hay horarios para el periodo seleccionado.' }: {
  blocks: ScheduleBlock[];
  actions?: (block: ScheduleBlock) => ReactNode;
  emptyMessage?: string;
}) {
  const [day, setDay] = useState('');
  const [query, setQuery] = useState('');
  const matched = blocks.filter(b => normalize([b.curso, b.grado, b.profesor, b.aula, b.periodo].join(' ')).includes(normalize(query.trim())));
  const visible = matched.filter(b => !day || b.dia_semana === day);
  const days = [...SCHEDULE_DAYS, ...new Set(blocks.map(b => b.dia_semana).filter(d => !SCHEDULE_DAYS.includes(d)))];
  return <div className="space-y-4">
    <section aria-label="Resumen de horarios" className="grid grid-cols-3 gap-2 sm:gap-3">
      {[[Clock, visible.length, 'Bloques'], [CalendarDays, new Set(visible.map(b => b.dia_semana)).size, 'Días con clases'], [BookOpen, new Set(visible.map(b => b.curso).filter(Boolean)).size, 'Cursos']] .map(([Icon, count, label]) => {
        const SummaryIcon = Icon as typeof Clock;
        return <div key={String(label)} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4"><SummaryIcon aria-hidden="true" className="mb-2 h-5 w-5 text-primary-600"/><p className="text-xl font-bold">{String(count)}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{String(label)}</p></div>;
      })}
    </section>
    <section aria-label="Filtros de horarios" className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4">
      <label className="block text-sm font-medium" htmlFor="schedule-search">Buscar en horarios</label>
      <div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400"/><input id="schedule-search" type="search" className="input-field pl-10 sm:pl-10" placeholder="Curso, grado, profesor o aula" value={query} onChange={e => setQuery(e.target.value)}/></div>
      <nav aria-label="Días del horario" className="mt-3 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">{['', ...days].map(d => <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)} className={`min-h-11 min-w-0 rounded-xl px-1.5 py-2 text-xs font-medium sm:px-4 sm:text-sm ${day === d ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{d ? dayLabel(d) : 'Semana'}</button>)}</nav>
      {(day || query) && <button type="button" className="mt-3 min-h-11 text-sm font-medium text-primary-700 underline" onClick={() => { setDay(''); setQuery(''); }}>Limpiar filtros</button>}
    </section>
    {!visible.length ? <div role="status" className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700"><CalendarDays aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-gray-400"/><p className="text-sm text-gray-500 dark:text-gray-400">{blocks.length ? 'Sin clases para estos filtros.' : emptyMessage}</p></div> : <div aria-label="Horario semanal" className={`grid items-start gap-4 ${day ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
      {days.filter(d => !day || d === day).map(d => {
        const rows = visible.filter(b => b.dia_semana === d).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.hora_fin.localeCompare(b.hora_fin) || a.id - b.id);
        return <section key={d} aria-label={`Clases del ${dayLabel(d)}`} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{dayLabel(d)}</h2><span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{rows.length} {rows.length === 1 ? 'bloque' : 'bloques'}</span></div>
          {!rows.length ? <p className="py-3 text-sm text-gray-500 dark:text-gray-400">Sin clases</p> : <div className="space-y-3">{rows.map(b => <article key={b.id} aria-label={`${b.curso || 'Curso'} · ${b.hora_inicio.slice(0, 5)}`} className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-700"><Clock aria-hidden="true" className="h-4 w-4 shrink-0"/><span>{b.hora_inicio.slice(0, 5)}–{b.hora_fin.slice(0, 5)}</span></div>
            <h3 className="break-words font-semibold [overflow-wrap:anywhere]">{b.curso || 'Curso sin nombre'}</h3>
            <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">{[b.grado, b.periodo].filter(Boolean).join(' · ')}</p>
            <p className="mt-3 flex items-start gap-2 break-words text-sm text-gray-600 dark:text-gray-300"><UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"/><span className="min-w-0 [overflow-wrap:anywhere]">{b.profesor || 'Sin profesor registrado'}</span></p>
            <p className="mt-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"/><span className="min-w-0 break-words">{b.aula ? `Aula ${b.aula}` : 'Sin aula'}</span></p>
            {b.historical && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Horario histórico sin oferta; no se proyecta en el calendario.</p>}
            {actions && <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">{actions(b)}</div>}
          </article>)}</div>}
        </section>;
      })}
    </div>}
  </div>;
}
