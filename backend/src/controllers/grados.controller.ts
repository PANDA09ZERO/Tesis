import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

export async function getAllGrados(req: Request, res: Response) {
  try {
    const [grados] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, nivel, orden FROM grados ORDER BY orden, nombre'
    );
    return sendSuccess(res, grados);
  } catch (error) {
    return sendError(res, 'Error al obtener grados');
  }
}
