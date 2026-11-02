import fs from 'fs/promises';
import path from 'path';
import {AuthRequest} from '../types';
import {Response,NextFunction} from 'express';

export function operationsDirectory(){
  const configured=process.env.OPERATIONS_DIRECTORY;
  if(process.env.NODE_ENV==='production'&&!configured)throw Error('Configure OPERATIONS_DIRECTORY en un volumen privado');
  if(configured&&!path.isAbsolute(configured))throw Error('OPERATIONS_DIRECTORY debe ser absoluta');
  return configured||path.resolve(__dirname,'../../var/operations');
}
export async function suspension(){
  // Producción sin panel configurado conserva el funcionamiento anterior.
  if(process.env.NODE_ENV==='production'&&!process.env.OPERATIONS_DIRECTORY)return {suspended:false};
  try{const records=(await fs.readFile(path.join(operationsDirectory(),'suspension.jsonl'),'utf8')).trim().split('\n');const value=JSON.parse(records[records.length-1]);
    if(typeof value.suspended!=='boolean')throw Error('Estado inválido');return value as {suspended:boolean;updatedAt?:string};
  }catch(error:any){if(error.code==='ENOENT'&&process.env.NODE_ENV!=='production')return {suspended:false};throw error;}
}
export async function initializeOperations(){
 const directory=operationsDirectory();await fs.mkdir(directory,{recursive:true,mode:0o700});
 let handle;try{handle=await fs.open(path.join(directory,'suspension.jsonl'),'wx',0o600);await handle.writeFile(JSON.stringify({suspended:false,updatedAt:new Date().toISOString()})+'\n');await handle.sync();}
 catch(error:any){if(error.code!=='EEXIST')throw error;}finally{if(handle)await handle.close();}
}
export async function saveSuspension(suspended:boolean){
  const directory=operationsDirectory();await fs.mkdir(directory,{recursive:true,mode:0o700});
  // Diario persistente; evita ventanas sin estado y renombrados incompatibles con volúmenes Windows.
  const handle=await fs.open(path.join(directory,'suspension.jsonl'),'a',0o600);
  try{await handle.writeFile('\n'+JSON.stringify({suspended,updatedAt:new Date().toISOString()})+'\n');await handle.sync();}finally{await handle.close();}
}
export async function operationBusy(){
  if(process.env.NODE_ENV==='production'&&!process.env.OPERATIONS_DIRECTORY)return false;
  try{await fs.stat(path.join(operationsDirectory(),'operation.lock'));return true;}catch(error:any){if(error.code==='ENOENT')return false;throw error;}
}
let localOperation=false;
export async function operationLock(){
  const directory=operationsDirectory();await fs.mkdir(directory,{recursive:true,mode:0o700});
  const filename=path.join(directory,'operation.lock');const handle=await fs.open(filename,'wx',0o600);
  localOperation=true;
  try{await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));}
  catch(error){localOperation=false;await handle.close();await fs.unlink(filename);throw error;}
  return async()=>{try{await handle.close();await fs.unlink(filename);}finally{localOperation=false;}};
}
let requests=0,interrupted=false;
export function trackRequest(res:Response,next:NextFunction,mutation=true){
  // El navegador puede cerrar durante authenticate/las lecturas de estado anteriores.
  // Ese cierre ya ocurrió: no ejecutar ni contar una operación cuyo response está cerrado.
  if(res.destroyed||res.writableEnded)return;
  requests++;let finished=false;const finish=()=>{if(!finished){finished=true;requests--;}};
  res.once('finish',finish);res.once('close',()=>{if(mutation&&!res.writableFinished)interrupted=true;finish();});next();
}
export async function drainRequests(){
  if(interrupted)throw Error('Reinicia la API suspendida: una solicitud se desconectó antes de completarse');
  const deadline=Date.now()+30000;
  while(requests){if(Date.now()>deadline)throw Error('No terminaron las operaciones en curso');await new Promise(resolve=>setTimeout(resolve,100));}
  if(interrupted)throw Error('Reinicia la API suspendida: una escritura se interrumpió');
}
export function suspendedResponse(res:Response){return res.status(503).json({success:false,code:'SYSTEM_SUSPENDED',message:'El sistema está suspendido temporalmente por administración. Intenta más tarde.'});}
export async function operationsGuard(req:AuthRequest,res:Response,next:NextFunction){
  const route=req.originalUrl.split('?')[0];
  if(route==='/api/auth/profile'||route.startsWith('/api/superadministracion'))return next();
  try{
    if(await operationBusy())return suspendedResponse(res);
    if((await suspension()).suspended&&req.user?.rol!=='superadministrador')return suspendedResponse(res);
    if(localOperation)return suspendedResponse(res);
    // El rol real permanece en el token/BD; los controladores académicos reutilizan el alcance administrativo.
    if(req.user?.rol==='superadministrador'&&!route.startsWith('/api/auth/'))req.user.rol='administrador';
    return trackRequest(res,next,!['GET','HEAD'].includes(req.method));
  }catch{return res.status(503).json({success:false,message:'No se pudo verificar el estado del sistema'});}
}
