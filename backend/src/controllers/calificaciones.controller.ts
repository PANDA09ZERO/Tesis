import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getCalificacionesByAlumno(req: Request, res: Response) {
  try {
    const { alumno_id } = req.params;
    const periodoId = req.query.periodo_id as string;

    let whereClause = 'WHERE c.alumno_id = ?';
    const params: any[] = [alumno_id];

    if (periodoId) {
      whereClause += ' AND c.periodo_academico_id = ?';
      params.push(periodoId);
    }

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, cu.nombre as curso_nombre, cu.codigo as curso_codigo,
              pa.nombre as periodo_nombre
       FROM calificaciones c
       JOIN cursos cu ON c.curso_id = cu.id
       JOIN periodos_academicos pa ON c.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY cu.nombre, c.fecha_evaluacion DESC`,
      params
    );

    const [promedio] = await pool.query<RowDataPacket[]>(
      `SELECT AVG(nota) as promedio_general, MIN(nota) as nota_minima, MAX(nota) as nota_maxima
       FROM calificaciones c ${whereClause}`,
      params
    );

    return sendSuccess(res, {
      calificaciones,
      resumen: promedio[0]
    });
  } catch (error) {
    return sendError(res, 'Error al obtener calificaciones');
  }
}

export async function getCalificacionesByCurso(req: Request, res: Response) {
  try {
    const { curso_id } = req.params;
    const periodoId = req.query.periodo_id as string;

    let whereClause = 'WHERE c.curso_id = ?';
    const params: any[] = [curso_id];

    if (periodoId) {
      whereClause += ' AND c.periodo_academico_id = ?';
      params.push(periodoId);
    }

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.nombre, u.apellido, a.codigo_alumno
       FROM calificaciones c
       JOIN alumnos a ON c.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre`,
      params
    );

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT AVG(nota) as promedio, 
              SUM(CASE WHEN nota >= 11 THEN 1 ELSE 0 END) as aprobados,
              SUM(CASE WHEN nota < 11 THEN 1 ELSE 0 END) as desaprobados,
              COUNT(*) as total
       FROM calificaciones c ${whereClause}`,
      params
    );

    return sendSuccess(res, { calificaciones, estadisticas: stats[0] });
  } catch (error) {
    return sendError(res, 'Error al obtener calificaciones del curso');
  }
}

export async function registerCalificacion(req: AuthRequest, res: Response) {
  try {
    const { alumno_id, curso_id, periodo_academico_id, nota, tipo_evaluacion, observaciones, fecha_evaluacion } = req.body;

    const [profesor] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM profesores WHERE usuario_id = ?',
      [req.user!.userId]
    );

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion, observaciones, registrado_por, fecha_evaluacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion || 'general', observaciones || null,
       profesor.length > 0 ? profesor[0].id : null, fecha_evaluacion || new Date()]
    );

    return sendSuccess(res, { id: result.insertId }, 'Calificación registrada exitosamente', 201);
  } catch (error) {
    return sendError(res, 'Error al registrar calificación');
  }
}

export async function updateCalificacion(req: Request, res: Response) {
  try {
    const { nota, tipo_evaluacion, observaciones } = req.body;

    await pool.query(
      `UPDATE calificaciones SET nota = COALESCE(?, nota),
       tipo_evaluacion = COALESCE(?, tipo_evaluacion),
       observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [nota, tipo_evaluacion, observaciones, req.params.id]
    );

    return sendSuccess(res, null, 'Calificación actualizada exitosamente');
  } catch (error) {
    return sendError(res, 'Error al actualizar calificación');
  }
}

export async function bulkRegisterCalificaciones(req: Request, res: Response) {
  try {
    const { calificaciones } = req.body;

    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
      return sendError(res, 'Array de calificaciones requerido', 400);
    }

    const values = calificaciones.map((c: any) => [
      c.alumno_id, c.curso_id, c.periodo_academico_id,
      c.nota, c.tipo_evaluacion || 'general', c.observaciones || null,
      c.fecha_evaluacion || new Date()
    ]);

    await pool.query(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion, observaciones, fecha_evaluacion)
       VALUES ?`,
      [values]
    );

    return sendSuccess(res, null, `${calificaciones.length} calificaciones registradas`, 201);
  } catch (error) {
    return sendError(res, 'Error al registrar calificaciones masivamente');
  }
}
