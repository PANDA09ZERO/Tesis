import { periodoVigenteSql } from '../utils/periodoVigencia';
import { logError } from '../utils/logger';
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendError,sendSuccess } from '../utils/response';
import { profesorOfertaScope,profesorAlumnoScope } from '../utils/profesorAlcance';

async function perfil(userId:number) {
  const [rows]=await pool.query<RowDataPacket[]>(`SELECT p.id,p.especialidad,p.titulo_profesional,
    DATE_FORMAT(p.fecha_ingreso,'%Y-%m-%d') fecha_ingreso,u.nombre,u.apellido,u.email,u.dni,u.telefono,u.direccion,
    DATE_FORMAT(u.fecha_nacimiento,'%Y-%m-%d') fecha_nacimiento,u.genero,u.foto_url
    FROM profesores p JOIN usuarios u ON u.id=p.usuario_id JOIN roles r ON r.id=u.rol_id
    WHERE p.usuario_id=? AND u.activo=1 AND r.nombre='profesor'`,[userId]);
  return rows[0];
}
export async function getMiPerfil(req:AuthRequest,res:Response) {
  try {
    const own=await perfil(req.user!.userId);
    if(!own)return sendError(res,'La cuenta no tiene un perfil de profesor disponible. Contacta con administración.',404);
    return sendSuccess(res,own);
  } catch(error) {logError('Error al cargar perfil personal de profesor:',error);return sendError(res,'No se pudo cargar tu perfil de profesor');}
}
export async function getMiResumen(req:AuthRequest,res:Response) {
  try {
    const userId=req.user!.userId;
    if(!await perfil(userId))return sendError(res,'Perfil de profesor no encontrado',404);
    const scope=profesorOfertaScope('pgc',userId);
    const [periodos]=await pool.query<RowDataPacket[]>(`SELECT DISTINCT pa.id,pa.nombre,${periodoVigenteSql('pa')} AS activo,
      DATE_FORMAT(pa.fecha_inicio,'%Y-%m-%d') fecha_inicio,DATE_FORMAT(pa.fecha_fin,'%Y-%m-%d') fecha_fin
      FROM periodos_academicos pa JOIN periodo_grado_cursos pgc ON pgc.periodo_academico_id=pa.id
      WHERE ${scope.sql} ORDER BY activo DESC,fecha_inicio DESC,pa.id DESC`,scope.params);
    const requested=req.query.periodo_id;
    if(requested!==undefined && (typeof requested!=='string'||!/^[1-9][0-9]*$/.test(requested)||!Number.isSafeInteger(Number(requested))))return sendError(res,'Periodo inválido',400);
    const periodo=requested===undefined?periodos[0]:periodos.find(p=>p.id===Number(requested));
    if(requested!==undefined&&!periodo)return sendError(res,'Periodo no encontrado en tus asignaciones',404);
    if(!periodo)return sendSuccess(res,{periodos,periodo:null,totalAlumnos:0,totalCursos:0,alertasActivas:0,evaluaciones:[]});
    const students=profesorAlumnoScope('a',userId,periodo.id);
    const [alumnos]=await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM alumnos a WHERE ${students.sql}`,students.params);
    const [cursos]=await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM periodo_grado_cursos pgc WHERE pgc.periodo_academico_id=? AND ${scope.sql}`,[periodo.id,...scope.params]);
    const [alertas]=await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM alertas_academicas aa JOIN alumnos a ON a.id=aa.alumno_id WHERE aa.estado='activa' AND ${students.sql}`,students.params);
    const [evaluaciones]=await pool.query<RowDataPacket[]>(`SELECT e.id,e.nombre,e.tipo,e.nota_maxima,
      DATE_FORMAT(e.fecha_evaluacion,'%Y-%m-%d') fecha_evaluacion,cu.nombre curso,g.nombre grado,pgc.id oferta_id
      FROM evaluaciones e JOIN periodo_grado_cursos pgc ON pgc.id=e.periodo_grado_curso_id
      JOIN cursos cu ON cu.id=pgc.curso_id JOIN grados g ON g.id=pgc.grado_id
      WHERE pgc.periodo_academico_id=? AND e.estado='activa' AND e.fecha_evaluacion>=CURDATE() AND ${scope.sql}
      ORDER BY e.fecha_evaluacion,e.id LIMIT 10`,[periodo.id,...scope.params]);
    return sendSuccess(res,{periodos,periodo,totalAlumnos:alumnos[0].total,totalCursos:cursos[0].total,alertasActivas:alertas[0].total,evaluaciones});
  } catch(error) {logError('Error al cargar resumen personal de profesor:',error);return sendError(res,'No se pudo cargar tu panel de profesor');}
}
