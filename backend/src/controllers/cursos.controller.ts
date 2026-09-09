import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllCursos(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';
    const gradoId = req.query.grado_id as string;

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause = 'WHERE cu.nombre LIKE ? OR cu.codigo LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (gradoId) {
      whereClause += (whereClause ? ' AND ' : 'WHERE ') + 'cu.grado_id = ?';
      params.push(gradoId);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM cursos cu ${whereClause}`, params
    );

    const [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT cu.*, g.nombre as grado_nombre
       FROM cursos cu
       LEFT JOIN grados g ON cu.grado_id = g.id
       ${whereClause}
       ORDER BY cu.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

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

export async function deleteCurso(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM cursos WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Curso eliminado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al eliminar curso');
  }
}
