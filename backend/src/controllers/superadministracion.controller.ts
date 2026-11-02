import {Response} from 'express';
import fs from 'fs/promises';
import path from 'path';
import {randomUUID} from 'crypto';
import {create as createTar} from 'tar';
import {RowDataPacket} from 'mysql2';
import pool from '../config/database';
import {databaseSettings,uploadDirectory} from '../config/environment';
import {verifyPasswordAsync} from '../utils/encrypt';
import {AuthRequest} from '../types';
import {sendError,sendSuccess} from '../utils/response';
import {logError} from '../utils/logger';
import {operationsDirectory,suspension,saveSuspension,operationLock,operationBusy,drainRequests} from '../utils/operations';
const tools=()=>require(path.resolve(__dirname,'../../scripts/backup.cjs'));
const expectedError=(message:string)=>Object.assign(new Error(message),{operational:true});
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const isInside=(parent:string,child:string)=>{const relative=path.relative(parent,child);return !relative||(!relative.startsWith('..')&&!path.isAbsolute(relative));};
function directories(){
 const root=operationsDirectory(),uploads=path.resolve(uploadDirectory());
 if(isInside(uploads,root)||isInside(root,uploads))throw Error('El almacén de operaciones debe estar separado de uploads');
 return {root,backups:path.join(root,'backups'),uploads};
}
async function audit(req:AuthRequest,action:string,details:object={}){
 await pool.query("INSERT INTO registro_actividades(usuario_id,accion,entidad,detalles,ip_address) VALUES(?,?,'operaciones',?,?)",[req.user!.userId,action,JSON.stringify(details),req.ip||null]);
}
async function reauthenticate(req:AuthRequest,res:Response){
 const password=req.body?.password;
 if(typeof password!=='string'||!password||Buffer.byteLength(password)>72){sendError(res,'Confirma tu contraseña actual',400);return false;}
 const [rows]=await pool.query<RowDataPacket[]>("SELECT u.password_hash FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? AND u.activo=1 AND r.nombre='superadministrador'",[req.user!.userId]);
 if(!rows.length||!await verifyPasswordAsync(password,rows[0].password_hash)){await audit(req,'operacion_reautenticacion_fallida');sendError(res,'La contraseña actual es incorrecta',403);return false;}
 return true;
}
async function exclusive(req:AuthRequest,res:Response,action:string,work:()=>Promise<any>){
 let release:(()=>Promise<void>)|undefined;
 try{
  release=await operationLock();
  if(!await reauthenticate(req,res))return;
  await audit(req,action+'_inicio');
  const result=await work();await audit(req,action+'_completada');await release();release=undefined;return sendSuccess(res,result,'Operación completada');
 }catch(error:any){
  logError('No se completó la operación administrativa',error);
  if(release){try{await audit(req,action+'_fallida');}catch{/* No se informa éxito si la auditoría falla. */}}
  return sendError(res,error.code==='EEXIST'?'Hay otra operación en curso. Si se interrumpió el servidor, revisa el procedimiento de recuperación.':error.operational?error.message:'No se completó la operación. Revisa auditoría, configuración y almacenamiento; el sistema puede seguir suspendido.',error.code==='EEXIST'?409:503);
 }finally{if(release)await release().catch(error=>logError('No se pudo liberar bloqueo operativo',error));}
}
export async function estado(_req:AuthRequest,res:Response){try{directories();return sendSuccess(res,{...await suspension(),busy:await operationBusy(),backupsEnabled:process.env.OPERATIONS_SINGLE_INSTANCE==='true',recoveryConfigured:!!(process.env.RECOVERY_DB_NAME&&process.env.RECOVERY_UPLOAD_DIRECTORY)});}catch{return sendError(res,'Configura un almacén privado de operaciones separado de uploads',503);}}
export async function actualizarSuspension(req:AuthRequest,res:Response){
 if(typeof req.body?.suspended!=='boolean')return sendError(res,'Estado de suspensión inválido',400);
 return exclusive(req,res,req.body.suspended?'suspender_sistema':'reactivar_sistema',async()=>{directories();await saveSuspension(req.body.suspended);if(req.body.suspended)await drainRequests();return await suspension();});
}
export async function listarRespaldos(_req:AuthRequest,res:Response){
 try{const {backups}=directories();let names:string[];try{names=await fs.readdir(backups);}catch(error:any){if(error.code!=='ENOENT')throw error;names=[];}
  const result=[];for(const id of names.filter(validId)){const location=path.join(backups,id);const stat=await fs.lstat(location);if(!stat.isDirectory()||stat.isSymbolicLink())continue;
   try{const manifest=JSON.parse(await fs.readFile(path.join(location,'manifest.json'),'utf8'));const archive=await fs.stat(path.join(location,'respaldo.tar.gz'));result.push({id,createdAt:manifest.createdAt,files:manifest.files.length,tables:Object.keys(manifest.counts).length,bytes:archive.size});}
   catch(error:any){if(error.code!=='ENOENT')throw error;/* Copia incompleta: no se ofrece como respaldo válido. */}
  }return sendSuccess(res,result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
 }catch{return sendError(res,'No se pudo consultar los respaldos',503);}
}
async function requireMaintenance(){
 if(process.env.OPERATIONS_SINGLE_INSTANCE!=='true')throw expectedError('Confirma una única instancia y detén jobs/escritores externos');
 if(!(await suspension()).suspended)throw expectedError('Primero suspende el sistema');
 await drainRequests();
}
export async function crearRespaldo(req:AuthRequest,res:Response){return exclusive(req,res,'crear_respaldo',async()=>{
 await requireMaintenance();const {backups,uploads}=directories();await fs.mkdir(backups,{recursive:true,mode:0o700});const id=randomUUID(),destination=path.join(backups,id);
 const result=await tools().backup(databaseSettings(),uploads,destination);
 await createTar({file:path.join(destination,'respaldo.tar.gz'),cwd:destination,gzip:true,portable:true},['database.sql','manifest.json','uploads']);await fs.chmod(path.join(destination,'respaldo.tar.gz'),0o600);
 return {id,...result};
});}
export async function recuperarRespaldo(req:AuthRequest,res:Response){
 if(!validId(req.params.id)||req.body?.confirmation!=='RECUPERAR EN DESTINO AISLADO')return sendError(res,'Respaldo o confirmación inválidos',400);
 return exclusive(req,res,'recuperar_respaldo',async()=>{
  await requireMaintenance();const {backups,root,uploads}=directories(),target=process.env.RECOVERY_DB_NAME,storage=process.env.RECOVERY_UPLOAD_DIRECTORY;
  if(!target||!storage||!path.isAbsolute(storage)||!/^[a-zA-Z0-9_]+$/.test(target)||target===databaseSettings().database)throw expectedError('Configura un destino de recuperación aislado, diferente de la base en uso');
  const resolved=path.resolve(storage);if(isInside(root,resolved)||isInside(resolved,root)||isInside(uploads,resolved)||isInside(resolved,uploads))throw Error('Almacenes solapados');
  return await tools().restore({...databaseSettings(),database:target},path.join(backups,req.params.id),resolved);
 });
}
export async function descargarRespaldo(req:AuthRequest,res:Response){
 if(!validId(req.params.id))return sendError(res,'Respaldo inválido',400);
 let release:(()=>Promise<void>)|undefined;
 try{release=await operationLock();if(!await reauthenticate(req,res))return;const file=path.join(directories().backups,req.params.id,'respaldo.tar.gz');const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Archivo inválido');
  await audit(req,'descargar_respaldo_autorizado',{id:req.params.id});
  const unlock=release;release=undefined;
  return res.download(file,'respaldo-'+req.params.id+'.tar.gz',async error=>{try{await audit(req,error?'descargar_respaldo_fallida':'descargar_respaldo_completada',{id:req.params.id});}catch(auditError){logError('Falló auditoría de descarga operativa',auditError);}finally{await unlock().catch(lockError=>logError('No se pudo liberar bloqueo de descarga',lockError));}if(error&&!res.headersSent)sendError(res,'No se pudo descargar el respaldo',503);});
 }catch(error:any){return sendError(res,error.code==='ENOENT'?'Respaldo no encontrado':'No se pudo autorizar la descarga',error.code==='ENOENT'?404:error.code==='EEXIST'?409:503);}
 finally{if(release)await release().catch(()=>undefined);}
}
export async function auditoria(_req:AuthRequest,res:Response){try{const [rows]=await pool.query<RowDataPacket[]>("SELECT id,usuario_id,accion,created_at FROM registro_actividades WHERE entidad='operaciones' ORDER BY id DESC LIMIT 100");return sendSuccess(res,rows);}catch{return sendError(res,'No se pudo consultar la auditoría',503);}}
