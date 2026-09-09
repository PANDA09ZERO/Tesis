import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllAlertas(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const estado = req.query.estado as string || 'activa';
    const tipoRiesgo = req.query.tipo_riesgo as string;

    let whereClause = 'WHERE aa.estado = ?';
    const params: any[] = [estado];

    if (tipoRiesgo) { whereClause += ' AND aa.tipo_riesgo = ?'; params.push(tipoRiesgo); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM alertas_academicas aa ${whereClause}`, params
    );

    const [alertas] = await pool.query<RowDataPacket[]>(
      `SELECT aa.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido,
              a.codigo_alumno, g.nombre as grado, s.nombre as seccion,
              ua.nombre as asignada_nombre, ua.apellido as asignada_apellido
       FROM alertas_academicas aa
       JOIN alumnos a ON aa.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN secciones s ON a.seccion_id = s.id
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

export async function updateAlertaEstado(req: Request, res: Response) {
  try {
    const { estado } = req.body;

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

export async function getAlertasEstadisticas(req: Request, res: Response) {
  try {
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'activa' THEN 1 ELSE 0 END) as activas,
        SUM(CASE WHEN tipo_riesgo = 'alto' AND estado = 'activa' THEN 1 ELSE 0 END) as alto_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'medio' AND estado = 'activa' THEN 1 ELSE 0 END) as medio_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'bajo' AND estado = 'activa' THEN 1 ELSE 0 END) as bajo_riesgo
       FROM alertas_academicas`
    );

    return sendSuccess(res, stats[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas de alertas');
  }
}
