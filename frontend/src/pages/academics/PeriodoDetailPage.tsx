import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Calendar, GraduationCap, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { periodosApi, configuracionApi, matriculasApi, horariosApi, pagosMatriculaApi, mensualidadesApi } from '../../api/endpoints';
import type { DetallePeriodo } from '../../types';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import StatCard from '../../components/ui/StatCard';

type Tab = 'resumen' | 'estructura' | 'matriculas' | 'horarios' | 'academico' | 'pagos_matricula' | 'mensualidades';
type Row = {id?: number; [key:string]: any};
const labels: Record<Tab,string> = {resumen:'Resumen', estructura:'Estructura académica', matriculas:'Matrículas', horarios:'Horarios', academico:'Calificaciones y asistencia', pagos_matricula:'Pagos de matrícula', mensualidades:'Mensualidades'};
const date = (value?: string) => value ? value.slice(0,10).split('-').reverse().join('/') : '—';
const money = (value: unknown) => `S/ ${Number(value || 0).toFixed(2)}`;
const message = (error: any) => error.response?.data?.message || error.message || 'No se pudo completar la consulta';

export default function PeriodoDetailPage() {
  const {id = ''} = useParams();
  const {user} = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const [search, setSearch] = useSearchParams();
  const [detail, setDetail] = useState<DetallePeriodo | null>(null);
  const [loadedId, setLoadedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const allowed = (Object.keys(labels) as Tab[]).filter(tab => isAdmin || !['pagos_matricula','mensualidades'].includes(tab));
  const requested = search.get('seccion') as Tab;
  const tab = allowed.includes(requested) ? requested : 'resumen';
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDetail(null);
    if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) {setError('Periodo inválido');setLoading(false);return;}
    periodosApi.getById(Number(id)).then(response => {
      if (!active) return;
      if (!response.data.data) throw new Error('El servidor no devolvió el detalle del periodo');
      setDetail(response.data.data); setLoadedId(id);
    }).catch(error => {if (active) setError(message(error));}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [id, reload]);
  if (error) return <div className="space-y-3"><Link className="btn-secondary inline-block" to="/periodos">Volver a Periodos</Link><div className="card text-red-600" role="alert">{error}<button className="btn-secondary ml-3" onClick={() => setReload(value => value+1)}>Reintentar detalle</button></div></div>;
  if (loading || !detail || loadedId !== id) return <div className="card animate-pulse h-40" role="status">Cargando detalle del periodo…</div>;
  const {periodo, resumen} = detail;
  return <div className="space-y-5">
    <Link className="inline-block text-sm text-primary-600" to="/periodos">← Volver a Periodos</Link>
    <header className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Detalle del periodo: {periodo.nombre}</h1><Badge variant={periodo.activo ? 'success' : 'default'}>{periodo.activo ? 'Activo' : 'Inactivo'}</Badge></div>
      <p className="text-sm text-gray-600">{date(periodo.fecha_inicio)} al {date(periodo.fecha_fin)}</p>
      {!isAdmin && <p className="text-sm text-gray-600">Solo se muestra información de tus asignaciones.{!periodo.activo && ' Periodo histórico: solo consulta.'}</p>}
    </header>
    <nav className="flex flex-wrap gap-2" aria-label="Secciones del periodo">{allowed.map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? 'btn-primary' : 'btn-secondary'} onClick={() => setSearch({seccion:value})}>{value === 'matriculas' && !isAdmin ? 'Mis alumnos por curso' : labels[value]}</button>)}</nav>
    {tab === 'resumen' ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Grados" value={resumen.grados} icon={GraduationCap}/><StatCard title="Cursos distintos" value={resumen.cursos} icon={BookOpen}/><StatCard title="Profesores asignados" value={resumen.profesores} icon={Users}/><StatCard title="Alumnos con matrícula activa" value={resumen.alumnos_activos} icon={Users}/><StatCard title="Inscripciones por curso" value={resumen.inscripciones} icon={ClipboardList}/><StatCard title="Bloques de horario" value={resumen.horarios} icon={Calendar}/>
      </div>
      <p className="text-sm text-gray-500">{resumen.ofertas} ofertas de grado y curso. Los alumnos se cuentan una sola vez; las inscripciones incluyen los estados registrados de cada curso.</p>
    </> : <PeriodPanel key={`${id}:${tab}`} periodId={periodo.id} tab={tab} isAdmin={isAdmin}/>}
  </div>;
}

