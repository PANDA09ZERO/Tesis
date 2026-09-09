import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllHorarios(req: Request, res: Response) {
  try {
    const periodoId = req.query.periodo_id as string;
    const seccionId = req.query.seccion_id as string;
    const profesorId = req.query.profesor_id as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (periodoId) { whereClause += ' AND h.periodo_academico_id = ?'; params.push(periodoId); }
    if (seccionId) { whereClause += ' AND h.seccion_id = ?'; params.push(seccionId); }
    if (profesorId) { whereClause += ' AND h.profesor_id = ?'; params.push(profesorId); }

    const [horarios] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, cu.nombre as curso_nombre, cu.codigo as curso_codigo,
              CONCAT(ub.nombre, ' ', ub.apellido) as profesor_nombre,
              s.nombre as seccion, g.nombre as grado, pa.nombre as periodo
       FROM horarios h
       JOIN cursos cu ON h.curso_id = cu.id
       JOIN profesores p ON h.profesor_id = p.id
       JOIN usuarios ub ON p.usuario_id = ub.id
       JOIN secciones s ON h.seccion_id = s.id
       JOIN grados g ON s.grado_id = g.id
       JOIN periodos_academicos pa ON h.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'), h.hora_inicio`,
      params
    );

    return sendSuccess(res, horarios);
  } catch (error) {
    return sendError(res, 'Error al obtener horarios');
  }
}

export async function createHorario(req: Request, res: Response) {
  try {
    const { curso_id, profesor_id, seccion_id, periodo_academico_id, dia_semana,
            hora_inicio, hora_fin, aula } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM horarios 
       WHERE profesor_id = ? AND periodo_academico_id = ? AND dia_semana = ?
       AND ((hora_inicio < ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin > ?)
            OR (hora_inicio >= ? AND hora_fin <= ?))`,
      [profesor_id, periodo_academico_id, dia_semana,
       hora_fin, hora_inicio, hora_fin, hora_inicio, hora_inicio, hora_fin]
    );

    if (existing.length > 0) {
      return sendError(res, 'El profesor ya tiene un horario en ese rango de tiempo', 409);
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO horarios (curso_id, profesor_id, seccion_id, periodo_academico_id,
       dia_semana, hora_inicio, hora_fin, aula)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [curso_id, profesor_id, seccion_id, periodo_academico_id,
       dia_semana, hora_inicio, hora_fin, aula || null]
    );

    return sendSuccess(res, { id: result.insertId }, 'Horario creado exitosamente', 201);
  } catch (error) {
    return sendError(res, 'Error al crear horario');
  }
}

export async function updateHorario(req: Request, res: Response) {
  try {
    const { curso_id, profesor_id, seccion_id, dia_semana, hora_inicio, hora_fin, aula } = req.body;

    await pool.query(
      `UPDATE horarios SET curso_id = COALESCE(?, curso_id),
       profesor_id = COALESCE(?, profesor_id), seccion_id = COALESCE(?, seccion_id),
       dia_semana = COALESCE(?, dia_semana), hora_inicio = COALESCE(?, hora_inicio),
       hora_fin = COALESCE(?, hora_fin), aula = COALESCE(?, aula)
       WHERE id = ?`,
      [curso_id, profesor_id, seccion_id, dia_semana, hora_inicio, hora_fin, aula, req.params.id]
    );

    return sendSuccess(res, null, 'Horario actualizado');
  } catch (error) {
    return sendError(res, 'Error al actualizar horario');
  }
}

export async function deleteHorario(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM horarios WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Horario eliminado');
  } catch (error) {
    return sendError(res, 'Error al eliminar horario');
  }
}
