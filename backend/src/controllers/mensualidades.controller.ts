import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { sendSuccess, sendError } from '../utils/response';
import { controladoresPago, filtrosPago } from '../utils/pagos';
const pagos = controladoresPago('mensualidad');
export const getAllMensualidades = pagos.list;
export const getMensualidadById = pagos.get;
export const createMensualidad = pagos.create;
export const updateMensualidad = pagos.update;
export const deleteMensualidad = pagos.remove;
export const getResumenMensualidades = pagos.summary;
export async function getAlumnosConDeuda(req: Request, res: Response) {
  try {
    const filters = filtrosPago('mensualidad', req.query);
    const params = filters.params;
    const where = filters.where.replace('p.codigo_alumno', 'a.codigo_alumno') +
      (filters.where ? ' AND' : 'WHERE') + " m.estado IN ('pendiente', 'vencido')";
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT a.id alumno_id, a.codigo_alumno,
      u.nombre alumno_nombre, u.apellido alumno_apellido, u.telefono alumno_telefono,
      g.nombre grado, COUNT(m.id) mensualidades_pendientes, SUM(m.monto) total_deuda
      FROM mensualidades m JOIN alumnos a ON m.alumno_id = a.id JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN grados g ON a.grado_id = g.id ${where}
      GROUP BY a.id, a.codigo_alumno, u.nombre, u.apellido, u.telefono, g.nombre ORDER BY total_deuda DESC`, params);
    return sendSuccess(res, rows);
  } catch (error: any) {
    if (error?.status === 400) return sendError(res, error.message, 400);
    logError('Error al consultar deuda:', error);
    return sendError(res, 'No se pudo consultar la deuda de mensualidades');
  }
}
