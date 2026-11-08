import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Users} from 'lucide-react';
import {familiaApi} from '../../api/endpoints';
import Badge from '../../components/ui/Badge';
import InstallAppCard from '../../components/ui/InstallAppCard';
import {ResumenFamilia,vistasFamilia,VistaFamilia} from './familia';
export default function FamilyStudentsPage(){
 const [data,setData]=useState<ResumenFamilia[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setData([]);
  familiaApi.getInicio().then(response=>{if(!Array.isArray(response.data.data))throw Error('Respuesta de estudiantes inválida');if(active)setData(response.data.data);})
   .catch(e=>{if(active)setError(e.response?.data?.message||e.message||'No se pudo cargar el inicio familiar');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[reload]);
 return <div className="space-y-4"><InstallAppCard />
  <header className="card flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">Estudiantes a mi cargo</h1><p className="text-sm text-gray-500">Consulta su avance académico y la asistencia registrada.</p></div><button className="btn-secondary" disabled={loading} onClick={()=>setReload(n=>n+1)}>Actualizar</button></header>
  {loading?<div className="card" role="status"><p>Cargando estudiantes y sus resúmenes…</p><div className="mt-3 h-24 animate-pulse rounded-lg bg-gray-100"/></div>:error?<div role="alert" className="card text-red-600"><p>{error}</p><button className="btn-secondary mt-3" onClick={()=>setReload(n=>n+1)}>Reintentar</button></div>:!data.length?<section className="card py-12 text-center"><Users className="mx-auto mb-3 h-8 w-8 text-gray-400"/><h2 className="font-semibold">No hay estudiantes vinculados</h2><p className="mt-2 text-sm text-gray-500">Solicita a administración que vincule tu cuenta con el estudiante a tu cargo. Los datos aparecerán cuando complete la asignación.</p></section>:<div className="grid gap-4 xl:grid-cols-2">{data.map(item=><article key={item.alumno.id} className="card space-y-4">
   <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-semibold">{item.alumno.nombre} {item.alumno.apellido}</h2><p className="text-sm text-gray-500">{item.alumno.codigo_alumno} · Parentesco: {item.alumno.parentesco||'No registrado'}</p></div><Badge variant={item.periodo?.activo?'success':'info'}>{item.periodo?(item.periodo.activo?'Periodo activo':'Último periodo registrado'):'Sin periodo registrado'}</Badge></div>
   <div><p className="font-medium">{item.periodo?.nombre||'Sin información académica registrada'}</p><p className="text-sm text-gray-600">{item.grado||'Sin grado matriculado en este periodo'}</p></div>
   <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Cursos',item.resumen.cursos],['Calificaciones',item.resumen.calificaciones],['Inasistencias',item.resumen.ausencias]].map(([label,value])=><div key={label} className="rounded-lg bg-gray-50 p-3"><dt className="text-sm text-gray-500">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}</dl>
   <p className="text-xs text-gray-500">Cursos, notas e inasistencias corresponden al periodo indicado.</p>
   <nav aria-label={`Consultar a ${item.alumno.nombre} ${item.alumno.apellido}`} className="flex flex-wrap gap-2">{(Object.keys(vistasFamilia) as VistaFamilia[]).map(vista=><Link className="btn-secondary text-sm" key={vista} to={`/alumnos/${item.alumno.id}?vista=${vista}${item.periodo?'&periodo_id='+item.periodo.id:''}`}>{vistasFamilia[vista]}</Link>)}</nav>
  </article>)}</div>}
 </div>;
}
