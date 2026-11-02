import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {profesorPersonalApi,configuracionApi,horariosApi,notificacionesApi} from '../../api/endpoints';
import {useAuth} from '../../context/AuthContext';
import Badge from '../../components/ui/Badge';
export default function ProfesorPanelPage(){
 const {user}=useAuth();const navigate=useNavigate();
 const [resumen,setResumen]=useState<any>(null),[periodo,setPeriodo]=useState('');
 const [ofertas,setOfertas]=useState<any[]>([]),[horarios,setHorarios]=useState<any[]>([]),[avisos,setAvisos]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setResumen(null);setOfertas([]);setHorarios([]);setAvisos([]);
  async function load(){try{const response=await profesorPersonalApi.getResumen(periodo?Number(periodo):undefined);const summary=response.data.data;const p=summary.periodo?.id;
   const [offers,schedules,notifications]=await Promise.all([p?configuracionApi.getOfertas({periodo_id:p}):Promise.resolve(null),p?horariosApi.getAll({periodo_id:p}):Promise.resolve(null),notificacionesApi.getAll({page:1,limit:5})]);
   if(!active)return;setResumen(summary);setOfertas(offers?.data.data||[]);setHorarios(schedules?.data.data||[]);setAvisos(notifications.data.data||[]);
  }catch(e:any){if(active)setError(e.response?.data?.message||'No se pudo cargar tu panel');}finally{if(active)setLoading(false);}}
  load();return()=>{active=false;};
 },[periodo,reload,user?.id]);
 if(error)return <div className="card text-red-600" role="alert">{error}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div>;
 return <div className="space-y-4"><header className="card space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-semibold">Mi panel de profesor</h1><p className="text-sm text-gray-500">{user?.nombre} {user?.apellido}</p></div><button className="btn-secondary" disabled={loading} onClick={()=>setReload(v=>v+1)}>Actualizar</button></div>
  {resumen&&<label className="block text-sm">Periodo académico<select className="input-field mt-1 sm:max-w-md" value={periodo||String(resumen.periodo?.id||'')} onChange={e=>setPeriodo(e.target.value)} disabled={!resumen.periodos.length}>{!resumen.periodos.length&&<option value="">Sin periodo asignado</option>}{resumen.periodos.map((p:any)=><option key={p.id} value={p.id}>{p.nombre}{p.activo?' · Activo':' · Histórico'}</option>)}</select></label>}
  {resumen?.periodo&&<Badge variant={resumen.periodo.activo?'success':'info'}>{resumen.periodo.activo?'Periodo activo':'Histórico · Solo consulta'}</Badge>}</header>
  {loading?<div className="card animate-pulse h-48"/>:resumen&&<>
   {!resumen.periodo&&<p className="card text-gray-500">No tienes ofertas académicas asignadas. Tu perfil y tus notificaciones personales siguen disponibles.</p>}
   <div className="grid gap-3 sm:grid-cols-3">{[['Mis alumnos',resumen.totalAlumnos],['Mis grupos',resumen.totalCursos],['Alertas de mis alumnos',resumen.alertasActivas]].map(([label,value])=><div key={label} className="card"><p className="text-sm text-gray-500">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>
   <section className="card"><h2 className="mb-3 font-semibold">Mis cursos y grupos</h2>{ofertas.length?<div className="grid gap-3 sm:grid-cols-2">{ofertas.map(o=><button key={o.periodo_grado_curso_id} className="rounded-lg bg-gray-50 p-3 text-left text-primary-700" onClick={()=>navigate(`/cursos/oferta/${o.periodo_grado_curso_id}`)}>{o.curso} · {o.grado} · {o.alumnos_count||0} alumnos</button>)}</div>:<p className="text-gray-500">Sin grupos asignados en este periodo.</p>}</section>
   <section className="card"><h2 className="mb-3 font-semibold">Próximas evaluaciones</h2>{resumen.evaluaciones.length?resumen.evaluaciones.map((e:any)=><button key={e.id} className="block py-2 text-left text-sm text-primary-700" onClick={()=>navigate(`/calificaciones/oferta/${e.oferta_id}`)}>{e.fecha_evaluacion} · {e.curso} · {e.grado} · {e.nombre}</button>):<p className="text-gray-500">Sin próximas evaluaciones activas registradas.</p>}</section>
   <section className="card"><h2 className="mb-3 font-semibold">Mis horarios</h2>{horarios.length?horarios.map(h=><p key={h.id} className="py-1 text-sm">{h.curso_nombre} · {h.grado} · {h.dia_semana} · {h.hora_inicio}–{h.hora_fin}{h.aula?' · Aula '+h.aula:''}</p>):<p className="text-gray-500">Sin horarios asignados en este periodo.</p>}</section>
   <section className="card"><h2 className="mb-3 font-semibold">Mis avisos personales</h2>{avisos.length?avisos.map(a=><article key={a.id} className="mb-3"><p className="font-medium">{a.titulo} {!a.leida&&<Badge variant="info">No leída</Badge>}</p><p className="text-sm text-gray-600">{a.mensaje}</p></article>):<p className="mb-3 text-gray-500">Sin notificaciones personales.</p>}<button className="btn-secondary" onClick={()=>navigate('/profesor/notificaciones')}>Ver mis notificaciones</button></section>
  </>}
 </div>;
}
