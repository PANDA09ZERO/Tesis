import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/ui/SearchInput';
import { alumnosApi, tramitesApi, type Tramite } from '../../api/endpoints';
import { useDebounce } from '../../hooks/useDebounce';
import { ESTADOS_TRAMITE, tipoTramiteLabel, fechaCorta } from './tramites';

/** Bandeja de trámites de todos los alumnos y exalumnos. */
export default function TramitesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('pendientes');
  const [rows, setRows] = useState<Tramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [consulta, setConsulta] = useState('');
  const debounced = useDebounce(consulta);
  const [encontrados, setEncontrados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const request = useRef(0);

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const params = filtro === 'pendientes' ? { pendientes: '1' as const } : filtro ? { estado: filtro } : undefined;
      setRows((await tramitesApi.getAll(params)).data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'No se pudieron cargar los trámites'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filtro]);

  useEffect(() => {
    const id = ++request.current;
    if (debounced.trim().length < 2) { setEncontrados([]); return; }
    setBuscando(true);
    Promise.all([alumnosApi.getAll({ search: debounced, limit: 8 }), alumnosApi.getAll({ search: debounced, limit: 8, historicos: '1' })])
      .then(([actuales, exalumnos]) => { if (id === request.current) setEncontrados([...(actuales.data.data || []), ...(exalumnos.data.data || [])]); })
      .catch(() => { if (id === request.current) setEncontrados([]); })
      .finally(() => { if (id === request.current) setBuscando(false); });
  }, [debounced]);

  const q = texto.trim().toLowerCase();
  const visibles = q ? rows.filter(t => `${t.nombre} ${t.apellido} ${t.dni || ''} ${t.codigo_alumno}`.toLowerCase().includes(q)) : rows;

  const columns = [
    { key: 'alumno', label: 'Alumno', render: (t: Tramite) => <div><p className="font-medium">{t.apellido}, {t.nombre}</p><p className="text-xs text-gray-500">{t.dni ? 'DNI ' + t.dni : t.codigo_alumno}{t.es_historico ? ' · Exalumno' : ''}</p></div> },
    { key: 'tipo', label: 'Trámite', render: (t: Tramite) => <div><p>{tipoTramiteLabel(t.tipo)}</p>{t.destino && <p className="text-xs text-gray-500">{t.destino}</p>}</div> },
    { key: 'created_at', label: 'Pedido', render: (t: Tramite) => fechaCorta(t.created_at) },
    { key: 'estado', label: 'Estado', summary: true, render: (t: Tramite) => <Badge variant={ESTADOS_TRAMITE[t.estado].variant}>{ESTADOS_TRAMITE[t.estado].label}</Badge> }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Trámites y certificados</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pedidos de traslado, certificados de estudios y constancias de alumnos y exalumnos. Ábrelos para avanzar su estado, adjuntar el documento o imprimir constancias.</p>
      </div>
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={texto} onChange={setTexto} placeholder="Filtrar por alumno o DNI..." className="w-full sm:w-72" />
        <select aria-label="Estado del trámite" className="input-field w-full sm:w-56" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="pendientes">Pendientes</option>
          {Object.entries(ESTADOS_TRAMITE).map(([v, e]) => <option key={v} value={v}>{e.label}</option>)}
          <option value="">Todos</option>
        </select>
        <button type="button" className="btn-primary flex items-center justify-center gap-2 sm:ml-auto" onClick={() => { setConsulta(''); setEncontrados([]); setBuscar(true); }}><Plus className="h-4 w-4" /> Nuevo trámite</button>
      </div>
      {error ? <div className="card text-red-600" role="alert">{error} <button className="btn-secondary ml-2" onClick={() => void cargar()}>Reintentar</button></div>
        : <DataTable columns={columns} data={visibles} isLoading={loading} onRowClick={t => navigate(`/alumnos/${t.alumno_id}`)}
            emptyMessage={filtro === 'pendientes' ? 'No hay trámites pendientes' : 'No hay trámites con este filtro'} />}

      <Modal isOpen={buscar} onClose={() => setBuscar(false)} title="¿Para qué alumno es el trámite?" size="md">
        <div className="space-y-3">
          <SearchInput value={consulta} onChange={setConsulta} placeholder="Nombre, apellido, DNI o código..." className="w-full" />
          {buscando && <p className="text-sm text-gray-500" role="status">Buscando…</p>}
          {!buscando && debounced.trim().length >= 2 && !encontrados.length && <p className="text-sm text-gray-500">Sin resultados. Si es un exalumno que no está en el sistema, regístralo primero en Exalumnos.</p>}
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {encontrados.map(a => <li key={a.id}><button type="button" className="flex w-full items-center justify-between gap-3 rounded px-2 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => navigate(`/alumnos/${a.id}#tramites-alumno-titulo`)}>
              <span><span className="font-medium">{a.apellido}, {a.nombre}</span><span className="block text-xs text-gray-500">{a.dni ? 'DNI ' + a.dni : a.codigo_alumno}</span></span>
              <Badge variant={a.es_historico ? 'default' : 'info'}>{a.es_historico ? 'Exalumno' : 'Alumno'}</Badge>
            </button></li>)}
          </ul>
          <p className="text-xs text-gray-500">Se abrirá su ficha, donde registras el trámite en la sección “Trámites y certificados”.</p>
        </div>
      </Modal>
    </div>
  );
}
