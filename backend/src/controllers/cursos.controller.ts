import {PoolConnection} from 'mysql2/promise';
import {finishTransaction} from '../utils/transaction';
import {positiveId} from '../utils/academicValidation';
import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { profesorCursoScope, profesorTieneAccesoCurso, profesorMatriculaScope, profesorOfertaScope } from '../utils/profesorAlcance';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllCursos(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';
    const gradoId = req.query.grado_id as string;
    const nivel = req.query.nivel as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (cu.nombre LIKE ? OR cu.codigo LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (gradoId) {
      whereClause += ' AND cu.grado_id = ?';
      params.push(gradoId);
    }
    if (nivel) {
      whereClause += ' AND g.nivel = ?';
      params.push(nivel);
    }
    if (req.user?.rol === 'profesor') {
      // Para cursos que tienen grado_id directo
      whereClause += ` AND (
        EXISTS (
          SELECT 1 FROM periodo_grado_cursos pgc
          JOIN periodo_grado_curso_profesores pgcp ON pgcp.periodo_grado_curso_id = pgc.id
          WHERE pgc.curso_id = cu.id
            AND pgc.periodo_academico_id = (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1)
            AND pgcp.profesor_id = (SELECT id FROM profesores WHERE usuario_id = ?)
        )
      )`;
      params.push(req.user.userId);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM cursos cu LEFT JOIN grados g ON cu.grado_id = g.id ${whereClause}`, params
    );

    const [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT cu.*, g.nombre as grado_nombre, g.nivel
       FROM cursos cu
       LEFT JOIN grados g ON cu.grado_id = g.id
       ${whereClause}
       ORDER BY cu.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Para cada curso, obtener sus profesores
    for (const curso of cursos) {
      const [profesores] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT p.id, u.nombre, u.apellido
         FROM periodo_grado_cursos pgc JOIN periodo_grado_curso_profesores pc ON pc.periodo_grado_curso_id=pgc.id
         INNER JOIN profesores p ON pc.profesor_id = p.id
         INNER JOIN usuarios u ON p.usuario_id = u.id
         WHERE pgc.curso_id = ? ${req.user?.rol==='profesor'?'AND pgc.periodo_academico_id=(SELECT id FROM periodos_academicos WHERE activo=1 LIMIT 1) AND '+profesorOfertaScope('pgc',req.user.userId).sql:''}`,
        [curso.id,...(req.user?.rol==='profesor'?profesorOfertaScope('pgc',req.user.userId).params:[])]
      );
      (curso as any).profesores = profesores;
    }

    return sendPaginated(res, cursos, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener cursos');
  }
}

export async function createCurso(req: Request, res: Response) {
  try {
    const { nombre, codigo, descripcion, grado_id } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO cursos (nombre, codigo, descripcion, grado_id) VALUES (?, ?, ?, ?)',
      [nombre, codigo || null, descripcion || null, grado_id || null]
    );

    return sendSuccess(res, { id: result.insertId }, 'Curso creado exitosamente', 201);
  } catch (error) {
    return sendError(res, 'Error al crear curso');
  }
}

export async function updateCurso(req: Request, res: Response) {
  try {
    const { nombre, codigo, descripcion, grado_id } = req.body;

    await pool.query(
      `UPDATE cursos SET nombre = COALESCE(?, nombre), codigo = COALESCE(?, codigo),
       descripcion = COALESCE(?, descripcion), grado_id = COALESCE(?, grado_id)
       WHERE id = ?`,
      [nombre, codigo, descripcion, grado_id, req.params.id]
    );

    return sendSuccess(res, null, 'Curso actualizado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al actualizar curso');
  }
}

