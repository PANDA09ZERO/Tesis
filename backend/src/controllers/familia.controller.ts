import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { positiveId } from '../utils/academicValidation';
import { obtenerMatriculasAlumno } from '../utils/matriculasAlumno';
import { asistenciaSourceSql, rendimientoSourceSql } from '../utils/reporteAcademico';
import { horariosDelAlumno } from '../utils/estudianteAlcance';
import { sendError, sendSuccess } from '../utils/response';
import { logError } from '../utils/logger';

async function vinculados(userId:number, alumnoId?:number){
  const [rows]=await pool.query<RowDataPacket[]>(`SELECT a.id,a.codigo_alumno,a.estado,u.nombre,u.apellido,aa.parentesco
    FROM apoderados ap JOIN apoderado_alumno aa ON aa.apoderado_id=ap.id
    JOIN alumnos a ON a.id=aa.alumno_id JOIN usuarios u ON u.id=a.usuario_id
    WHERE ap.usuario_id=? ${alumnoId?'AND a.id=?':''} ORDER BY u.apellido,u.nombre,a.id`,[userId,...(alumnoId?[alumnoId]:[])]);
  return rows;
}

async function resumen(alumno:RowDataPacket, selected?:number, detalle=false){
  // Solo periodos académicos: los pagos no conceden visibilidad al apoderado.
  const [periodos]=await pool.query<RowDataPacket[]>(`SELECT p.id,p.nombre,p.activo,
    DATE_FORMAT(p.fecha_inicio,'%Y-%m-%d') fecha_inicio,DATE_FORMAT(p.fecha_fin,'%Y-%m-%d') fecha_fin
    FROM periodos_academicos p WHERE p.id IN (
      SELECT periodo_academico_id FROM matriculas WHERE alumno_id=?
      UNION SELECT periodo_id FROM (${rendimientoSourceSql}) grade WHERE alumno_id=?
      UNION SELECT periodo_id FROM (${asistenciaSourceSql}) attendance WHERE alumno_id=? AND periodo_id IS NOT NULL)
    ORDER BY p.activo DESC,p.fecha_inicio DESC,p.id DESC`,[alumno.id,alumno.id,alumno.id]);
  const periodo=selected===undefined?(periodos[0]||null):periodos.find(p=>Number(p.id)===selected);
  if(selected!==undefined&&!periodo)return null;
  const matriculas=periodo?await obtenerMatriculasAlumno(alumno.id,undefined,Number(periodo.id),false):[];
  const [notas]=periodo?await pool.query<RowDataPacket[]>(`SELECT r.id,cu.nombre curso,r.nota,r.escala_maxima,
    DATE_FORMAT(r.fecha_evaluacion,'%Y-%m-%d') fecha,r.tipo_evaluacion
    FROM (${rendimientoSourceSql}) r JOIN cursos cu ON cu.id=r.curso_id
    WHERE r.alumno_id=? AND r.periodo_id=? ORDER BY r.fecha_evaluacion DESC,r.id DESC`,[alumno.id,periodo.id]):[[]];
  const [asistencia]=periodo?await pool.query<RowDataPacket[]>(`SELECT attendance.id,cu.nombre curso,
    DATE_FORMAT(attendance.fecha,'%Y-%m-%d') fecha,attendance.estado,attendance.minutos_tardanza
    FROM (${asistenciaSourceSql}) attendance LEFT JOIN cursos cu ON cu.id=attendance.curso_id
    WHERE attendance.alumno_id=? AND attendance.periodo_id=? ORDER BY attendance.fecha DESC,attendance.id DESC`,[alumno.id,periodo.id]):[[]];
  const [ambiguas]=await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM (${asistenciaSourceSql}) attendance
    WHERE attendance.alumno_id=? AND attendance.periodo_id IS NULL`,[alumno.id]);
  const ausencias=asistencia.filter(a=>a.estado==='ausente');
  const matriculasContexto=periodo?.activo?matriculas.filter(m=>m.inscripciones.some((c:any)=>c.estado==='activa')):matriculas;
  const cursos=matriculasContexto.flatMap(m=>m.inscripciones).filter(c=>c.curso_id&&(!periodo?.activo||c.estado==='activa'));
  const result={alumno,periodo,periodos,grado:[...new Set(matriculasContexto.map(m=>m.grado).filter(Boolean))].join(', '),
    resumen:{cursos:new Set(cursos.map(c=>c.curso_id)).size,calificaciones:notas.length,
      registros_asistencia:asistencia.length,dias_asistencia:new Set(asistencia.map(a=>a.fecha)).size,
      ausencias:ausencias.length,asistencias_sin_periodo:Number(ambiguas[0].total)},
    pendientes:{inasistencias:ausencias}};
  return detalle?{...result,matriculas,calificaciones:notas,asistencias:asistencia,
    horarios:periodo?await horariosDelAlumno(alumno.id,Number(periodo.id)):[]}:result;
}

export async function getInicioFamilia(req:AuthRequest,res:Response){
  try{const alumnos=await vinculados(req.user!.userId);const data=[];
    for(const alumno of alumnos)data.push(await resumen(alumno));
    return sendSuccess(res,data);
  }catch(error){logError('Error al consultar inicio familiar',error);return sendError(res,'No se pudo cargar el inicio familiar. Intente nuevamente');}
}
export async function getDetalleFamilia(req:AuthRequest,res:Response){
  if(!positiveId(req.params.alumnoId)||(req.query.periodo_id!==undefined&&!positiveId(req.query.periodo_id)))return sendError(res,'Estudiante o periodo inválido',400);
  try{
    const alumnos=await vinculados(req.user!.userId,Number(req.params.alumnoId));
    if(!alumnos.length)return sendError(res,'Estudiante no encontrado entre sus vínculos',404);
    const data=await resumen(alumnos[0],req.query.periodo_id===undefined?undefined:Number(req.query.periodo_id),true);
    if(!data)return sendError(res,'Periodo no disponible para este estudiante',404);
    return sendSuccess(res,data);
  }catch(error){logError('Error al consultar detalle familiar',error);return sendError(res,'No se pudo cargar el detalle del estudiante. Intente nuevamente');}
}
