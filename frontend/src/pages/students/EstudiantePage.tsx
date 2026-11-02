import {useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {estudianteApi,notificacionesApi} from '../../api/endpoints';
import {useAuth} from '../../context/AuthContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import WeeklySchedule from '../../components/academics/WeeklySchedule';

type Vista = 'inicio'|'cursos'|'calificaciones'|'asistencia'|'horarios'|'pagos';
const dinero = (v:unknown)=>`S/ ${Number(v || 0).toFixed(2)}`;
const mensaje = (e:any)=>e.response?.data?.message || 'No se pudo conectar con el servidor';
const nombres:Record<Vista,string> = {inicio:'Mi panel',cursos:'Mis cursos',calificaciones:'Mis calificaciones',asistencia:'Mi asistencia',horarios:'Mis horarios',pagos:'Mis pagos'};
const estado = (value:string)=><Badge variant={value==='pagado'||value==='activa'||value==='presente'?'success':value==='pendiente'||value==='tardanza'?'warning':'info'}>{value}</Badge>;
export default function EstudiantePage({vista='inicio'}:{vista?:Vista}) {
  const {user}=useAuth();
  const navigate=useNavigate();
  const [contexto,setContexto]=useState<any>(null);
  const [periodo,setPeriodo]=useState('');
  const [datos,setDatos]=useState<any>(null);
  const [loadingContexto,setLoadingContexto]=useState(true);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [periodError,setPeriodError]=useState('');
  const [reload,setReload]=useState(0);
  const [tipoPago,setTipoPago]=useState<'matricula'|'mensualidades'>('matricula');
  const [filtroEstado,setFiltroEstado]=useState('');
  const [filtroMes,setFiltroMes]=useState('');
  const [filtroAño,setFiltroAño]=useState('');
  const [cursoFiltro,setCursoFiltro]=useState('');
  const [fechaInicio,setFechaInicio]=useState('');
  const [fechaFin,setFechaFin]=useState('');
  const [avisos,setAvisos]=useState<any[]>([]);
  const [avisosLoading,setAvisosLoading]=useState(false);
  const [avisosError,setAvisosError]=useState('');
  useEffect(()=>{
    let active=true;setLoadingContexto(true);setError('');setContexto(null);setDatos(null);
    estudianteApi.getContexto().then(r=>{
      if(!active)return;
      const ctx=r.data.data;setContexto(ctx);
      setPeriodo(current=>ctx.periodos.some((p:any)=>String(p.id)===current)?current:String((ctx.periodos.find((p:any)=>p.activo)||ctx.periodos[0])?.id||''));
    }).catch(e=>{if(active)setError(mensaje(e));}).finally(()=>{if(active)setLoadingContexto(false);});
    return ()=>{active=false;};
  },[reload,user?.id]);
  useEffect(()=>{
    let active=true;setDatos(null);setPeriodError('');setCursoFiltro('');setFechaInicio('');setFechaFin('');
    if(!contexto || !periodo){setLoading(false);return;}
    setLoading(true);
    estudianteApi.getPeriodo(Number(periodo)).then(r=>{if(active)setDatos(r.data.data);})
      .catch(e=>{if(active)setPeriodError(mensaje(e));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[contexto,periodo]);
  useEffect(()=>{
    let active=true;
    if(vista!=='inicio')return;
    setAvisos([]);setAvisosLoading(true);setAvisosError('');
    notificacionesApi.getAll({page:1,limit:5}).then(r=>{if(active)setAvisos(r.data.data||[]);})
      .catch(e=>{if(active)setAvisosError(mensaje(e));}).finally(()=>{if(active)setAvisosLoading(false);});
    return ()=>{active=false;};
  },[vista,reload,user?.id]);
  if(loadingContexto)return <div className="card animate-pulse h-48"/>;
  if(error)return <div className="card text-red-600" role="alert">{error}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div>;
  if(!contexto)return null;
  const alumno=contexto.alumno;
  const selected=contexto.periodos.find((p:any)=>String(p.id)===periodo);
  const cursos=datos?.cursos || [];
  const pagoMatricula=datos?.pago_matricula;
  const notas=(datos?.calificaciones || []).filter((n:any)=>!cursoFiltro||String(n.curso_id)===cursoFiltro);
  const asistencias=(datos?.asistencias || []).filter((a:any)=>(!cursoFiltro||String(a.curso_id)===cursoFiltro)&&(!fechaInicio||a.fecha>=fechaInicio)&&(!fechaFin||a.fecha<=fechaFin));
  const cargos=(tipoPago==='matricula'?(pagoMatricula?[pagoMatricula]:[]):datos?.mensualidades || []).filter((p:any)=>(!filtroEstado||p.estado===filtroEstado)&&(tipoPago==='matricula'||(!filtroMes||p.mes===filtroMes)&&(!filtroAño||Number(p.año)===Number(filtroAño))));
  const suma=(rows:any[],pred:(r:any)=>boolean=()=>true)=>rows.filter(pred).reduce((n:number,r:any)=>n+Number(r.monto),0);
  const fechaHoy=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima'}).format(new Date());
  const cursosOptions=[...new Map([...cursos,...(datos?.calificaciones||[]),...(datos?.asistencias||[])].filter((c:any)=>c.curso_id).map((c:any)=>[c.curso_id,c])).values()] as any[];
  const filtroCurso=<label className="block text-sm font-medium">Curso<select className="input-field mt-1 sm:max-w-sm" value={cursoFiltro} onChange={e=>setCursoFiltro(e.target.value)}><option value="">Todos mis cursos</option>{cursosOptions.map(c=><option key={c.curso_id} value={c.curso_id}>{c.curso}</option>)}</select></label>;
  return <div className="space-y-4">
    <header className="card space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-semibold">{nombres[vista]}</h1><p className="text-sm text-gray-500">{alumno.nombre} {alumno.apellido} · {alumno.codigo_alumno}</p></div><button className="btn-secondary" onClick={()=>setReload(v=>v+1)}>Actualizar</button></div>
      <label className="block text-sm font-medium">Periodo académico<select className="input-field mt-1 sm:max-w-md" value={periodo} onChange={e=>setPeriodo(e.target.value)} disabled={!contexto.periodos.length}><option value="">Sin periodo registrado</option>{contexto.periodos.map((p:any)=><option key={p.id} value={p.id}>{p.nombre}{p.activo?' · Activo':' · Histórico'}</option>)}</select></label>
      {selected&&<Badge variant={selected.activo?'success':'info'}>{selected.activo?'Periodo activo':'Histórico — consulta'}</Badge>}
    </header>
    {vista==='inicio'&&<section className="card"><h2 className="mb-3 font-semibold">Avisos personales</h2>{avisosLoading?<p>Cargando avisos…</p>:avisosError?<p role="alert" className="text-red-600">{avisosError}</p>:avisos.length?avisos.map(a=><article key={a.id} className="mb-3"><p className="font-medium">{a.titulo} {a.leida?null:estado('pendiente')}</p><p className="text-sm text-gray-600">{a.mensaje}</p></article>):<p className="mb-3 text-gray-500">Sin notificaciones personales.</p>}<div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={()=>navigate('/estudiante/notificaciones')}>Mis notificaciones</button><button className="btn-secondary" onClick={()=>navigate('/alertas')}>Mis alertas</button></div></section>}
    {loading?<div className="card animate-pulse h-48"/>:periodError?<div className="card text-red-600" role="alert">{periodError}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div>:!periodo?<div className="card text-gray-500">Todavía no tienes una matrícula académica registrada. Puedes consultar tu perfil y avisos personales.</div>:<>
      {vista==='inicio'&&<>
        <section className="card"><h2 className="mb-3 font-semibold">Mi matrícula</h2><p>Periodo: {selected?.nombre}</p><p>Grado: {[...new Set(cursos.map((c:any)=>c.grado).filter(Boolean))].join(', ')||'Sin matrícula académica'}</p><p className="mt-2">{pagoMatricula?.estado==='pagado'?'Matrícula pagada':pagoMatricula?'Matrícula pendiente de pago':'Sin cobro de matrícula registrado'}</p><p className="mt-1 text-sm text-gray-500">Los cursos se muestran desde la inscripción. Cada pago de matrícula es independiente de las mensualidades.</p></section>
        <div className="grid gap-3 sm:grid-cols-3"><div className="card"><p className="text-sm text-gray-500">Cursos inscritos</p><strong>{cursos.filter((c:any)=>c.curso_id).length}</strong></div><div className="card"><p className="text-sm text-gray-500">Matrícula pendiente</p><strong>{pagoMatricula?dinero(pagoMatricula.estado!=='pagado'?pagoMatricula.monto:0):'Sin cobro registrado'}</strong></div><div className="card"><p className="text-sm text-gray-500">Mensualidades pendientes o vencidas</p><strong>{dinero(suma(datos?.mensualidades||[],r=>['pendiente','vencido'].includes(r.estado)))}</strong></div></div>
        <section className="card"><h2 className="mb-3 font-semibold">Próximas evaluaciones de mis cursos</h2>{(datos?.evaluaciones||[]).filter((e:any)=>e.fecha_evaluacion>=fechaHoy).length?(datos.evaluaciones.filter((e:any)=>e.fecha_evaluacion>=fechaHoy).map((e:any)=><p key={e.id} className="py-1 text-sm">{e.fecha_evaluacion} · {e.curso} · {e.nombre}</p>)):<p className="text-gray-500">Sin próximas evaluaciones registradas.</p>}</section>
        <section className="card"><h2 className="mb-3 font-semibold">Horario semanal de mis cursos</h2>{datos?.horarios?.length?datos.horarios.map((h:any)=><p key={h.id} className="py-1 text-sm">{h.dia_semana} · {h.hora_inicio}–{h.hora_fin} · {h.curso} · {h.profesor}{h.aula?' · Aula '+h.aula:''}</p>):<p className="text-gray-500">Sin horarios asociados a tus matrículas.</p>}</section>
      </>}
      {vista==='cursos'&&<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{!cursos.length?<div className="card text-gray-500">Sin cursos inscritos en este periodo.</div>:cursos.map((c:any)=><button key={c.matricula_id} className="card text-left hover:border-primary-400" onClick={()=>navigate(`/estudiante/cursos/${c.matricula_id}`)}><p className="font-semibold">{c.curso||'Matrícula sin curso asignado'}</p><p className="mt-2 text-sm">{c.grado||'Sin grado'} · {estado(c.estado_matricula)}</p><p className="mt-2 text-sm text-gray-500">{c.profesores.map((p:any)=>p.nombre).join(', ')||'Sin profesor asignado'}</p><p className="mt-2 text-xs text-gray-500">{pagoMatricula?.estado==='pagado'?'Matrícula pagada':pagoMatricula?'Matrícula pendiente de pago':'Sin cobro de matrícula registrado'}</p></button>)}</section>}
      {vista==='calificaciones'&&<>{filtroCurso}<p className="text-sm text-gray-500">Las notas sin evaluación vinculada se conservan como registros anteriores. No se calculan ponderaciones nuevas.</p><DataTable data={notas} columns={[{key:'curso',label:'Curso'},{key:'evaluacion',label:'Evaluación',render:(r:any)=>r.evaluacion||`Registro anterior · ${r.tipo_evaluacion}`},{key:'fecha_evaluacion',label:'Fecha'},{key:'nota',label:'Nota'},{key:'nota_maxima',label:'Máximo de evaluación',render:(r:any)=>r.nota_maxima||'—'},{key:'observaciones',label:'Observaciones'}]} emptyMessage="Sin notas registradas para estos filtros"/></>}
      {vista==='asistencia'&&<>{filtroCurso}<div className="flex flex-wrap gap-3"><label className="text-sm">Desde<input type="date" className="input-field mt-1" min={selected?.fecha_inicio} max={selected?.fecha_fin} value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}/></label><label className="text-sm">Hasta<input type="date" className="input-field mt-1" min={selected?.fecha_inicio} max={selected?.fecha_fin} value={fechaFin} onChange={e=>setFechaFin(e.target.value)}/></label></div>{fechaInicio&&fechaFin&&fechaInicio>fechaFin?<p role="alert" className="text-red-600">La fecha inicial debe ser anterior a la final.</p>:<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['presente','ausente','tardanza','justificado'].map(s=><div key={s} className="card"><p className="text-sm">{s}</p><strong>{asistencias.filter((a:any)=>a.estado===s).length}</strong></div>)}</div><DataTable data={asistencias} columns={[{key:'fecha',label:'Fecha'},{key:'curso',label:'Curso'},{key:'estado',label:'Estado',render:(r:any)=>estado(r.estado)},{key:'minutos_tardanza',label:'Minutos tarde'},{key:'observaciones',label:'Observaciones'}]} emptyMessage="Sin asistencia registrada para estos filtros"/></>}</>}
      {vista==='horarios'&&<WeeklySchedule key={periodo} blocks={datos?.horarios||[]} emptyMessage="Sin horarios asociados a tus matrículas"/>}
      {vista==='pagos'&&<>
        <div className="flex flex-wrap gap-3">{(['matricula','mensualidades'] as const).map(t=><button key={t} className={tipoPago===t?'btn-primary':'btn-secondary'} onClick={()=>{setTipoPago(t);setFiltroEstado('');setFiltroMes('');setFiltroAño('');}}>{t==='matricula'?'Matrícula':'Mensualidades'}</button>)}<select aria-label="Estado de pago" className="input-field sm:w-auto" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{(tipoPago==='matricula'?['pendiente','pagado']:['pendiente','pagado','vencido','descuento']).map(s=><option key={s}>{s}</option>)}</select>{tipoPago==='mensualidades'&&<><select aria-label="Mes" className="input-field sm:w-auto" value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{[...new Set((datos?.mensualidades||[]).map((p:any)=>p.mes))].map(m=><option key={String(m)} value={String(m)}>{String(m)}</option>)}</select><input aria-label="Año" placeholder="Todos los años" type="number" min="1901" max="2155" className="input-field sm:w-40" value={filtroAño} onChange={e=>setFiltroAño(e.target.value)}/></>}</div>
        <p className="text-sm text-gray-500">Consulta de tus pagos registrados. Para registrar o corregir un pago, contacta con administración.</p><div className="grid gap-3 sm:grid-cols-3">{[['Registrado',suma(cargos)],['Pagado',suma(cargos,r=>r.estado==='pagado')],['Pendiente o vencido',suma(cargos,r=>['pendiente','vencido'].includes(r.estado))]].map(([k,v])=><div key={String(k)} className="card"><p className="text-sm text-gray-500">{k}</p><strong>{dinero(v)}</strong></div>)}</div>
        <DataTable data={cargos} columns={[...(tipoPago==='mensualidades'?[{key:'mes',label:'Mes'},{key:'año',label:'Año'}]:[]),{key:'monto',label:'Importe',render:(r:any)=>dinero(r.monto)},{key:'estado',label:'Estado',render:(r:any)=>estado(r.estado)},{key:'fecha_pago',label:'Fecha de pago',render:(r:any)=>r.fecha_pago||'—'}]} emptyMessage={tipoPago==='matricula'?'No hay un cobro de matrícula registrado para estos filtros':'Sin mensualidades para estos filtros'}/>
      </>}
    </>}
  </div>;
}

export function EstudianteCursoPage() {
  const {matriculaId}=useParams();const navigate=useNavigate();
  const [datos,setDatos]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');setDatos(null);estudianteApi.getCurso(Number(matriculaId)).then(r=>{if(active)setDatos(r.data.data);}).catch(e=>{if(active)setError(mensaje(e));}).finally(()=>{if(active)setLoading(false);});return ()=>{active=false;};},[matriculaId,reload]);
  if(loading)return <div className="card animate-pulse h-48"/>;
  if(error)return <div role="alert" className="card text-red-600">{error}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div>;
  if(!datos)return null;
  return <div className="space-y-4"><button className="btn-secondary" onClick={()=>navigate('/estudiante/cursos')}>Volver a mis cursos</button><header className="card"><h1 className="text-xl font-semibold">{datos.curso.curso||'Matrícula sin curso'}</h1><p>{datos.periodo.nombre} · {datos.curso.grado}</p><p className="mt-2 text-sm">Profesores: {datos.curso.profesores.map((p:any)=>p.nombre).join(', ')||'Sin profesor asignado'}</p></header><section className="card"><h2 className="mb-3 font-semibold">Evaluaciones del curso</h2>{datos.evaluaciones.length?datos.evaluaciones.map((e:any)=><p key={e.id} className="py-1 text-sm">{e.nombre} · {e.fecha_evaluacion} · Máximo {e.nota_maxima}</p>):<p className="text-gray-500">Sin evaluaciones registradas.</p>}</section><DataTable data={datos.calificaciones} columns={[{key:'evaluacion',label:'Evaluación',render:(r:any)=>r.evaluacion||'Registro anterior'},{key:'nota',label:'Mi nota'},{key:'fecha_evaluacion',label:'Fecha'}]} emptyMessage="Sin calificaciones registradas"/><h2 className="font-semibold">Mi asistencia en este curso</h2><DataTable data={datos.asistencias} columns={[{key:'fecha',label:'Fecha'},{key:'estado',label:'Estado'},{key:'minutos_tardanza',label:'Minutos tarde'},{key:'observaciones',label:'Observaciones'}]} emptyMessage="Sin asistencia registrada"/><h2 className="font-semibold">Horario del curso</h2><DataTable data={datos.horarios} columns={[{key:'dia_semana',label:'Día'},{key:'hora_inicio',label:'Inicio'},{key:'hora_fin',label:'Fin'},{key:'aula',label:'Aula'}]} emptyMessage="Sin horarios registrados"/></div>;
}
