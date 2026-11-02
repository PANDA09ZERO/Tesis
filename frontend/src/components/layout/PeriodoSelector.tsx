import React from 'react';
import { CalendarDays } from 'lucide-react';
import { usePeriodo } from '../../context/PeriodoContext';

export default function PeriodoSelector() {
  const { periodos, periodoId, setPeriodoId, periodo, esVigente, esHistorico, todos } = usePeriodo();

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="hidden h-4 w-4 shrink-0 text-gray-400 sm:block" aria-hidden="true" />
      <select
        aria-label="Periodo académico de consulta"
        className="input-field h-9 w-full max-w-full min-w-0 py-1 text-sm sm:w-auto sm:max-w-[16rem]"
        value={periodoId}
        onChange={e => setPeriodoId(e.target.value)}
      >
        <option value="">Todos los periodos</option>
        {periodos.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' · Vigente' : ' · Histórico'}</option>
        ))}
      </select>
      {!todos && (
        <span
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex ${
            esVigente ? 'bg-green-100 text-green-800' : esHistorico ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {esVigente ? 'Vigente' : 'Histórico'}
        </span>
      )}
      {todos && (
        <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 sm:inline-flex">
          Sin filtro
        </span>
      )}
      <span className="sr-only">
        {todos ? 'Consultando todos los periodos' : `Consultando el periodo ${periodo?.nombre}`}
      </span>
    </div>
  );
}
