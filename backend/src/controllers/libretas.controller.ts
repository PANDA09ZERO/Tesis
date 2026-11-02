import { createHash } from 'node:crypto';
import { Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { positiveId } from '../utils/academicValidation';
import { sendError, sendSuccess } from '../utils/response';
import { logError } from '../utils/logger';
import { defaultPolicy, validatePolicy, calculateReport, LibretaPolicy } from '../utils/libretaRules';
import { getExpedienteData } from './expediente.controller';
const decode=(value:any)=>typeof value==='string'?JSON.parse(value):value;
const validPair=(req:AuthRequest)=>positiveId(req.params.periodoId)&&positiveId(req.params.gradoId);
type DB=Pick<typeof pool,'query'>;
async function pair(db:DB,period:number,grade:number,lock=false){
 const [rows]=await db.query<RowDataPacket[]>(`SELECT pg.grado_id, g.nombre grado, p.nombre periodo
 FROM periodo_grados pg JOIN grados g ON g.id=pg.grado_id JOIN periodos_academicos p ON p.id=pg.periodo_academico_id
 WHERE pg.periodo_academico_id=? AND pg.grado_id=? ${lock?'FOR UPDATE':''}`,[period,grade]);
 return rows[0];
}
async function rules(db:DB,period:number,grade:number){
 const [rows]=await db.query<RowDataPacket[]>('SELECT configuracion, revision, cerrado FROM libreta_reglas WHERE periodo_academico_id=? AND grado_id=?',[period,grade]);
 return rows[0]?{configuracion:decode(rows[0].configuracion) as LibretaPolicy,revision:Number(rows[0].revision),cerrado:!!rows[0].cerrado,guardado:true}:{configuracion:defaultPolicy,revision:0,cerrado:false,guardado:false};
}
async function evaluations(db:DB,period:number,grade:number){
 const [rows]=await db.query<RowDataPacket[]>(`SELECT e.id,e.nombre,e.tipo,e.nota_maxima,e.estado,o.curso_id,cu.nombre curso FROM evaluaciones e
 JOIN periodo_grado_cursos o ON o.id=e.periodo_grado_curso_id JOIN cursos cu ON cu.id=o.curso_id
 WHERE o.periodo_academico_id=? AND o.grado_id=? ORDER BY cu.nombre,e.fecha_evaluacion,e.id`,[period,grade]);
 return rows;
}
function reportDetail(data: NonNullable<Awaited<ReturnType<typeof getExpedienteData>>>, p: number, g: number) {
 const match=(row:any)=>Number(row.periodo_id)===p&&Number(row.grado_id)===g;
 return {...data,matriculas:data.matriculas.filter(m=>Number(m.periodo_academico_id)===p&&Number(m.grado_id)===g),
  calificaciones:data.calificaciones.filter(match),evaluaciones:data.evaluaciones.filter(match),asistencia:data.asistencia.filter(match),apoderados:[],documentos:[]};
}
function reportFingerprint(data: NonNullable<Awaited<ReturnType<typeof getExpedienteData>>>, calculo: ReturnType<typeof calculateReport>) {
 const match=(row:any)=>Number(row.periodo_id)===calculo.periodo_id&&Number(row.grado_id)===calculo.grado_id;
 return createHash('sha256').update(JSON.stringify({calculo,calificaciones:data.calificaciones.filter(match),evaluaciones:data.evaluaciones.filter(match)})).digest('hex');
}
function handleError(res:Response,error:any){
 logError('Error de libreta:',error);
 return sendError(res,error?.code==='ER_NO_SUCH_TABLE'?'Falta aplicar la migración de reglas de libretas':'No se pudo completar la operación de libreta',error?.code==='ER_NO_SUCH_TABLE'?503:500);
}
export async function getLibretaRules(req:AuthRequest,res:Response){
 if(!validPair(req))return sendError(res,'Grado o periodo inválido',400);
 try{
  const p=Number(req.params.periodoId),g=Number(req.params.gradoId);
  const context=await pair(pool,p,g);if(!context)return sendError(res,'Grado y periodo no encontrados',404);
  return sendSuccess(res,{...await rules(pool,p,g),...context,evaluaciones:await evaluations(pool,p,g)});
 }catch(error){return handleError(res,error);}
}
export async function saveLibretaRules(req:AuthRequest,res:Response){
 if(!validPair(req))return sendError(res,'Grado o periodo inválido',400);
 const validation=validatePolicy(req.body.configuracion);
 if(validation)return sendError(res,validation,400);
 if(!Number.isSafeInteger(req.body.revision)||req.body.revision<0||typeof req.body.cerrado!=='boolean')return sendError(res,'Revisión y cierre inválidos',400);
 let db:Awaited<ReturnType<typeof pool.getConnection>>|undefined;
 try{
  db=await pool.getConnection();await db.beginTransaction();
  const p=Number(req.params.periodoId),g=Number(req.params.gradoId);
  if(!await pair(db,p,g,true))return sendError(res,'Grado y periodo no encontrados',404);
  const current=await rules(db,p,g);
  if(current.revision!==req.body.revision)return sendError(res,'Las reglas cambiaron. Actualiza antes de guardar',409);
  if(current.cerrado && req.body.cerrado)return sendError(res,'Reabre las reglas antes de modificarlas',409);
  const config=req.body.configuracion as LibretaPolicy;
  const evs=await evaluations(db,p,g);
  const byId=new Map(evs.map(e=>[Number(e.id),e]));
  for(const id of [...Object.keys(config.categorias),...Object.keys(config.recuperaciones)])if(!byId.has(Number(id)))return sendError(res,'Evaluación fuera del grado y periodo',400);
  for(const [id,target]of Object.entries(config.recuperaciones))if(!byId.has(target)||byId.get(target)!.curso_id!==byId.get(Number(id))!.curso_id)return sendError(res,'La recuperación debe pertenecer al mismo curso, grado y periodo',400);
  if(current.cerrado && JSON.stringify(config)!==JSON.stringify(current.configuracion))return sendError(res,'Reabre sin alterar la configuración; luego guarda los cambios',409);
  await db.query(`INSERT INTO libreta_reglas(periodo_academico_id,grado_id,configuracion,revision,cerrado,actualizado_por)
   VALUES(?,?,?,1,?,?) ON DUPLICATE KEY UPDATE configuracion=VALUES(configuracion),revision=revision+1,cerrado=VALUES(cerrado),actualizado_por=VALUES(actualizado_por)`,[p,g,JSON.stringify(config),Number(req.body.cerrado),req.user!.userId]);
  await db.commit();return sendSuccess(res,{revision:current.revision+1},req.body.cerrado?'Reglas revisadas y cerradas':'Reglas guardadas');
 }catch(error){return handleError(res,error);}finally{if(db){await db.rollback().catch(()=>undefined);db.release();}}
}
export async function getCalculatedLibreta(req:AuthRequest,res:Response){
 if(!validPair(req)||!positiveId(req.params.id))return sendError(res,'Alumno, grado o periodo inválido',400);
 try{
  const p=Number(req.params.periodoId),g=Number(req.params.gradoId),id=Number(req.params.id);
  if(!await pair(pool,p,g))return sendError(res,'Grado y periodo no encontrados',404);
  const data=await getExpedienteData(id);if(!data)return sendError(res,'Alumno no encontrado',404);
  const policy=await rules(pool,p,g);
  const calculo=calculateReport(data,p,g,policy.configuracion);
  const [emisiones]=await pool.query<RowDataPacket[]>("SELECT id, version, JSON_UNQUOTE(JSON_EXTRACT(contenido, '$.emitida_en')) created_at FROM libreta_emisiones WHERE alumno_id=? AND periodo_academico_id=? AND grado_id=? ORDER BY version DESC",[id,p,g]);
  return sendSuccess(res,{...policy,calculo,emisiones,detalle:reportDetail(data,p,g),huella:reportFingerprint(data,calculo)});
 }catch(error){return handleError(res,error);}
}
export async function emitLibreta(req:AuthRequest,res:Response){
 if(!validPair(req)||!positiveId(req.params.id)||!Number.isSafeInteger(req.body.revision)||req.body.revisada!==true
  ||typeof req.body.huella!=='string'||! /^[a-f0-9]{64}$/.test(req.body.huella)
  ||typeof req.body.solicitud_id!=='string'||! /^[a-zA-Z0-9-]{16,64}$/.test(req.body.solicitud_id))return sendError(res,'Confirme la revisión e indique una solicitud válida',400);
 let db:Awaited<ReturnType<typeof pool.getConnection>>|undefined;
 try{
  db=await pool.getConnection();await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await db.beginTransaction();
  const p=Number(req.params.periodoId),g=Number(req.params.gradoId),id=Number(req.params.id);
  if(!await pair(db,p,g,true))return sendError(res,'Grado y periodo no encontrados',404);
  const [previous]=await db.query<RowDataPacket[]>('SELECT id, alumno_id, periodo_academico_id, grado_id FROM libreta_emisiones WHERE solicitud_id=?',[req.body.solicitud_id]);
  if(previous.length){if(previous[0].alumno_id!==id||previous[0].periodo_academico_id!==p||previous[0].grado_id!==g)return sendError(res,'Solicitud ya utilizada en otra libreta',409);return sendSuccess(res,{id:previous[0].id},'Libreta ya emitida');}
  const policy=await rules(db,p,g);
  if(!policy.guardado||!policy.cerrado)return sendError(res,'Guarda y cierra las reglas del grado y periodo antes de emitir',409);
  if(policy.revision!==req.body.revision)return sendError(res,'Las reglas cambiaron. Revisa nuevamente la libreta',409);
  const data=await getExpedienteData(id,db);if(!data)return sendError(res,'Alumno no encontrado',404);
  const calculo=calculateReport(data,p,g,policy.configuracion);
  if(reportFingerprint(data,calculo)!==req.body.huella)return sendError(res,'Las notas o datos del alumno cambiaron. Actualiza y revisa nuevamente antes de emitir',409);
  if(!calculo.listo)return sendError(res,'La libreta tiene notas o reglas pendientes; revisa la preliminar',409);
  const detalle=reportDetail(data,p,g);
  const [versions]=await db.query<RowDataPacket[]>('SELECT COALESCE(MAX(version),0)+1 version FROM libreta_emisiones WHERE alumno_id=? AND periodo_academico_id=? AND grado_id=?',[id,p,g]);
  const contenido={calculo,detalle,revision:policy.revision,emitida_en:new Date().toISOString()};
  const [result]=await db.query<ResultSetHeader>('INSERT INTO libreta_emisiones(alumno_id,periodo_academico_id,grado_id,version,solicitud_id,contenido,emitido_por) VALUES(?,?,?,?,?,?,?)',[id,p,g,versions[0].version,req.body.solicitud_id,JSON.stringify(contenido),req.user!.userId]);
  await db.commit();return sendSuccess(res,{id:result.insertId},'Libreta definitiva emitida',201);
 }catch(error){return handleError(res,error);}finally{if(db){await db.rollback().catch(()=>undefined);db.release();}}
}
export async function getIssuedLibreta(req:AuthRequest,res:Response){
 if(!positiveId(req.params.id)||!positiveId(req.params.emisionId))return sendError(res,'Libreta inválida',400);
 try{const [rows]=await pool.query<RowDataPacket[]>('SELECT id,version,created_at,contenido FROM libreta_emisiones WHERE id=? AND alumno_id=?',[req.params.emisionId,req.params.id]);
 if(!rows.length)return sendError(res,'Libreta no encontrada',404);
 return sendSuccess(res,{...rows[0],contenido:decode(rows[0].contenido)});
 }catch(error){return handleError(res,error);}
}