function PeriodPanel({periodId, tab, isAdmin}:{periodId:number; tab:Tab; isAdmin:boolean}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const payment = tab === 'pagos_matricula' || tab === 'mensualidades';
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]); setSummary([]);
    async function load() {
      if (payment) {
        if (!isAdmin) throw new Error('No tiene acceso a pagos');
        const api = tab === 'pagos_matricula' ? pagosMatriculaApi : mensualidadesApi;
        const params = {periodo_academico_id:periodId};
        const [list, sums] = await Promise.all([api.getAll({...params,page,limit:20}), api.getResumen(params)]);
        if (active) {setRows(list.data.data);setSummary(sums.data.data || []);setTotal(list.data.total);setPages(Math.max(1,list.data.totalPages));}
      } else if (tab === 'matriculas' && isAdmin) {
        const response = await matriculasApi.getAll({periodo_id:periodId,page,limit:20});
        if (active) {setRows(response.data.data);setTotal(response.data.total);setPages(Math.max(1,response.data.totalPages));}
      } else if (tab === 'estructura') {
        const response = await configuracionApi.getEstructura(periodId);
        if (active) setRows(response.data.data?.grados || []);
      } else if (tab === 'horarios') {
        const response = await horariosApi.getAll({periodo_id:periodId});
        const list = response.data.data || [];
        if (active) {setRows(list.slice((page-1)*20,page*20));setTotal(list.length);setPages(Math.max(1,Math.ceil(list.length/20)));}
      } else {
        const response = await configuracionApi.getOfertas({periodo_id:periodId});
        const list = response.data.data || [];
        if (active) {setRows(list.map(row => ({...row,id:row.periodo_grado_curso_id})));setTotal(list.length);}
      }
    }
    load().catch(error => {if (active) setError(message(error));}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [periodId,tab,isAdmin,page,reload,payment]);
  if (loading) return <div className="card animate-pulse h-40" role="status">Cargando {labels[tab].toLowerCase()}…</div>;
  if (error) return <div className="card text-red-600" role="alert">{error}<button className="btn-secondary ml-3" onClick={() => setReload(value => value+1)}>Reintentar sección</button></div>;
  const state = (row:Row) => <Badge variant={row.estado === 'pagado' || row.estado === 'activa' ? 'success' : row.estado === 'pendiente' ? 'warning' : 'default'}>{row.estado}</Badge>;
  const offerColumns = [{key:'grado',label:'Grado'},{key:'curso',label:'Curso'},{key:'alumnos_count',label:'Alumnos con matrícula activa'},{key:'actions',label:'Consultar',render:(row:Row) => <div className="flex flex-wrap gap-3"><Link className="text-primary-600 underline" to={`/cursos/oferta/${row.periodo_grado_curso_id}`}>Alumnos y curso</Link>{tab === 'academico' && <><Link className="text-primary-600 underline" to={`/calificaciones/oferta/${row.periodo_grado_curso_id}`}>Calificaciones</Link><Link className="text-primary-600 underline" to={`/asistencias/oferta/${row.periodo_grado_curso_id}?vista=historial`}>Asistencia</Link></>}</div>}];
  if (tab === 'estructura') return <section className="space-y-4">
    {isAdmin && <Link className="btn-secondary inline-block" to={`/admin/configuracion-academica?periodo_id=${periodId}`}>Gestionar estructura de este periodo</Link>}
    {!rows.length && <div className="card text-gray-500">Sin estructura académica en este periodo.</div>}
    {rows.map(grade => <section key={grade.grado_id} className="space-y-2"><h2 className="font-semibold">{grade.nivel} · {grade.grado}</h2><DataTable data={grade.cursos} emptyMessage="Sin cursos configurados para este grado" columns={[{key:'curso',label:'Curso'},{key:'codigo',label:'Código'},{key:'profesores',label:'Profesores asignados',render:(row:Row) => row.profesores.map((teacher:Row) => `${teacher.nombre} ${teacher.apellido}${teacher.activo ? '' : ' (inactivo)'}`).join(', ') || 'Sin docente asignado'},{key:'detail',label:'Detalle',render:(row:Row) => <Link className="text-primary-600 underline" to={`/cursos/oferta/${row.id}`}>Ver curso</Link>}]}/></section>)}
  </section>;
  const columns = payment ? [
    {key:'alumno',label:'Alumno',render:(row:Row) => `${row.alumno_apellido}, ${row.alumno_nombre} (${row.codigo_alumno})`},
    ...(tab === 'mensualidades' ? [{key:'mes',label:'Mes/año',render:(row:Row) => `${row.mes} ${row.año}`}] : []),
    {key:'monto',label:'Monto',render:(row:Row) => money(row.monto)}, {key:'estado',label:'Estado',render:state}, {key:'fecha_pago',label:'Fecha de pago',render:(row:Row) => date(row.fecha_pago)}
  ] : tab === 'horarios' ? [
    {key:'curso_nombre',label:'Curso'},{key:'grado',label:'Grado'},{key:'profesor_nombre',label:'Profesor'},{key:'dia_semana',label:'Día'},{key:'hora',label:'Horario',render:(row:Row) => `${row.hora_inicio.slice(0,5)} – ${row.hora_fin.slice(0,5)}`},{key:'aula',label:'Aula'}
  ] : tab === 'matriculas' && isAdmin ? [
    {key:'alumno',label:'Alumno',render:(row:Row) => `${row.alumno_apellido}, ${row.alumno_nombre}`},{key:'codigo_alumno',label:'Código'},{key:'grado',label:'Grado'},{key:'curso',label:'Curso'},{key:'estado',label:'Estado',render:state},{key:'fecha_matricula',label:'Fecha',render:(row:Row) => date(row.fecha_matricula)}
  ] : offerColumns;
  const sum = (key:string) => summary.reduce((result,row) => result+Number(row[key] || 0),0);
  return <section className="space-y-4">
    <h2 className="font-semibold">{tab === 'matriculas' && !isAdmin ? 'Mis alumnos por curso' : labels[tab]} del periodo</h2>
    {payment && <div className="grid gap-3 sm:grid-cols-3"><StatCard title="Total registrado" value={money(sum('total_mes'))} icon={ClipboardList}/><StatCard title="Pagado" value={money(sum('total_pagado'))} icon={ClipboardList} color="green"/><StatCard title="Pendiente / vencido" value={money(sum('total_pendiente'))} icon={ClipboardList} color="yellow"/></div>}
    {tab === 'matriculas' && isAdmin && <p className="text-sm text-gray-500">Cada fila corresponde a una inscripción de curso; un alumno puede tener varias.</p>}
    <DataTable data={rows} columns={columns} page={page} totalPages={pages} total={total} onPageChange={setPage} emptyMessage="Sin registros en este periodo"/>
  </section>;
}
