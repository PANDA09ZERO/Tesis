import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { consultaApi, type PersonaDni } from '../../api/endpoints';

interface Props {
  id: string;
  value: string;
  onChange: (dni: string) => void;
  /** Se llama cuando RENIEC devuelve la persona: rellena nombre y apellido. */
  onFound: (persona: PersonaDni) => void;
}

type Estado = { tipo: 'idle' } | { tipo: 'cargando' } | { tipo: 'ok'; texto: string; aviso?: string } | { tipo: 'error'; texto: string };

/** Campo DNI que consulta RENIEC al completar 8 dígitos, como al emitir una boleta. */
export default function DniLookupField({ id, value, onChange, onFound }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'idle' });
  const ultimo = useRef('');

  const buscar = async (dni: string) => {
    if (!/^\d{8}$/.test(dni)) { setEstado({ tipo: 'error', texto: 'Ingresa 8 dígitos.' }); return; }
    ultimo.current = dni;
    setEstado({ tipo: 'cargando' });
    try {
      const { data } = await consultaApi.dni(dni);
      if (ultimo.current !== dni || !data.data) return;
      const p = data.data;
      onFound(p);
      setEstado({
        tipo: 'ok',
        texto: `${p.nombre} ${p.apellido}`,
        aviso: p.registrado ? `Este DNI ya está registrado: ${p.registrado.nombre}.` : undefined,
      });
    } catch (err: any) {
      if (ultimo.current !== dni) return;
      setEstado({ tipo: 'error', texto: err?.response?.data?.message || 'No se pudo consultar el DNI. Llena los datos a mano.' });
    }
  };

  useEffect(() => {
    if (/^\d{8}$/.test(value) && value !== ultimo.current) void buscar(value);
    if (value.length < 8) { ultimo.current = ''; setEstado({ tipo: 'idle' }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
      <div className="flex gap-2">
        <input id={id} type="text" inputMode="numeric" autoComplete="off" maxLength={8} placeholder="8 dígitos"
          value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void buscar(value); } }}
          className="input-field flex-1" aria-describedby={`${id}-estado`} />
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void buscar(value)}
          disabled={estado.tipo === 'cargando'} aria-label="Buscar DNI en RENIEC">
          {estado.tipo === 'cargando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar
        </button>
      </div>
      <p id={`${id}-estado`} role="status" className="mt-1 min-h-[1.25rem] text-sm">
        {estado.tipo === 'idle' && <span className="text-gray-500">Escribe el DNI y se llenarán nombre y apellido.</span>}
        {estado.tipo === 'cargando' && <span className="text-gray-500">Consultando RENIEC…</span>}
        {estado.tipo === 'ok' && <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-4 w-4" />{estado.texto}</span>}
        {estado.tipo === 'ok' && estado.aviso && <span className="mt-1 flex items-center gap-1 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-4 w-4" />{estado.aviso}</span>}
        {estado.tipo === 'error' && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4" />{estado.texto}</span>}
      </p>
    </div>
  );
}
