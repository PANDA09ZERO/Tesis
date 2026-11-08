import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {familiaApi} from '../../api/endpoints';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import IncidenciasAlumno from '../incidencias/IncidenciasAlumno';
import {DetalleFamilia,VistaFamilia,vistasFamilia,fechaFamilia} from './familia';

export default function FamilyStudentDetailPage(){
 const {id}=useParams();const [params,setParams]=useSearchParams();const periodo=params.get('periodo_id');
 const vista=(params.get('vista')||'resumen') as VistaFamilia;const tab=Object.prototype.hasOwnProperty.call(vistasFamilia,vista)?vista:'resumen';
 const [data,setData]=useState<DetalleFamilia|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setData(null);
  familiaApi.getDetalle(Number(id),periodo===null?undefined:periodo).then(response=>{if(!response.data.data?.alumno)throw Error('Respuesta del estudiante inválida');if(active)setData(response.data.data);})
   .catch(e=>{if(active)setError(e.response?.data?.message||e.message||'No se pudo cargar el estudiante');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[id,periodo,reload]);
 function select(key:string,value:string){const next=new URLSearchParams(params);next.set(key,value);setParams(next);}
 return <div className="space-y-4"><Link className="btn-secondary" to="/familia/alumnos">Volver a estudiantes a mi cargo</Link>
 {loading?<div className="card" role="status">Cargando información del estudiante…</div>:error?<div className="card text-red-600" role="alert"><p>{error}</p><button className="btn-secondary mt-3" onClick={()=>setReload(n=>n+1)}>Reintentar</button></div>:data&&<>
  <header className="card space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-semibold">{data.alumno.nombre} {data.alumno.apellido}</h1><p className="text-sm text-gray-500">{data.alumno.codigo_alumno} · Parentesco: {data.alumno.parentesco||'No registrado'}</p><p>{data.grado||'Sin grado matriculado en este periodo'}</p></div><button className="btn-secondary" onClick={()=>setReload(n=>n+1)}>Actualizar</button></div>
   <label className="block text-sm">Periodo académico<select className="input-field mt-1 sm:max-w-md" value={data.periodo?.id||''} disabled={!data.periodos.length} onChange={e=>select('periodo_id',e.target.value)}>{!data.periodos.length&&<option value="">Sin periodos registrados</option>}{data.periodos.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.activo?'Activo':'Histórico'}</option>)}</select></label>
   <p className="text-sm text-gray-500">Consulta académica. Los cambios de datos y vínculos se solicitan a administración.</p></header>
  <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Secciones del estudiante">{(Object.keys(vistasFamilia) as VistaFamilia[]).map(v=><button key={v} className={`${tab===v?'btn-primary':'btn-secondary'} shrink-0`} aria-current={tab===v?'page':undefined} onClick={()=>select('vista',v)}>{vistasFamilia[v]}</button>)}</nav>
  {data.resumen.asistencias_sin_periodo>0&&<p className="card text-sm text-gray-600">Hay {data.resumen.asistencias_sin_periodo} registros antiguos de asistencia sin un periodo inequívoco. No se incluyen en los totales del periodo; solicita revisión a administración.</p>}
  {tab==='resumen'&&<>
   <section className="card"><h2 className="mb-3 font-semibold">Resumen de {data.periodo?.nombre||'información académica'}</h2><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Cursos',data.resumen.cursos],['Calificaciones',data.resumen.calificaciones],['Registros de asistencia',data.resumen.registros_asistencia],['Días con registro',data.resumen.dias_asistencia]].map(([label,value])=><div key={label} className="rounded-lg bg-gray-50 p-3"><dt className="text-sm text-gray-500">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}</dl></section>
   <section className="card"><h2 className="mb-3 font-semibold">Inasistencias registradas</h2><h3 className="font-medium">Inasistencias del periodo</h3>{data.pendientes.inasistencias.length?<ul className="my-3 space-y-2">{data.pendientes.inasistencias.map(a=><li key={a.id}>{fechaFamilia(a.fecha)} · {a.curso||'Sin curso registrado'} · Ausente</li>)}</ul>:<p className="my-3 text-sm text-gray-500">Sin inasistencias registradas en este periodo.</p>}</section>
  </>}
  {tab==='cursos'&&<><section className="card"><h2 className="mb-3 font-semibold">Cursos de la matrícula</h2>{!data.matriculas.length?<p>Sin matrícula registrada en este periodo.</p>:data.matriculas.map(m=><div key={m.id} className="mb-4 space-y-2"><h3 className="font-medium">{m.grado||'Sin grado registrado'}</h3>{m.inscripciones.map(c=><div key={c.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3"><span>{c.curso||'Matrícula sin curso asignado'}{c.codigo?' · '+c.codigo:''}</span><Badge variant={c.estado==='activa'?'success':'info'}>{c.estado}</Badge></div>)}</div>)}</section><section className="space-y-3"><h2 className="font-semibold">Horarios del periodo</h2><DataTable data={data.horarios} columns={[{key:'curso',label:'Curso'},{key:'grado',label:'Grado'},{key:'profesor',label:'Profesor'},{key:'dia_semana',label:'Día'},{key:'hora_inicio',label:'Inicio'},{key:'hora_fin',label:'Fin'},{key:'aula',label:'Aula'}]} emptyMessage="Sin horarios registrados para sus cursos matriculados en este periodo"/></section></>}
  {tab==='calificaciones'&&<section className="space-y-3"><h2 className="font-semibold">Calificaciones del periodo</h2><p className="text-sm text-gray-500">Se conserva la nota y su escala original. No se asigna aprobación ni promedio a registros sin escala.</p><DataTable data={data.calificaciones} columns={[{key:'curso',label:'Curso'},{key:'fecha',label:'Fecha',render:r=>fechaFamilia(r.fecha)},{key:'nota',label:'Nota'},{key:'escala_maxima',label:'Escala máxima',render:r=>r.escala_maxima??'Histórica sin escala'}]} emptyMessage="Sin calificaciones registradas en este periodo"/></section>}
  {tab==='asistencia'&&<section className="space-y-3"><h2 className="font-semibold">Asistencia del periodo</h2><p className="text-sm text-gray-500">{data.resumen.registros_asistencia} registros de clase · {data.resumen.dias_asistencia} días con registro. Una fecha puede tener registros de varios cursos.</p><DataTable data={data.asistencias} columns={[{key:'fecha',label:'Fecha',render:r=>fechaFamilia(r.fecha)},{key:'curso',label:'Curso',render:r=>r.curso||'Sin curso registrado'},{key:'estado',label:'Estado'},{key:'minutos_tardanza',label:'Minutos de tardanza'}]} emptyMessage="Sin asistencia registrada en este periodo"/></section>}
 {tab==='incidencias'&&<IncidenciasAlumno alumnoId={Number(id)} vistaFamilia/>}
 </>}
 </div>;
}
