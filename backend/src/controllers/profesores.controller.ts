import { accountFailure } from '../utils/accountErrors';
import { PoolConnection } from 'mysql2/promise';
import { finishTransaction } from '../utils/transaction';
import { accountError } from '../utils/accountValidation';
import { positiveId } from '../utils/academicValidation';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../types';
import { profesorAlumnoScope, profesorMatriculaScope } from '../utils/profesorAlcance';
import { createInstitutionalCredentials } from '../utils/credentials';
import { encryptPasswordAsync } from '../utils/encrypt';

export async function getAllProfesores(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';

    const incluirInactivos = req.query.incluir_inactivos === 'true';
    let whereClause = incluirInactivos ? 'WHERE 1=1' : 'WHERE u.activo = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR p.especialidad LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM profesores p JOIN usuarios u ON p.usuario_id = u.id ${whereClause}`,
      params
    );

    const [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.usuario_id, u.nombre, u.apellido, u.email, u.dni,
              u.telefono, u.foto_url, p.especialidad, p.fecha_ingreso,
              p.titulo_profesional, u.activo
       FROM profesores p
       JOIN usuarios u ON p.usuario_id = u.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, profesores, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener profesores');
  }
}

export async function getProfesorById(req: Request, res: Response) {
  try {
    const [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.nombre, u.apellido, u.email, u.dni, u.telefono,
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url, u.activo
       FROM profesores p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (profesores.length === 0) {
      return sendError(res, 'Profesor no encontrado', 404);
    }

    const cursos=await asignacionesProfesor(Number(req.params.id));
    const cursosIds=[...new Set(cursos.map(c=>c.id))];
    return sendSuccess(res, { ...profesores[0], cursos_asignados: cursos, cursos: cursosIds });
  } catch (error) {
    return sendError(res, 'Error al obtener profesor');
  }
}

export async function createProfesor(req: Request, res: Response) {
  if(Object.prototype.hasOwnProperty.call(req.body,'cursos'))return sendError(res,'Asigna los cursos por periodo y grado desde Estructura académica',400);
  const validation = accountError(req.body,true,true);
  if(validation)return sendError(res,validation,400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, especialidad, titulo_profesional, fecha_ingreso, cursos } = req.body;

    const { email, temporaryPassword } = await createInstitutionalCredentials(connection, 'profesor', nombre, apellido);
    const passwordHash = await encryptPasswordAsync(temporaryPassword);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, debe_cambiar_password, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 2)`,
      [email, passwordHash, nombre, apellido, dni || null, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro']
    );

    const [profResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO profesores (usuario_id, especialidad, titulo_profesional, fecha_ingreso)
       VALUES (?, ?, ?, ?)`,
      [userResult.insertId, especialidad || null, titulo_profesional || null, fecha_ingreso || null]
    );

    await connection.commit(); committed = true;

    return sendSuccess(res, {
      id: profResult.insertId,
      usuario_id: userResult.insertId,
      credentials: { email, temporaryPassword, mustChangePassword: true, mailboxCreated: false }
    }, 'Profesor registrado exitosamente', 201);
  } catch (error) {
    return accountFailure(res,error,'Error al registrar profesor');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function updateProfesor(req: Request, res: Response) {
  if(Object.prototype.hasOwnProperty.call(req.body,'cursos'))return sendError(res,'Asigna los cursos por periodo y grado desde Estructura académica',400);
  const validation = accountError(req.body,false);
  if(validation)return sendError(res,validation,400);
  if(!positiveId(req.params.id))return sendError(res,'ID inválido',400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [current] = await connection.query<RowDataPacket[]>('SELECT id FROM profesores WHERE id = ? FOR UPDATE',[req.params.id]);
    if(!current.length)return sendError(res,'Profesor no encontrado',404);

    const { especialidad, titulo_profesional, fecha_ingreso, cursos, password } = req.body;


    if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) {
      return sendError(res, 'La contraseña debe tener al menos 6 caracteres', 400);
    }

    await connection.query(
      `UPDATE profesores SET especialidad = COALESCE(?, especialidad),
       titulo_profesional = COALESCE(?, titulo_profesional),
       fecha_ingreso = COALESCE(NULLIF(?, ''), fecha_ingreso)
       WHERE id = ?`,
      [especialidad, titulo_profesional, fecha_ingreso, req.params.id]
    );

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await connection.query(
        `UPDATE usuarios u
         JOIN profesores p ON p.usuario_id = u.id
         SET u.password_hash = ?, u.debe_cambiar_password = 1
         WHERE p.id = ?`,
        [passwordHash, req.params.id]
      );
    }

    await connection.commit(); committed = true;

    return sendSuccess(res, null, 'Profesor actualizado exitosamente');
  } catch (error) {
    return accountFailure(res,error,'Error al actualizar profesor');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function deleteProfesor(req: Request, res: Response) {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE usuarios u
       JOIN profesores p ON p.usuario_id = u.id
       SET u.activo = 0
       WHERE p.id = ? AND u.activo = 1`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return sendError(res, 'Profesor no encontrado', 404);
    }

    return sendSuccess(res, null, 'Profesor desactivado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al desactivar profesor');
  }
}

export async function getProfesorAlumnos(req:Request,res:Response){
 if(!positiveId(req.params.id)||(req.query.periodo_id!==undefined&&!positiveId(req.query.periodo_id)))return sendError(res,'Profesor o periodo inválido',400);
 try{const [rows]=await pool.query<RowDataPacket[]>(`SELECT DISTINCT a.id alumno_id,u.nombre,u.apellido,a.codigo_alumno,g.nombre grado,pa.nombre periodo
 FROM periodo_grado_curso_profesores assigned JOIN periodo_grado_cursos pgc ON pgc.id=assigned.periodo_grado_curso_id
 JOIN periodos_academicos pa ON pa.id=pgc.periodo_academico_id JOIN grados g ON g.id=pgc.grado_id
 JOIN matriculas m ON m.curso_id=pgc.curso_id AND m.periodo_academico_id=pgc.periodo_academico_id
 AND COALESCE(m.grado_id,(SELECT grado_id FROM cursos WHERE id=m.curso_id))=pgc.grado_id
 JOIN alumnos a ON a.id=m.alumno_id JOIN usuarios u ON u.id=a.usuario_id
 WHERE assigned.profesor_id=? AND m.estado='activa' AND ${req.query.periodo_id?'pa.id=?':'pa.activo=1'} ORDER BY g.nombre,u.apellido`,[req.params.id,...(req.query.periodo_id?[req.query.periodo_id]:[])]);
 return sendSuccess(res,rows);}catch{return sendError(res,'No se pudieron consultar los alumnos del profesor');}
}

export async function getMisApoderados(req: AuthRequest, res: Response) {
  try {
    const periodoId = req.query.periodo_id === undefined ? undefined : Number(req.query.periodo_id);
    if (periodoId !== undefined && (!Number.isSafeInteger(periodoId) || periodoId <= 0)) return sendError(res, 'Periodo inválido', 400);
    const scope = profesorMatriculaScope('m', req.user!.userId);
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT ap.id apoderado_id,
      ua.nombre, ua.apellido, ua.email, ua.telefono, a.id alumno_id,
      ua2.nombre alumno_nombre, ua2.apellido alumno_apellido, g.nombre grado, aa.parentesco
      FROM alumnos a JOIN matriculas m ON m.alumno_id = a.id AND m.estado = 'activa'
      JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id JOIN cursos cu ON cu.id = m.curso_id
      JOIN apoderado_alumno aa ON aa.alumno_id = a.id
      JOIN apoderados ap ON ap.id = aa.apoderado_id JOIN usuarios ua ON ua.id = ap.usuario_id
      JOIN usuarios ua2 ON ua2.id = a.usuario_id LEFT JOIN grados g ON g.id = COALESCE(m.grado_id,cu.grado_id)
      WHERE ua.activo = 1 AND ${periodoId ? 'pa.id = ?' : 'pa.activo = 1'} AND ${scope.sql} ORDER BY ua.apellido, ua2.apellido`, [...(periodoId ? [periodoId] : []),...scope.params]);
    return sendSuccess(res, rows);
  } catch (error) { return sendError(res, 'Error al obtener apoderados de sus alumnos'); }
}

