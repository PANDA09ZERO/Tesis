import {useEffect,useState} from 'react';
import {AlertTriangle,CheckCircle2,CircleDashed,Database,Download,History,KeyRound,Loader2,Power,RefreshCw,RotateCcw,XCircle} from 'lucide-react';
import client from '../../api/client';
interface Backup{id:string;createdAt:string;files:number;tables:number;bytes:number}
interface Status{suspended:boolean;busy:boolean;backupsEnabled:boolean;recoveryConfigured:boolean}

const RECOVERY_PHRASE='RECUPERAR EN DESTINO AISLADO';
const dateFormat=new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'});
const formatDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Fecha no registrada':dateFormat.format(date);};
const formatSize=(bytes:number)=>bytes>=1024*1024*1024?`${(bytes/1024/1024/1024).toFixed(2)} GB`:`${(bytes/1024/1024).toFixed(2)} MB`;
// La auditoría guarda claves técnicas (p. ej. "crear_respaldo_completada"); se muestran en lenguaje natural.
function describeEvent(action:string){
 const value=String(action||'');
 const outcome=value.endsWith('_completada')?'ok':value.endsWith('_fallida')?'error':value.endsWith('_inicio')?'start':'info';
 const text=value.replace(/_(inicio|completada|fallida)$/,'').replace(/_/g,' ');
 return {outcome,text:text.charAt(0).toUpperCase()+text.slice(1)};
}
const outcomeLabel={ok:'Completada',error:'Fallida',start:'Iniciada',info:'Registrada'} as const;

/* Indicador de preparación: icono + texto, nunca solo color. */
function Readiness({ok,label,detail}:{ok:boolean;label:string;detail:string}){
 return <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
  {ok?<CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400"/>:<CircleDashed aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"/>}
  <div className="min-w-0"><p className="text-[0.9375rem] font-semibold text-gray-900 dark:text-gray-100">{label}</p><p className="text-[0.8125rem] text-gray-500 dark:text-gray-400">{detail}</p></div>
 </li>;
}

