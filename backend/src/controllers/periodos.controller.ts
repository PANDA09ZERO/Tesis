import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllPeriodos(req: Request, res: Response) {
  try {
    const [periodos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM periodos_academicos ORDER BY fecha_inicio DESC'
    );
    return sendSuccess(res, periodos);
  } catch (error) {
    return sendError(res, 'Error al obtener periodos');
  }
}

export async function createPeriodo(req: Request, res: Response) {
  try {
    const { nombre, fecha_inicio, fecha_fin, activo } = req.body;

    if (activo) {
      await pool.query('UPDATE periodos_academicos SET activo = 0');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, ?)',
      [nombre, fecha_inicio, fecha_fin, activo || 0]
    );

    return sendSuccess(res, { id: result.insertId }, 'Periodo creado exitosamente', 201);
  } catch (error) {
    return sendError(res, 'Error al crear periodo');
  }
}

export async function updatePeriodo(req: Request, res: Response) {
  try {
    const { nombre, fecha_inicio, fecha_fin, activo } = req.body;

    if (activo) {
      await pool.query('UPDATE periodos_academicos SET activo = 0');
    }

    await pool.query(
      `UPDATE periodos_academicos SET nombre = COALESCE(?, nombre),
       fecha_inicio = COALESCE(?, fecha_inicio), fecha_fin = COALESCE(?, fecha_fin),
       activo = COALESCE(?, activo) WHERE id = ?`,
      [nombre, fecha_inicio, fecha_fin, activo, req.params.id]
    );

    return sendSuccess(res, null, 'Periodo actualizado');
  } catch (error) {
    return sendError(res, 'Error al actualizar periodo');
  }
}

export async function deletePeriodo(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM periodos_academicos WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Periodo eliminado');
  } catch (error) {
    return sendError(res, 'Error al eliminar periodo');
  }
}
