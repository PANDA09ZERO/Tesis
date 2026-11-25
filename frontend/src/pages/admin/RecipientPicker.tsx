import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { usersApi } from '../../api/endpoints';
import { useDebounce } from '../../hooks/useDebounce';

export type Recipient = { id: number; nombre: string; apellido: string; email: string; rol: string };

const ROLES: Record<string, string> = { administrador: 'Administración', profesor: 'Profesor', alumno: 'Alumno', apoderado: 'Apoderado' };

/** Busca una cuenta activa por nombre, apellido o correo y la elige como destinatario. */
export default function RecipientPicker({ value, onChange }: { value: Recipient | null; onChange: (recipient: Recipient | null) => void }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [results, setResults] = useState<Recipient[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const request = useRef(0);

  useEffect(() => {
    const term = debounced.trim();
    if (value || term.length < 2) { setResults([]); setStatus('idle'); return; }
    const current = ++request.current;
    setStatus('loading');
    usersApi.getAll({ search: term, activo: 1, limit: 8 })
      .then(res => { if (current === request.current) { setResults((res.data.data || []) as Recipient[]); setStatus('idle'); } })
      .catch(() => { if (current === request.current) { setResults([]); setStatus('error'); } });
  }, [debounced, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700" aria-live="polite">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.nombre} {value.apellido}</p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{ROLES[value.rol] || value.rol} · {value.email}</p>
        </div>
        <button type="button" onClick={() => { onChange(null); setQuery(''); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Cambiar destinatario">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const term = query.trim();
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} className="input-field pl-9" placeholder="Nombre, apellido o correo" aria-label="Buscar destinatario" autoComplete="off" />
      </div>
      {term.length >= 2 && (
        <div className="mt-2" aria-live="polite">
          {status === 'loading' && <p className="text-sm text-gray-500">Buscando…</p>}
          {status === 'error' && <p className="text-sm text-red-600 dark:text-red-400" role="alert">No se pudo buscar. Vuelve a intentarlo.</p>}
          {status === 'idle' && debounced.trim() === term && !results.length && <p className="text-sm text-gray-500">No hay cuentas activas con ese nombre o correo.</p>}
          {status === 'idle' && results.length > 0 && (
            <ul className="max-h-60 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700" aria-label="Resultados de destinatario">
              {results.map(r => (
                <li key={r.id}>
                  <button type="button" onClick={() => onChange(r)} className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800" aria-label={`Elegir a ${r.nombre} ${r.apellido}`}>
                    <span className="block font-medium">{r.nombre} {r.apellido}</span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">{ROLES[r.rol] || r.rol} · {r.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
