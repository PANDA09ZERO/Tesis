import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno, profesorAlumnoScope } from '../utils/profesorAlcance';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllAlertas(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const estado = req.query.estado as string || 'activa';
    const tipoRiesgo = req.query.tipo_riesgo as string;

    let whereClause = 'WHERE aa.estado = ?';
    const params: any[] = [estado];

    if (req.user?.rol === 'profesor') {
      const scope = profesorAlumnoScope('a_scope', req.user.userId);
      whereClause += ' AND EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = aa.alumno_id AND ' + scope.sql + ')';
      params.push(...scope.params);
    }

    if (req.user?.rol === 'alumno') { whereClause += ' AND aa.alumno_id = (SELECT id FROM alumnos WHERE usuario_id = ?)';params.push(req.user.userId); }
    if (tipoRiesgo) { whereClause += ' AND aa.tipo_riesgo = ?'; params.push(tipoRiesgo); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM alertas_academicas aa ${whereClause}`, params
    );

    const [alertas] = await pool.query<RowDataPacket[]>(
      `SELECT aa.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido,
              a.codigo_alumno, g.nombre as grado,
              ua.nombre as asignada_nombre, ua.apellido as asignada_apellido
       FROM alertas_academicas aa
       JOIN alumnos a ON aa.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN usuarios ua ON aa.asignada_a = ua.id
       ${whereClause}
       ORDER BY FIELD(aa.tipo_riesgo, 'alto', 'medio', 'bajo'), aa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, alertas, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener alertas');
  }
}

export async function updateAlertaEstado(req: AuthRequest, res: Response) {
  try {
    const { estado } = req.body;
    if (!['activa','atendida','resuelta','expirada'].includes(estado)) return sendError(res, 'Estado de alerta inválido', 400);

    // Primero obtener el alumno_id de la alerta
    const [alerta] = await pool.query<RowDataPacket[]>(
      'SELECT alumno_id FROM alertas_academicas WHERE id = ?',
      [req.params.id]
    );

    if (alerta.length === 0) {
      return sendError(res, 'Alerta no encontrada', 404);
    }

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, alerta[0].alumno_id);
      if (!tieneAcceso) {
        return sendError(res, 'Alerta no encontrada', 404);
      }
    }

    await pool.query(
      'UPDATE alertas_academicas SET estado = ? WHERE id = ?',
      [estado, req.params.id]
    );

    return sendSuccess(res, null, 'Alerta actualizada');
  } catch (error) {
    return sendError(res, 'Error al actualizar alerta');
  }
}

export async function asignarAlerta(req: Request, res: Response) {
  try {
    const { asignada_a } = req.body;

    await pool.query(
      'UPDATE alertas_academicas SET asignada_a = ? WHERE id = ?',
      [asignada_a, req.params.id]
    );

    return sendSuccess(res, null, 'Alerta asignada');
  } catch (error) {
    return sendError(res, 'Error al asignar alerta');
  }
}

export async function getAlertasEstadisticas(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorAlumnoScope('a_scope', req.user.userId) : null;
    const teacherFilter = req.user?.rol === 'alumno' ? 'WHERE alumno_id = (SELECT id FROM alumnos WHERE usuario_id = ?)' : scope ? 'WHERE EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = alertas_academicas.alumno_id AND ' + scope.sql + ')' : '';
    const params = req.user?.rol === 'alumno' ? [req.user.userId] : scope?.params || [];
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'activa' THEN 1 ELSE 0 END) as activas,
        SUM(CASE WHEN tipo_riesgo = 'alto' AND estado = 'activa' THEN 1 ELSE 0 END) as alto_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'medio' AND estado = 'activa' THEN 1 ELSE 0 END) as medio_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'bajo' AND estado = 'activa' THEN 1 ELSE 0 END) as bajo_riesgo
      FROM alertas_academicas
      ${teacherFilter}`,
          params
    );

    return sendSuccess(res, stats[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas de alertas');
  }
}
