import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { Response } from 'express';
import { positiveId } from '../utils/academicValidation';
import { ensurePeriodsCurrent, periodoVigenteSql } from '../utils/periodoVigencia';
import { profesorOfertaScope, profesorHorarioScope } from '../utils/profesorAlcance';
import { sendError, sendSuccess } from '../utils/response';
import { logError } from '../utils/logger';

export async function getDetallePeriodo(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Periodo inválido', 400);
  try {
    await ensurePeriodsCurrent();
    const teacher = req.user!.rol === 'profesor';
    const offerScope = teacher ? profesorOfertaScope('pgc', req.user!.userId) : null;
    const scheduleScope = teacher ? profesorHorarioScope('h', req.user!.userId) : null;
    const id = Number(req.params.id);
    // Each scalar count has its own source; joining pupils, staff and timetables would multiply totals.
    const [rows] = await pool.query<RowDataPacket[]>(`WITH ofertas AS (
      SELECT pgc.id, pgc.grado_id, pgc.curso_id FROM periodo_grado_cursos pgc
      WHERE pgc.periodo_academico_id = ? ${offerScope ? 'AND ' + offerScope.sql : ''}
    ), inscripciones AS (
      SELECT m.alumno_id, m.estado FROM matriculas m WHERE m.periodo_academico_id = ?
      ${teacher ? `AND EXISTS (SELECT 1 FROM ofertas f WHERE f.curso_id = m.curso_id
        AND f.grado_id = COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)))` : ''}
    )
    SELECT pa.id, pa.nombre, DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
      DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin, ${periodoVigenteSql('pa')} AS activo,
      ${teacher ? '(SELECT COUNT(DISTINCT grado_id) FROM ofertas)' : '(SELECT COUNT(*) FROM periodo_grados pg WHERE pg.periodo_academico_id = pa.id)'} AS grados,
      (SELECT COUNT(DISTINCT curso_id) FROM ofertas) AS cursos,
      (SELECT COUNT(*) FROM ofertas) AS ofertas,
      (SELECT COUNT(DISTINCT a.profesor_id) FROM periodo_grado_curso_profesores a JOIN ofertas f ON f.id = a.periodo_grado_curso_id) AS profesores,
      (SELECT COUNT(DISTINCT CASE WHEN estado = 'activa' THEN alumno_id END) FROM inscripciones) AS alumnos_activos,
      (SELECT COUNT(*) FROM inscripciones) AS inscripciones,
      (SELECT COUNT(*) FROM horarios h WHERE h.periodo_academico_id = pa.id ${scheduleScope ? 'AND ' + scheduleScope.sql : ''}) AS horarios
    FROM periodos_academicos pa WHERE pa.id = ? ${teacher ? 'AND EXISTS (SELECT 1 FROM ofertas)' : ''}`,
      [id, ...(offerScope?.params || []), id, ...(scheduleScope?.params || []), id]);
    if (!rows.length) return sendError(res, 'Periodo no encontrado o fuera de sus asignaciones', 404);
    const {grados, cursos, ofertas, profesores, alumnos_activos, inscripciones, horarios, ...periodo} = rows[0];
    return sendSuccess(res, {periodo, resumen:{grados, cursos, ofertas, profesores, alumnos_activos, inscripciones, horarios}});
  } catch (error) {
    logError('Error al consultar detalle de periodo:', error);
    return sendError(res, 'No se pudo cargar el detalle del periodo');
  }
}
