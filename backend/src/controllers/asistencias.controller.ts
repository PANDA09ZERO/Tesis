import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAsistenciasByAlumno(req: Request, res: Response) {
  try {
    const { alumno_id } = req.params;
    const { fecha_inicio, fecha_fin, curso_id } = req.query;

    let whereClause = 'WHERE a.alumno_id = ?';
    const params: any[] = [alumno_id];

    if (fecha_inicio) { whereClause += ' AND a.fecha >= ?'; params.push(fecha_inicio); }
    if (fecha_fin) { whereClause += ' AND a.fecha <= ?'; params.push(fecha_fin); }
    if (curso_id) { whereClause += ' AND a.curso_id = ?'; params.push(curso_id); }

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, cu.nombre as curso_nombre
       FROM asistencias a
       LEFT JOIN cursos cu ON a.curso_id = cu.id
       ${whereClause}
       ORDER BY a.fecha DESC`,
      params
    );

    const [resumen] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_dias,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
        SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados,
        ROUND(SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as porcentaje_asistencia
       FROM asistencias a ${whereClause}`,
      params
    );

    return sendSuccess(res, { asistencias, resumen: resumen[0] });
  } catch (error) {
    return sendError(res, 'Error al obtener asistencias');
  }
}

export async function getAsistenciasByCurso(req: Request, res: Response) {
  try {
    const { curso_id } = req.params;
    const fecha = req.query.fecha as string || new Date().toISOString().split('T')[0];

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.nombre, u.apellido, a2.codigo_alumno
       FROM asistencias a
       JOIN alumnos a2 ON a.alumno_id = a2.id
       JOIN usuarios u ON a2.usuario_id = u.id
       WHERE a.curso_id = ? AND a.fecha = ?
       ORDER BY u.apellido`,
      [curso_id, fecha]
    );

    return sendSuccess(res, asistencias);
  } catch (error) {
    return sendError(res, 'Error al obtener asistencias del curso');
  }
}

export async function registerAsistencia(req: AuthRequest, res: Response) {
  try {
    const { alumno_id, curso_id, fecha, estado, minutos_tardanza, observaciones } = req.body;

    const [profesor] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM profesores WHERE usuario_id = ?', [req.user!.userId]
    );

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM asistencias WHERE alumno_id = ? AND fecha = ? AND (curso_id = ? OR (curso_id IS NULL AND ? IS NULL))',
      [alumno_id, fecha, curso_id, curso_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE asistencias SET estado = ?, minutos_tardanza = ?, observaciones = ? WHERE id = ?',
        [estado, minutos_tardanza || 0, observaciones || null, existing[0].id]
      );
      return sendSuccess(res, null, 'Asistencia actualizada');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO asistencias (alumno_id, curso_id, fecha, estado, minutos_tardanza, observaciones, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alumno_id, curso_id || null, fecha, estado, minutos_tardanza || 0,
       observaciones || null, profesor.length > 0 ? profesor[0].id : null]
    );

    return sendSuccess(res, { id: result.insertId }, 'Asistencia registrada', 201);
  } catch (error) {
    return sendError(res, 'Error al registrar asistencia');
  }
}

export async function bulkRegisterAsistencias(req: Request, res: Response) {
  try {
    const { asistencias } = req.body;

    if (!Array.isArray(asistencias) || asistencias.length === 0) {
      return sendError(res, 'Array de asistencias requerido', 400);
    }

    for (const a of asistencias) {
      await pool.query(
        `INSERT INTO asistencias (alumno_id, curso_id, fecha, estado, minutos_tardanza, observaciones, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado), minutos_tardanza = VALUES(minutos_tardanza)`,
        [a.alumno_id, a.curso_id || null, a.fecha, a.estado, a.minutos_tardanza || 0,
         a.observaciones || null, a.registrado_por || null]
      );
    }

    return sendSuccess(res, null, `${asistencias.length} asistencias registradas`, 201);
  } catch (error) {
    return sendError(res, 'Error al registrar asistencias masivamente');
  }
}

export async function getResumenAsistenciaGrado(req: Request, res: Response) {
  try {
    const [resumen] = await pool.query<RowDataPacket[]>(
      `SELECT g.nombre as grado, s.nombre as seccion,
        COUNT(DISTINCT a.alumno_id) as total_alumnos,
        ROUND(AVG(CASE WHEN a.estado = 'presente' THEN 100 ELSE 0 END), 2) as asistencia_promedio,
        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as total_ausencias
       FROM asistencias a
       JOIN alumnos al ON a.alumno_id = al.id
       JOIN grados g ON al.grado_id = g.id
       JOIN secciones s ON al.seccion_id = s.id
       WHERE MONTH(a.fecha) = MONTH(CURDATE()) AND YEAR(a.fecha) = YEAR(CURDATE())
       GROUP BY g.nombre, s.nombre
       ORDER BY g.nombre, s.nombre`
    );

    return sendSuccess(res, resumen);
  } catch (error) {
    return sendError(res, 'Error al obtener resumen de asistencia');
  }
}