export default function SuperadministracionPage(){
 const [status,setStatus]=useState<Status|null>(null),[backups,setBackups]=useState<Backup[]>([]),[events,setEvents]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const prefix='/superadministracion';
 async function refresh(){setLoading(true);setError('');try{const [state,copies,audit]=await Promise.all([client.get(prefix+'/estado'),client.get(prefix+'/respaldos'),client.get(prefix+'/auditoria')]);setStatus(state.data.data);setBackups(copies.data.data);setEvents(audit.data.data);}catch(e:any){setStatus(null);setError(e.response?.data?.message||'No se pudo cargar el panel');}finally{setLoading(false);}}
 useEffect(()=>{void refresh();},[]);
 async function act(work:()=>Promise<any>,success:string){if(busy)return;if(!password){setError('Confirma tu contraseña actual');return;}setBusy(true);setError('');setMessage('');try{await work();setPassword('');setConfirmation('');setMessage(success);await refresh();}catch(e:any){let text=e.response?.data?.message;if(e.response?.data instanceof Blob){try{text=JSON.parse(await e.response.data.text()).message;}catch{/* Error de descarga sin JSON. */}}setError(text||'No se completó la operación. Comprueba el estado antes de reintentar.');}finally{setBusy(false);}}
 async function download(id:string){const response=await client.post(prefix+`/respaldos/${id}/descargar`,{password},{responseType:'blob'});const url=URL.createObjectURL(response.data);try{const link=document.createElement('a');link.href=url;link.download=`respaldo-${id}.tar.gz`;link.click();}finally{URL.revokeObjectURL(url);}}

 const locked=busy||!!status?.busy;
 const canBackup=!locked&&!!status?.suspended&&!!status?.backupsEnabled;
 const canRecover=canBackup&&!!status?.recoveryConfigured&&confirmation===RECOVERY_PHRASE;

 return <div className="space-y-6">
  {/* Encabezado: título, propósito y actualización. */}
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div className="app-page-heading" style={{marginBottom:0}}>
    <h1>Control del sistema</h1>
    <p>Acceso operativo del superadministrador, separado de la gestión habitual. Cada operación queda registrada en la auditoría.</p>
   </div>
   <button className="btn-secondary shrink-0 gap-2" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Actualizar panel</button>
  </header>

  {/* Mensajes de resultado: un solo aviso de error a la vez. */}
  {error&&<p role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.9375rem] text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><XCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0"/>{error}</p>}
  {message&&<p role="status" className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[0.9375rem] text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0"/>{message}</p>}
  {busy&&<p role="status" className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-[0.9375rem] text-primary-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"><Loader2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 animate-spin"/>Operación en curso. No cierres esta página. El sistema conserva la suspensión hasta que lo reactives.</p>}

  {loading&&!status?<p role="status" className="card flex items-center gap-3 text-gray-600"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin"/>Cargando control del sistema…</p>:status&&<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_22rem]">

   {/* Móvil: identidad → estado/respaldos/auditoría → contraseña. Escritorio: identidad y contraseña en la columna derecha. */}
   <aside className="space-y-6 lg:col-start-2 lg:row-start-1">
    <section aria-labelledby="identity-title" className="card">
     <div className="mb-4 flex items-center gap-2"><KeyRound aria-hidden="true" className="h-5 w-5 text-primary-600 dark:text-gray-300"/><h2 id="identity-title" className="text-[1.1875rem] font-bold">Confirmar identidad</h2></div>
     <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Contraseña actual<input type="password" autoComplete="current-password" className="input-field mt-1.5" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
     <p className="mt-2 text-[0.8125rem] text-gray-500 dark:text-gray-400">Se vuelve a comprobar antes de suspender, reactivar, crear, descargar o recuperar una copia.</p>
    </section>
   </aside>

   <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
    {/* Disponibilidad: el estado del sistema es lo primero que se lee. */}
    <section aria-labelledby="availability-title" className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
     <div className={`flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${status.suspended?'bg-amber-50 dark:bg-amber-950':''}`}>
      <div className="min-w-0">
       <h2 id="availability-title" className="text-[0.9375rem] font-semibold text-gray-600 dark:text-gray-300">Disponibilidad</h2>
       <p className="mt-1 flex items-center gap-3 text-[1.75rem] font-bold leading-tight text-gray-900 dark:text-gray-100">
        <span aria-hidden="true" className={`relative inline-flex h-3 w-3 rounded-full ${status.suspended?'bg-amber-500':'bg-green-600'}`}/>
        <span>Estado: <strong>{status.suspended?'Suspendido':'Activo'}</strong></span>
       </p>
       <p className="mt-2 max-w-prose text-[0.9375rem] text-gray-600 dark:text-gray-300">{status.suspended?'El acceso habitual está bloqueado, incluidas las sesiones abiertas. Solo el superadministrador puede entrar. No se eliminó información.':'Suspender bloquea el acceso habitual, incluidas las sesiones abiertas. El superadministrador podrá entrar para reactivar. No se elimina información.'}</p>
      </div>
      <button className={`${status.suspended?'btn-primary':'btn-secondary'} shrink-0 gap-2`} disabled={locked} onClick={()=>void act(()=>client.put(prefix+'/suspension',{password,suspended:!status.suspended}),status.suspended?'Sistema reactivado':'Sistema suspendido')}><Power aria-hidden="true" className="h-4 w-4"/>{status.suspended?'Reactivar sistema':'Suspender sistema'}</button>
     </div>
     {status.busy&&<p role="alert" className="flex items-start gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3 text-[0.9375rem] text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 sm:px-6"><AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0"/>Hay otra operación en curso. Si el servidor se interrumpió, sigue el procedimiento de recuperación del bloqueo.</p>}
     <ul aria-label="Preparación para operaciones" className="divide-y divide-gray-100 border-t border-gray-200 px-5 py-4 dark:divide-gray-700 dark:border-gray-700 sm:px-6">
      <Readiness ok={status.suspended} label="Sistema suspendido" detail="Requisito para crear o recuperar respaldos."/>
      <Readiness ok={status.backupsEnabled} label="Respaldos habilitados" detail={status.backupsEnabled?'Instancia única confirmada por el operador.':'El operador debe confirmar una única instancia y detener escritores externos mediante OPERATIONS_SINGLE_INSTANCE.'}/>
      <Readiness ok={status.recoveryConfigured} label="Destino de recuperación" detail={status.recoveryConfigured?'Base y directorio aislados configurados.':'Destino de recuperación todavía sin configurar.'}/>
     </ul>
    </section>

    {/* Respaldos: crear, descargar y recuperar. */}
    <section aria-labelledby="backups-title" className="card p-0 sm:p-0">
     <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="min-w-0">
       <div className="flex items-center gap-2"><Database aria-hidden="true" className="h-5 w-5 text-primary-600 dark:text-gray-300"/><h2 id="backups-title" className="text-[1.1875rem] font-bold">Respaldos privados</h2></div>
       <p className="mt-1 max-w-prose text-[0.9375rem] text-gray-600 dark:text-gray-300">Incluyen base de datos y archivos. Contienen datos personales: guárdalos en un destino protegido.</p>
       {!status.suspended&&<p className="mt-2 text-[0.8125rem] font-semibold text-amber-800 dark:text-amber-300">Suspende primero el sistema para crear o recuperar una copia.</p>}
      </div>
      <button className="btn-primary shrink-0 gap-2" disabled={!canBackup} onClick={()=>void act(()=>client.post(prefix+'/respaldos',{password}),'Respaldo creado y disponible para descargar')}><Database aria-hidden="true" className="h-4 w-4"/>Crear respaldo</button>
     </div>
     {!backups.length?<p className="px-5 py-10 text-center text-[0.9375rem] text-gray-500 dark:text-gray-400 sm:px-6">Sin respaldos completos registrados.</p>:<ul className="divide-y divide-gray-100 dark:divide-gray-700">{backups.map(copy=><li key={copy.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
       <p className="text-[0.9375rem] font-semibold text-gray-900 dark:text-gray-100">{formatDate(copy.createdAt)}</p>
       <p className="mt-0.5 text-[0.8125rem] text-gray-600 tabular-nums dark:text-gray-300">{copy.tables} tablas · {copy.files} archivos · {formatSize(copy.bytes)}</p>
       <p className="mt-0.5 break-all font-mono text-xs text-gray-400">{copy.id}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
       <button className="btn-secondary gap-2" disabled={locked} onClick={()=>void act(()=>download(copy.id),'Descarga iniciada')}><Download aria-hidden="true" className="h-4 w-4"/>Descargar copia</button>
       <button className="btn-secondary gap-2" disabled={!canRecover} onClick={()=>void act(()=>client.post(prefix+`/respaldos/${copy.id}/recuperar`,{password,confirmation}),'Copia recuperada y verificada en el destino aislado')}><RotateCcw aria-hidden="true" className="h-4 w-4"/>Recuperar copia</button>
      </div>
     </li>)}</ul>}
     {/* Zona de peligro: la frase habilita "Recuperar copia" en cada respaldo. */}
     <details className="group border-t border-gray-200 dark:border-gray-700" open={confirmation.length>0}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[0.9375rem] font-semibold text-red-800 dark:text-red-300 sm:px-6 [&::-webkit-details-marker]:hidden">
       <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4"/>Habilitar recuperación</span>
       <span className="text-[0.8125rem] font-medium text-gray-500 group-open:hidden">Mostrar</span>
      </summary>
      <div className="space-y-3 bg-red-50/60 px-5 pb-5 pt-1 dark:bg-red-950/40 sm:px-6">
       <p className="max-w-prose text-[0.9375rem] text-gray-700 dark:text-gray-300">La recuperación se realiza en otra base y directorio vacíos configurados por el operador. No sustituye automáticamente el sistema en uso.</p>
       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Para recuperar, escribe {RECOVERY_PHRASE}<input className="input-field mt-1.5 font-mono" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} autoComplete="off" spellCheck={false}/></label>
       <p className="text-[0.8125rem] text-gray-500 dark:text-gray-400">{confirmation===RECOVERY_PHRASE?'Frase confirmada. Ya puedes usar “Recuperar copia”.':'La frase debe coincidir exactamente, en mayúsculas.'}</p>
      </div>
     </details>
    </section>

    {/* Auditoría: tabla legible en escritorio, lista en móvil. */}
    <section aria-labelledby="audit-title" className="card p-0 sm:p-0">
     <div className="border-b border-gray-200 p-5 dark:border-gray-700 sm:p-6">
      <div className="flex items-center gap-2"><History aria-hidden="true" className="h-5 w-5 text-primary-600 dark:text-gray-300"/><h2 id="audit-title" className="text-[1.1875rem] font-bold">Auditoría operativa</h2></div>
      <p className="mt-1 text-[0.9375rem] text-gray-600 dark:text-gray-300">Últimos 100 eventos. La cuenta no se oculta de la auditoría.</p>
     </div>
     {!events.length?<p className="px-5 py-10 text-center text-[0.9375rem] text-gray-500 dark:text-gray-400 sm:px-6">Sin operaciones registradas.</p>:<div className="max-h-[28rem] overflow-y-auto">
      <table className="w-full text-left text-[0.9375rem]">
       <thead className="sticky top-0 hidden bg-gray-50 text-[0.8125rem] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:table-header-group"><tr><th scope="col" className="px-6 py-2.5">Fecha</th><th scope="col" className="px-3 py-2.5">Operación</th><th scope="col" className="px-3 py-2.5">Resultado</th><th scope="col" className="px-6 py-2.5 text-right">Usuario</th></tr></thead>
       <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{events.map(event=>{const {outcome,text}=describeEvent(event.accion);return <tr key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 sm:table-row sm:px-0 sm:py-0">
        <td className="w-full text-[0.8125rem] text-gray-500 tabular-nums dark:text-gray-400 sm:w-auto sm:whitespace-nowrap sm:px-6 sm:py-3">{formatDate(event.created_at)}</td>
        <td className="font-semibold text-gray-900 dark:text-gray-100 sm:px-3 sm:py-3">{text}</td>
        <td className="sm:px-3 sm:py-3"><span className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold ${outcome==='ok'?'text-green-700 dark:text-green-400':outcome==='error'?'text-red-700 dark:text-red-400':'text-gray-500 dark:text-gray-400'}`}>{outcome==='ok'?<CheckCircle2 aria-hidden="true" className="h-4 w-4"/>:outcome==='error'?<XCircle aria-hidden="true" className="h-4 w-4"/>:<CircleDashed aria-hidden="true" className="h-4 w-4"/>}{outcomeLabel[outcome as keyof typeof outcomeLabel]}</span></td>
        <td className="ml-auto whitespace-nowrap text-[0.8125rem] text-gray-500 tabular-nums dark:text-gray-400 sm:px-6 sm:py-3 sm:text-right">Usuario #{event.usuario_id}</td>
       </tr>;})}</tbody>
      </table>
     </div>}
    </section>
   </div>

   <div className="lg:col-start-2 lg:row-start-2">
    <section aria-labelledby="password-title" className="card">
     <h2 id="password-title" className="mb-4 text-[1.1875rem] font-bold">Cambiar mi contraseña</h2>
     <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Nueva contraseña<input type="password" autoComplete="new-password" className="input-field mt-1.5" value={newPassword} onChange={e=>setNewPassword(e.target.value)} disabled={busy}/></label>
     <p className="mt-2 text-[0.8125rem] text-gray-500 dark:text-gray-400">Mínimo 12 caracteres. Usa la contraseña actual de arriba para confirmar.</p>
     <button className="btn-secondary mt-4 w-full" disabled={busy||newPassword.length<12||new TextEncoder().encode(newPassword).length>72} onClick={()=>void act(()=>client.put('/auth/change-password',{currentPassword:password,newPassword}),'Contraseña cambiada. Inicia sesión nuevamente.')}>Cambiar contraseña y cerrar sesiones</button>
    </section>
   </div>
  </div>}
 </div>;
}