export async function getCursoById(req: AuthRequest, res: Response) {
  try {
    const periodoId = req.query.periodo_id ? Number(req.query.periodo_id) : undefined;
    if (req.user?.rol === 'profesor' && !(await profesorTieneAccesoCurso(pool, req.user.userId, Number(req.params.id), periodoId))) return sendError(res, 'Curso no encontrado', 404);
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT cu.*, g.nombre grado_nombre FROM cursos cu LEFT JOIN grados g ON g.id = cu.grado_id WHERE cu.id = ?`, [req.params.id]);
    if (!rows.length) return sendError(res, 'Curso no encontrado', 404);
    const [profesores]=await pool.query<RowDataPacket[]>(`SELECT DISTINCT p.id,u.nombre,u.apellido,u.email,p.especialidad,p.titulo_profesional
    FROM periodo_grado_cursos pgc JOIN periodo_grado_curso_profesores assigned ON assigned.periodo_grado_curso_id=pgc.id
    JOIN profesores p ON p.id=assigned.profesor_id JOIN usuarios u ON u.id=p.usuario_id
    JOIN periodos_academicos pa ON pa.id=pgc.periodo_academico_id WHERE pgc.curso_id=?
    ${periodoId?'AND pa.id=?':req.user?.rol==='profesor'?'AND pa.activo=1':''}
    ${req.user?.rol==='profesor'?'AND EXISTS(SELECT 1 FROM periodo_grado_curso_profesores own JOIN profesores op ON op.id=own.profesor_id WHERE own.periodo_grado_curso_id=pgc.id AND op.usuario_id=?)':''}`,
    [req.params.id,...(periodoId?[periodoId]:[]),...(req.user?.rol==='profesor'?[req.user.userId]:[])]);
    const scope = req.user?.rol === 'profesor' ? profesorMatriculaScope('m', req.user.userId) : null;
    const [alumnos] = await pool.query<RowDataPacket[]>(`SELECT m.id matricula_id, a.id alumno_id,a.codigo_alumno,
      u.nombre,u.apellido,g.nombre grado,pa.nombre periodo,m.estado estado_matricula
      FROM matriculas m JOIN alumnos a ON a.id = m.alumno_id JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN cursos cu ON cu.id = m.curso_id LEFT JOIN grados g ON g.id = COALESCE(m.grado_id,cu.grado_id)
      JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
      WHERE m.curso_id = ? AND m.estado = 'activa'
        ${scope ? 'AND ' + (periodoId ? 'pa.id = ?' : 'pa.activo = 1') + ' AND ' + scope.sql : ''}
      ORDER BY u.apellido,u.nombre`, [req.params.id,...(scope && periodoId ? [periodoId] : []),...(scope?.params || [])]);
    return sendSuccess(res,{...rows[0],profesores,alumnos});
  } catch(error) {logError('Error al consultar curso:',error);return sendError(res,'Error al obtener curso');}
}

export async function deleteCurso(req:Request,res:Response){
 if(!positiveId(req.params.id))return sendError(res,'Curso inválido',400);let db:PoolConnection|undefined,committed=false;
 try{db=await pool.getConnection();await db.beginTransaction();const [rows]=await db.query<RowDataPacket[]>('SELECT id FROM cursos WHERE id=? FOR UPDATE',[req.params.id]);if(!rows.length)return sendError(res,'Curso no encontrado',404);
 const [refs]=await db.query<RowDataPacket[]>(`SELECT EXISTS(SELECT 1 FROM periodo_grado_cursos WHERE curso_id=?) OR EXISTS(SELECT 1 FROM matriculas WHERE curso_id=?) OR EXISTS(SELECT 1 FROM horarios WHERE curso_id=?) OR EXISTS(SELECT 1 FROM calificaciones WHERE curso_id=?) OR EXISTS(SELECT 1 FROM asistencias WHERE curso_id=?) OR EXISTS(SELECT 1 FROM profesor_curso WHERE curso_id=?) linked`,Array(6).fill(req.params.id));
 if(refs[0].linked)return sendError(res,'El curso tiene ofertas, matrículas, horarios o historial. Conserva el catálogo y gestiona sus ofertas desde Estructura',409);
 await db.query('DELETE FROM cursos WHERE id=?',[req.params.id]);await db.commit();committed=true;return sendSuccess(res,null,'Curso eliminado');
 }catch(error){logError('Error al eliminar curso',error);return sendError(res,'No se pudo eliminar el curso');}finally{await finishTransaction(db,committed);}
}
