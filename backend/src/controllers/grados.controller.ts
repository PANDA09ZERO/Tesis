import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { profesorOfertaScope } from '../utils/profesorAlcance';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

export async function getAllGrados(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorOfertaScope('scope_pgc', req.user.userId) : null;
    const [grados] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.nombre, g.nivel, g.orden FROM grados g ${scope ? 'WHERE EXISTS (SELECT 1 FROM periodo_grado_cursos scope_pgc WHERE scope_pgc.grado_id = g.id AND ' + scope.sql + ')' : ''} ORDER BY g.orden, g.nombre`, scope?.params || []
    );
    return sendSuccess(res, grados);
  } catch (error) {
    return sendError(res, 'Error al obtener grados');
  }
}