async function asignacionesProfesor(profesorId:number){
 const [rows]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.nombre,c.codigo,pgc.id periodo_grado_curso_id,
 pgc.grado_id,g.nombre grado,pa.id periodo_academico_id,pa.nombre periodo,pa.activo periodo_activo,
 h.id horario_id,h.dia_semana,h.hora_inicio,h.hora_fin
 FROM periodo_grado_curso_profesores assigned JOIN periodo_grado_cursos pgc ON pgc.id=assigned.periodo_grado_curso_id
 JOIN cursos c ON c.id=pgc.curso_id JOIN grados g ON g.id=pgc.grado_id JOIN periodos_academicos pa ON pa.id=pgc.periodo_academico_id
 LEFT JOIN horarios h ON h.periodo_grado_curso_id=pgc.id AND h.profesor_id=assigned.profesor_id
 WHERE assigned.profesor_id=? ORDER BY pa.fecha_inicio DESC,g.orden,c.nombre,h.dia_semana,h.hora_inicio`,[profesorId]);return rows;
}
export async function getProfesorCursos(req:Request,res:Response){
 if(!positiveId(req.params.id))return sendError(res,'Profesor inválido',400);
 try{const rows=await asignacionesProfesor(Number(req.params.id));return sendSuccess(res,[...new Set(rows.map(row=>row.id))]);}
 catch{return sendError(res,'No se pudieron consultar las asignaciones del profesor');}
}
