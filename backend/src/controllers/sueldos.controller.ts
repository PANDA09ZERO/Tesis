import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllSueldos(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const { search, profesor_id, curso_id, estado, mes, año } = req.query as any;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) { whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (profesor_id) { whereClause += ' AND s.profesor_id = ?'; params.push(profesor_id); }
    if (curso_id) { whereClause += ' AND s.curso_id = ?'; params.push(curso_id); }
    if (estado) { whereClause += ' AND s.estado = ?'; params.push(estado); }
    if (mes) { whereClause += ' AND s.mes = ?'; params.push(mes); }
    if (año) { whereClause += ' AND s.año = ?'; params.push(año); }

    const [countResult] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM sueldos s JOIN profesores p ON s.profesor_id = p.id JOIN usuarios u ON p.usuario_id = u.id ${whereClause}`, params);
    const [sueldos] = await pool.query<RowDataPacket[]>(`SELECT s.*, u.nombre as profesor_nombre, u.apellido as profesor_apellido, cu.nombre as curso_nombre, pa.nombre as periodo FROM sueldos s JOIN profesores p ON s.profesor_id = p.id JOIN usuarios u ON p.usuario_id = u.id JOIN cursos cu ON s.curso_id = cu.id JOIN periodos_academicos pa ON s.periodo_academico_id = pa.id ${whereClause} ORDER BY s.año DESC, s.mes DESC, s.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return sendPaginated(res, sueldos, countResult[0].total, page, limit);
  } catch (error) {
    console.error('Error al obtener sueldos:', error);
    return sendError(res, 'Error al obtener sueldos');
  }
}

export async function createSueldo(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { profesor_id, curso_id, periodo_academico_id, salario_base, horas_clase, monto_extra, mes, año } = req.body;
    const monto_total = salario_base + (horas_clase || 0) * 50 + (monto_extra || 0);
    const [result] = await connection.query<ResultSetHeader>('INSERT INTO sueldos (profesor_id, curso_id, periodo_academico_id, salario_base, horas_clase, monto_extra, monto_total, mes, año) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [profesor_id, curso_id, periodo_academico_id, salario_base, horas_clase, monto_extra, monto_total, mes, año]);
    await connection.commit();
    return sendSuccess(res, { id: result.insertId, monto_total }, 'Sueldo registrado', 201);
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear sueldo:', error);
    return sendError(res, 'Error al registrar sueldo');
  } finally {
    connection.release();
  }
}

export async function updateSueldo(req: Request, res: Response) {
  try {
    const { salario_base, horas_clase, monto_extra, estado, fecha_pago, observaciones } = req.body;
    const monto_total = (salario_base || 0) + ((horas_clase || 0) * 50) + (monto_extra || 0);
    await pool.query('UPDATE sueldos SET salario_base = COALESCE(?, salario_base), horas_clase = COALESCE(?, horas_clase), monto_extra = COALESCE(?, monto_extra), monto_total = ?, estado = COALESCE(?, estado), fecha_pago = COALESCE(?, fecha_pago), observaciones = COALESCE(?, observaciones) WHERE id = ?', [salario_base, horas_clase, monto_extra, monto_total, estado, fecha_pago, observaciones, req.params.id]);
    return sendSuccess(res, null, 'Sueldo actualizado');
  } catch (error) {
    return sendError(res, 'Error al actualizar sueldo');
  }
}

export async function getSueldoById(req: Request, res: Response) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT s.*, u.nombre as profesor_nombre, u.apellido as profesor_apellido, cu.nombre as curso_nombre, pa.nombre as periodo FROM sueldos s JOIN profesores p ON s.profesor_id = p.id JOIN usuarios u ON p.usuario_id = u.id JOIN cursos cu ON s.curso_id = cu.id JOIN periodos_academicos pa ON s.periodo_academico_id = pa.id WHERE s.id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'Sueldo no encontrado', 404);
    return sendSuccess(res, rows[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener sueldo');
  }
}

export async function deleteSueldo(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM sueldos WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Sueldo eliminado');
  } catch (error) {
    return sendError(res, 'Error al eliminar sueldo');
  }
}

export async function getResumenSueldos(req: Request, res: Response) {
  try {
    const { año } = req.query;
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT s.mes, SUM(s.monto_total) as total_mes, COUNT(*) as total, SUM(CASE WHEN s.estado = 'pagado' THEN 1 ELSE 0 END) as pagados, SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes FROM sueldos s WHERE s.año = ? GROUP BY s.mes ORDER BY FIELD(s.mes, 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre')`, [año || '2026']);
    return sendSuccess(res, rows);
  } catch (error) {
    return sendError(res, 'Error al obtener resumen');
  }
}
