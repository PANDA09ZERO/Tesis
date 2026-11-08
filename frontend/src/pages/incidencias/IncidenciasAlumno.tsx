import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { incidenciasApi } from '../../api/endpoints';
import type { Incidencia } from '../../types';
import { estadoVariant, estadosIncidencia, fechaIncidencia, gravedadVariant, gravedades, tiposIncidencia } from './incidencias';

/** Historial de incidencias de un alumno (detalle del alumno y vista del apoderado). */
export default function IncidenciasAlumno({ alumnoId, registrarHref, vistaFamilia = false }: { alumnoId: number; registrarHref?: string; vistaFamilia?: boolean }) {
  const [items, setItems] = useState<Incidencia[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    incidenciasApi.getByAlumno(alumnoId).then(r => { if (active) setItems(r.data.data || []); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'No se pudieron cargar las incidencias'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [alumnoId, reload]);

  return <section className="card space-y-3" id="student-incidencias">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-amber-600" /> Incidencias de conducta</h3>
      {registrarHref && <Link className="btn-primary text-sm" to={registrarHref}>Registrar incidencia</Link>}
    </div>
    {vistaFamilia && <p className="text-sm text-gray-500">Registros de conducta informados por la institución. Para conversar sobre alguno, comunícate con administración o el tutor.</p>}
    {loading ? <p role="status" className="text-gray-500">Cargando incidencias…</p>
      : error ? <div role="alert" className="text-red-600">{error} <button className="btn-secondary ml-2" onClick={() => setReload(n => n + 1)}>Reintentar</button></div>
      : !items.length ? <p className="py-6 text-center text-gray-500">Sin incidencias registradas.</p>
      : <ul className="space-y-3">{items.map(i => <li key={i.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{tiposIncidencia[i.tipo]}</span>
            <Badge variant={gravedadVariant(i.gravedad)}>{gravedades[i.gravedad]}</Badge>
            <Badge variant={estadoVariant(i.estado)}>{estadosIncidencia[i.estado]}</Badge>
            <span className="ml-auto text-sm text-gray-500">{fechaIncidencia(i.fecha, i.hora)}{i.lugar ? ' · ' + i.lugar : ''}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{i.descripcion}</p>
          {i.medida_tomada && <p className="mt-1 text-sm"><span className="font-medium">Medida tomada:</span> {i.medida_tomada}</p>}
          {i.resolucion && <p className="mt-1 text-sm"><span className="font-medium">Resolución:</span> {i.resolucion}</p>}
          {!vistaFamilia && i.reportado_nombre && <p className="mt-1 text-xs text-gray-400">Registrado por {i.reportado_nombre} {i.reportado_apellido}</p>}
        </li>)}</ul>}
  </section>;
}
