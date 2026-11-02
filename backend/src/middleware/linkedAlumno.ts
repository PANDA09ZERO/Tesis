import { NextFunction, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response';
import { profesorTieneAccesoAlumno } from '../utils/profesorAlcance';

export function authorizeLinkedAlumno(paramName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.rol !== 'apoderado' && req.user?.rol !== 'profesor' && req.user?.rol !== 'alumno') return next();

    try {
      const alumnoId = Number(req.params[paramName]);
      if (req.user.rol === 'alumno') {
        const [own] = await pool.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ? AND usuario_id = ?', [alumnoId, req.user.userId]);
        if (!own.length) return sendError(res, 'Alumno no encontrado', 404);
        return next();
      }
      if (req.user.rol === 'apoderado') {
        const [links] = await pool.query<RowDataPacket[]>(
          `SELECT 1 FROM apoderado_alumno aa
           JOIN apoderados ap ON ap.id = aa.apoderado_id
           WHERE ap.usuario_id = ? AND aa.alumno_id = ? LIMIT 1`,
          [req.user.userId, alumnoId]
        )
        if (links.length === 0) return sendError(res, 'Alumno no encontrado', 404);
        return next();
      }

      if (req.user.rol === 'profesor') {
        if (req.query.periodo_id !== undefined && (!Number.isSafeInteger(Number(req.query.periodo_id)) || Number(req.query.periodo_id) <= 0)) return sendError(res, 'Periodo inválido', 400);
        const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, alumnoId, req.query.periodo_id ? Number(req.query.periodo_id) : undefined);
        if (!tieneAcceso) return sendError(res, 'Alumno no encontrado', 404);
        return next();
      }

      return next();
    } catch (error) {
      return sendError(res, 'No se pudo verificar el acceso al alumno');
    }
  };
}
