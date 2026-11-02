import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { libretasApi } from '../../api/endpoints';
import Modal from '../../components/ui/Modal';
import ReportRulesEditor from './ReportRulesEditor';
import { CourseResults, PrintableReport, ReportOutcomes } from './ReportPresentation';
import { reportCourses, type StudentRecord, type AcademicGroup, type ReportCourse, type CalculatedResponse, type IssuedReport } from './academic-record';
export default function AutomaticReportPanel({record,group,courses}:{record:StudentRecord;group:AcademicGroup;courses:ReportCourse[]}){
 const [data,setData]=useState<CalculatedResponse|null>(null),[edition,setEdition]=useState<IssuedReport|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0),[editing,setEditing]=useState(false),[confirm,setConfirm]=useState(false),[reviewed,setReviewed]=useState(false);
 const request=useRef(''); const generation=useRef(0);
 useEffect(()=>{
  let active=true;generation.current++;request.current='';setData(null);setEdition(null);setConfirm(false);setEditing(false);setError('');
  if(!group.grado_id)return;
  setLoading(true);
  libretasApi.calculate(record.alumno.id,group.periodo_id,group.grado_id).then(r=>{if(active)setData(r.data.data||null);}).catch(e=>{if(active)setError(e.response?.data?.message||'No se pudo calcular la libreta');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;generation.current++;};
 },[record,group.periodo_id,group.grado_id,revision]);
 async function choose(value:string){
  if(!value){setEdition(null);setError('');return;}
  const current=generation.current;setBusy(true);setError('');
  try{const result=await libretasApi.issued(record.alumno.id,Number(value));if(current===generation.current)setEdition(result.data.data||null);}catch(e:any){if(current===generation.current)setError(e.response?.data?.message||'No se pudo cargar la versión');}finally{setBusy(false);}
 }
 async function emit(){
  if(!data||!group.grado_id||busy||!reviewed)return;
  const current=generation.current;setBusy(true);setError('');
  if(!request.current)request.current=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  try{
   const response=await libretasApi.emit(record.alumno.id,group.periodo_id,group.grado_id,data.revision,request.current,data.huella);
   if(!response.data.data)throw new Error();
   const result=await libretasApi.issued(record.alumno.id,response.data.data.id);
   if(current!==generation.current)return;
   setEdition(result.data.data||null);setConfirm(false);
   const fresh=await libretasApi.calculate(record.alumno.id,group.periodo_id,group.grado_id);
   if(current===generation.current){setData(fresh.data.data||null);request.current='';}
  }catch(e:any){if(current===generation.current)setError(e.response?.data?.message||'No se pudo emitir la libreta. Puedes reintentar sin duplicarla.');}finally{setBusy(false);}
 }
 const selectedRecord=edition?.contenido.detalle||data?.detalle||record;
 const selectedCalculation=edition?.contenido.calculo||data?.calculo;
 const selectedCourses=data||edition?reportCourses(selectedRecord,group):courses;
 return <div className="space-y-4">
 <div className="card space-y-3"><div className="flex flex-wrap gap-2">
 {group.grado_id&&<button type="button" className="btn-secondary" disabled={busy||loading} onClick={()=>setEditing(true)}>Configurar reglas</button>}
 <button type="button" className="btn-primary gap-2" disabled={busy||loading||!courses.length|| (!!group.grado_id&&!data)} onClick={()=>window.print()}><Printer aria-hidden="true" className="h-4 w-4"/>Imprimir libreta seleccionada</button>
 {data&&<button type="button" className="btn-secondary" disabled={busy||loading||!data.guardado||!data.cerrado||!data.calculo.listo} onClick={()=>{setReviewed(false);setConfirm(true);}}>Emitir versión definitiva</button>}
 </div>
 {loading&&<p role="status" className="text-sm">Calculando libreta…</p>}
 {error&&<div role="alert" className="text-sm text-red-600">{error}<button type="button" className="btn-secondary ml-2" disabled={busy} onClick={()=>setRevision(n=>n+1)}>Actualizar cálculo</button></div>}
 {!group.grado_id&&<p className="text-sm text-gray-500">Se puede imprimir el detalle histórico; la nota final requiere un grado atribuible.</p>}
 {data&&<><p className="text-sm text-gray-500">{!data.guardado?'Configuración inicial sin confirmar. Guarda las reglas antes de emitir.':data.cerrado?'Reglas cerradas. La emisión definitiva requiere todas las notas completas.':'Revisión abierta. Puedes imprimir una libreta preliminar.'}</p>
 <p className="text-xs text-gray-500">Prácticas {data.configuracion.pesos.practica} % · Trabajos {data.configuracion.pesos.trabajo} % · Exámenes {data.configuracion.pesos.examen} %. Mínimo aprobatorio: {data.configuracion.minima}. Redondeo final: {data.configuracion.decimales} decimales.</p>
 <label className="block text-sm font-medium">Versión para consultar e imprimir<select className="input-field mt-1" value={edition?.id||''} disabled={busy} onChange={e=>void choose(e.target.value)}><option value="">Preliminar actual</option>{data.emisiones.map(item=><option key={item.id} value={item.id}>Definitiva v{item.version} · {new Date(item.created_at).toLocaleString('es-PE',{timeZone:'America/Lima'})}</option>)}</select></label></>}
 </div>
 {selectedCalculation&&<><h3 className="font-semibold">{edition?`Versión definitiva ${edition.version} · Contenido conservado`:'Cálculo preliminar actual'}</h3><ReportOutcomes calculation={selectedCalculation}/></>}
 {edition&&<details className="card"><summary className="cursor-pointer font-semibold">Notas guardadas en la versión {edition.version}</summary><div className="mt-3 space-y-3">{selectedCourses.map(course=><CourseResults key={course.id} course={course}/>)}</div></details>}
 <h3 className="font-semibold">Notas actuales registradas</h3><div className="grid items-start gap-4 lg:grid-cols-2">{(data?reportCourses(data.detalle,group):courses).map(course=><CourseResults key={course.id} course={course}/>)}</div>
 {(!group.grado_id||data)&&!loading&&<PrintableReport record={selectedRecord} group={group} courses={selectedCourses} calculation={selectedCalculation} edition={edition||undefined}/>}
 {editing&&group.grado_id&&<ReportRulesEditor period={group.periodo_id} grade={group.grado_id} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);setRevision(n=>n+1);}}/>}
 <Modal isOpen={confirm} onClose={()=>{if(!busy)setConfirm(false);}} title="Emitir libreta definitiva"><div className="space-y-4"><p className="text-sm">Se guardará una nueva versión de la libreta de {record.alumno.nombre} {record.alumno.apellido}, {group.grado}, periodo {group.periodo}. Las versiones anteriores se conservan.</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/><span>He revisado las notas, escalas y reglas de esta libreta.</span></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<div className="form-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancelar</button><button type="button" className="btn-primary" disabled={busy||!reviewed} onClick={()=>void emit()}>{busy?'Emitiendo…':'Confirmar emisión'}</button></div></div></Modal>
 </div>;
}
