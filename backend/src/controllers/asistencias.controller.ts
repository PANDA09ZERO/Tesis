import { positiveId } from '../utils/academicValidation';
import { asistenciaSourceSql } from '../utils/reporteAcademico';
import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno, profesorTieneAccesoCurso, profesorTieneAccesoMatricula, profesorRegistroScope, profesorMatriculaScope, validarRegistroProfesor } from '../utils/profesorAlcance';
import { getOfertaAccessible, lockOfertaForWrite } from '../utils/ofertaAcademica';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAsistenciasByAlumno(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.alumno_id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))
    || (req.query.curso_id !== undefined && !positiveId(req.query.curso_id))
    || (req.query.fecha_inicio !== undefined && !isValidDate(req.query.fecha_inicio as string))
    || (req.query.fecha_fin !== undefined && !isValidDate(req.query.fecha_fin as string))
    || (req.query.fecha_inicio && req.query.fecha_fin && String(req.query.fecha_inicio) > String(req.query.fecha_fin))) return sendError(res, 'Filtros de asistencia inválidos', 400);
  try {
    const { alumno_id } = req.params;
    const { fecha_inicio, fecha_fin, curso_id } = req.query;

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, parseInt(alumno_id), req.query.periodo_id ? Number(req.query.periodo_id) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'Alumno no encontrado', 404);
      }
    }

    let whereClause = 'WHERE a.alumno_id = ?';
    const params: any[] = [alumno_id];

    if (fecha_inicio) { whereClause += ' AND a.fecha >= ?'; params.push(fecha_inicio); }
    if (fecha_fin) { whereClause += ' AND a.fecha <= ?'; params.push(fecha_fin); }
    if (curso_id) { whereClause += ' AND a.curso_id = ?'; params.push(curso_id); }
    if (req.query.periodo_id) { whereClause += ' AND a.periodo_id = ?'; params.push(req.query.periodo_id); }
    if (req.user?.rol === 'profesor') {
      const scope = profesorRegistroScope('a', req.user.userId, 'asistencia', req.query.periodo_id ? Number(req.query.periodo_id) : 'activo');
      whereClause += ' AND ' + scope.sql; params.push(...scope.params);
    }

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, cu.nombre as curso_nombre
       FROM (${asistenciaSourceSql}) a
       LEFT JOIN cursos cu ON a.curso_id = cu.id
       ${whereClause}
       ORDER BY a.fecha DESC`,
      params
    );

    const [resumen] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_dias,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
        SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados,
        ROUND(SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as porcentaje_asistencia
       FROM (${asistenciaSourceSql}) a ${whereClause}`,
      params
    );

    return sendSuccess(res, { asistencias, resumen: resumen[0] });
  } catch (error) {
    return sendError(res, 'Error al obtener asistencias');
  }
}

export async function getAsistenciasByCurso(req: Request, res: Response) {
  if (!positiveId(req.params.curso_id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))
    || (req.query.fecha !== undefined && !isValidDate(req.query.fecha as string))) return sendError(res, 'Curso, periodo o fecha inválidos', 400);
  try {
    const { curso_id } = req.params;
    const authReq = req as AuthRequest;

    if (authReq.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoCurso(pool, authReq.user.userId, parseInt(curso_id), req.query.periodo_id ? Number(req.query.periodo_id) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'Curso no encontrado', 404);
      }
    }
    const fecha = req.query.fecha as string || new Date().toISOString().split('T')[0];
    const attendanceScope = authReq.user?.rol === 'profesor' ? profesorRegistroScope('a', authReq.user.userId, 'asistencia', req.query.periodo_id ? Number(req.query.periodo_id) : 'activo') : null;
    const teacherAttendanceFilter = attendanceScope ? 'AND ' + attendanceScope.sql : '';
    const teacherFilter = req.query.periodo_id ? 'AND a.periodo_id = ?' : '';
    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.nombre, u.apellido, a2.codigo_alumno
       FROM (${asistenciaSourceSql}) a
       JOIN alumnos a2 ON a.alumno_id = a2.id
       JOIN usuarios u ON a2.usuario_id = u.id
       WHERE a.curso_id = ? AND a.fecha = ? ${teacherAttendanceFilter} ${teacherFilter}
       ORDER BY u.apellido`,
      authReq.user?.rol === 'profesor'
        ? [curso_id, fecha, ...(attendanceScope?.params || []), ...(req.query.periodo_id ? [req.query.periodo_id] : [])]
        : [curso_id, fecha, ...(req.query.periodo_id ? [req.query.periodo_id] : [])]
    );

    return sendSuccess(res, asistencias);
  } catch (error) {
    return sendError(res, 'Error al obtener asistencias del curso');
  }
}

class AttendanceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function validAttendance(item: any) {
  if (!item || !positiveId(item.alumno_id) || !isValidDate(item.fecha)
    || (item.curso_id != null && !positiveId(item.curso_id))
    || (item.periodo_academico_id !== undefined && !positiveId(item.periodo_academico_id))
    || item.periodo_grado_curso_id !== undefined
    || !['presente','ausente','tardanza','justificado'].includes(item.estado)
    || (item.observaciones != null && typeof item.observaciones !== 'string')
    || (item.minutos_tardanza !== undefined && (typeof item.minutos_tardanza !== 'number' || !Number.isInteger(item.minutos_tardanza)))) return false;
  const minutes = item.minutos_tardanza ?? 0;
  return item.estado === 'tardanza' ? minutes >= 1 && minutes <= 120 : minutes === 0;
}

async function saveLegacyAttendance(req: AuthRequest, items: any[]) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;
  try {
    // A legacy request must not overwrite a different offer or create NULL-key duplicates.
    for (const item of items) {
      if (req.user?.rol === 'profesor') {
        const error = await validarRegistroProfesor(pool, req.user.userId, item.alumno_id, item.curso_id, item.periodo_academico_id, item.fecha);
        if (error) throw new AttendanceError(error.status, error.message);
      }
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    // All legacy calls coordinate on the pupil rows in the same order, including general attendance.
    for (const id of [...new Set(items.map(item => Number(item.alumno_id)))].sort((a,b) => a-b)) {
      const [pupils] = await connection.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ? FOR UPDATE', [id]);
      if (!pupils.length) throw new AttendanceError(404, 'Alumno no encontrado');
    }
    const [teachers] = await connection.query<RowDataPacket[]>('SELECT id FROM profesores WHERE usuario_id = ?', [req.user!.userId]);
    for (const item of items) {
      let offerId: number | null = null;
      if (item.curso_id != null) {
        const [offers] = await connection.query<RowDataPacket[]>(`SELECT pgc.id FROM matriculas m
          JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
          JOIN periodo_grado_cursos pgc ON pgc.periodo_academico_id = m.periodo_academico_id
            AND pgc.curso_id = m.curso_id AND pgc.grado_id = COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id))
          WHERE m.alumno_id = ? AND m.curso_id = ? AND m.estado = 'activa'
            AND ? BETWEEN pa.fecha_inicio AND pa.fecha_fin
            ${item.periodo_academico_id !== undefined ? 'AND pa.id = ?' : ''} FOR UPDATE`,
          [item.alumno_id, item.curso_id, item.fecha, ...(item.periodo_academico_id !== undefined ? [item.periodo_academico_id] : [])]);
        if (!offers.length) throw new AttendanceError(403, 'El alumno no tiene una oferta y matrícula activa para esa fecha');
        if (offers.length !== 1) throw new AttendanceError(409, 'La fecha corresponde a varios periodos; indique el periodo académico');
        offerId = offers[0].id;
      }
      const [existing] = await connection.query<RowDataPacket[]>(`SELECT id FROM asistencias
        WHERE alumno_id = ? AND fecha = ? AND curso_id <=> ? AND periodo_grado_curso_id <=> ? FOR UPDATE`,
        [item.alumno_id, item.fecha, item.curso_id ?? null, offerId]);
      if (existing.length > 1) throw new AttendanceError(409, 'Existen asistencias antiguas duplicadas que requieren revisión');
      if (existing.length) {
        await connection.query('UPDATE asistencias SET estado = ?, minutos_tardanza = ?, observaciones = ?, registrado_por = ? WHERE id = ?',
          [item.estado, item.minutos_tardanza ?? 0, item.observaciones ?? null, teachers[0]?.id ?? null, existing[0].id]);
      } else {
        await connection.query(`INSERT INTO asistencias (alumno_id, curso_id, periodo_grado_curso_id, fecha, estado, minutos_tardanza, observaciones, registrado_por)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE estado = VALUES(estado), minutos_tardanza = VALUES(minutos_tardanza),
          observaciones = VALUES(observaciones), registrado_por = VALUES(registrado_por)`,
          [item.alumno_id, item.curso_id ?? null, offerId, item.fecha, item.estado, item.minutos_tardanza ?? 0, item.observaciones ?? null, teachers[0]?.id ?? null]);
      }
    }
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(rollbackError => logError('Error al revertir asistencia:', rollbackError));
    throw error;
  } finally { connection?.release(); }
}

async function registerLegacyAttendance(req: AuthRequest, res: Response, bulk: boolean) {
  const items = bulk ? req.body.asistencias : [req.body];
  if (!Array.isArray(items) || !items.length || items.length > 500 || !items.every(validAttendance)) return sendError(res, 'Datos de asistencia inválidos', 400);
  const keys = items.map(item => `${Number(item.alumno_id)}:${item.curso_id == null ? '' : Number(item.curso_id)}:${item.periodo_academico_id ?? ''}:${item.fecha}`);
  if (new Set(keys).size !== keys.length) return sendError(res, 'La lista contiene asistencias duplicadas', 400);
  try {
    await saveLegacyAttendance(req, items);
    return sendSuccess(res, null, 'Asistencias guardadas', 201);
  } catch (error) {
    if (error instanceof AttendanceError) return sendError(res, error.message, error.status);
    logError('Error al guardar asistencias:', error);
    return sendError(res, 'No se pudieron guardar las asistencias');
  }
}

export async function registerAsistencia(req: AuthRequest, res: Response) {
  return registerLegacyAttendance(req, res, false);
}
export async function bulkRegisterAsistencias(req: AuthRequest, res: Response) {
  return registerLegacyAttendance(req, res, true);
}

export async function getResumenAsistenciaGrado(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorRegistroScope('attendance', req.user.userId, 'asistencia', 'activo') : null;
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT g.nombre AS grado,
      COUNT(DISTINCT attendance.alumno_id) AS total_alumnos,
      ROUND(AVG(attendance.estado = 'presente') * 100, 2) AS asistencia_promedio,
      SUM(attendance.estado = 'ausente') AS total_ausencias
      FROM (${asistenciaSourceSql}) attendance
      JOIN periodos_academicos pa ON pa.id = attendance.periodo_id AND pa.activo = 1
      JOIN grados g ON g.id = attendance.grado_id
      WHERE MONTH(attendance.fecha) = MONTH(CURDATE()) AND YEAR(attendance.fecha) = YEAR(CURDATE())
        ${scope ? 'AND ' + scope.sql : ''}
      GROUP BY g.id, g.nombre ORDER BY g.nombre`, scope?.params || []);
    return sendSuccess(res, rows);
  } catch (error) {
    logError('Error al obtener resumen de asistencia:', error);
    return sendError(res, 'Error al obtener resumen de asistencia');
  }
}

function isValidDate(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function getOfertaOr404(req: AuthRequest, res: Response) {
  const oferta = await getOfertaAccessible(
    Number(req.params.ofertaId),
    req.user!.userId,
    req.user!.rol
  );
  if (!oferta) sendError(res, 'Oferta académica no encontrada', 404);
  return oferta;
}

export async function getAsistenciasOferta(req: AuthRequest, res: Response) {
  try {
    const oferta = await getOfertaOr404(req, res);
    if (!oferta) return;
    const fecha = String(req.query.fecha || new Date().toISOString().slice(0, 10));
    if (!isValidDate(fecha) || fecha < oferta.fecha_inicio || fecha > oferta.fecha_fin) {
      return sendError(res, 'La fecha debe estar dentro del periodo de la oferta', 400);
    }

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.alumno_id, a.estado, a.minutos_tardanza, a.observaciones,
              DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
              a.registrado_por, u.nombre, u.apellido, al.codigo_alumno
       FROM asistencias a
       JOIN alumnos al ON al.id = a.alumno_id
       JOIN usuarios u ON u.id = al.usuario_id
       WHERE a.periodo_grado_curso_id = ? AND a.fecha = ?
       ORDER BY u.apellido, u.nombre`,
      [oferta.periodo_grado_curso_id, fecha]
    );
    return sendSuccess(res, { fecha, asistencias });
  } catch (error) {
    logError('Error al obtener asistencia de la oferta:', error);
    return sendError(res, 'Error al obtener asistencia de la oferta');
  }
}

export async function getHistorialAsistenciasOferta(req: AuthRequest, res: Response) {
  try {
    const oferta = await getOfertaOr404(req, res);
    if (!oferta) return;
    const fechaInicio = String(req.query.fecha_inicio || oferta.fecha_inicio);
    const fechaFin = String(req.query.fecha_fin || oferta.fecha_fin);
    if (!isValidDate(fechaInicio) || !isValidDate(fechaFin) || fechaInicio > fechaFin
      || fechaInicio < oferta.fecha_inicio || fechaFin > oferta.fecha_fin) {
      return sendError(res, 'El rango de fechas no es válido', 400);
    }

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.alumno_id, a.estado, a.minutos_tardanza, a.observaciones,
              DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
              u.nombre, u.apellido, al.codigo_alumno
       FROM asistencias a
       JOIN alumnos al ON al.id = a.alumno_id
       JOIN usuarios u ON u.id = al.usuario_id
       WHERE a.periodo_grado_curso_id = ? AND a.fecha BETWEEN ? AND ?
       ORDER BY a.fecha DESC, u.apellido, u.nombre`,
      [oferta.periodo_grado_curso_id, fechaInicio, fechaFin]
    );
    const summary = asistencias.reduce((result, item) => {
      result[item.estado] = (result[item.estado] || 0) + 1;
      return result;
    }, { presente: 0, ausente: 0, tardanza: 0, justificado: 0 } as Record<string, number>);
    return sendSuccess(res, { fecha_inicio: fechaInicio, fecha_fin: fechaFin, asistencias, resumen: summary });
  } catch (error) {
    logError('Error al obtener historial de asistencia:', error);
    return sendError(res, 'Error al obtener historial de asistencia');
  }
}

export async function bulkRegisterAsistenciasOferta(req: AuthRequest, res: Response) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;
  try {
    connection = await pool.getConnection();
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const oferta = await lockOfertaForWrite(connection, Number(req.params.ofertaId), req.user!.userId, req.user!.rol);
    if (!oferta) return sendError(res, 'Oferta académica no encontrada', 404);
    if (req.user?.rol === 'profesor' && !oferta.periodo_activo) return sendError(res, 'El periodo histórico es de solo consulta para profesores', 409);
    const { fecha, asistencias } = req.body;
    if (!isValidDate(fecha) || fecha < oferta.fecha_inicio || fecha > oferta.fecha_fin) {
      return sendError(res, 'La fecha debe estar dentro del periodo de la oferta', 400);
    }
    if (!Array.isArray(asistencias) || asistencias.length === 0 || asistencias.length > 500) {
      return sendError(res, 'Debe enviar entre 1 y 500 asistencias', 400);
    }

    if (asistencias.some((item: any) => !item || !positiveId(item.alumno_id) || (item.observaciones != null && typeof item.observaciones !== 'string'))) return sendError(res, 'Alumno u observaciones inválidos', 400);
    const alumnoIds = asistencias.map((item: any) => Number(item.alumno_id));
    if (alumnoIds.some((alumnoId: number) => !Number.isInteger(alumnoId) || alumnoId <= 0)
      || new Set(alumnoIds).size !== alumnoIds.length) {
      return sendError(res, 'La lista de alumnos no es válida o contiene duplicados', 400);
    }
    const validStates = new Set(['presente', 'ausente', 'tardanza', 'justificado']);
    for (const item of asistencias) {
      if (!validStates.has(item.estado)) return sendError(res, 'Estado de asistencia no válido', 400);
      if (item.minutos_tardanza !== undefined && (typeof item.minutos_tardanza !== 'number' || !Number.isInteger(item.minutos_tardanza))) return sendError(res, 'Minutos de tardanza inválidos', 400);
      const minutes = item.minutos_tardanza ?? 0;
      if (item.estado === 'tardanza' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 120)) {
        return sendError(res, 'Los minutos de tardanza deben estar entre 1 y 120', 400);
      }
      if (item.estado !== 'tardanza' && minutes !== 0) {
        return sendError(res, 'Solo la tardanza admite minutos', 400);
      }
    }

    const placeholders = alumnoIds.map(() => '?').join(',');
    const [roster] = await connection.query<RowDataPacket[]>(
      `SELECT m.alumno_id
       FROM matriculas m
       JOIN alumnos a ON a.id = m.alumno_id
       WHERE m.periodo_academico_id = ? AND m.curso_id = ?
         AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = ? AND m.estado = 'activa'
         AND m.alumno_id IN (${placeholders})
       FOR UPDATE`,
      [oferta.periodo_academico_id, oferta.curso_id, oferta.grado_id, ...alumnoIds]
    );
    if (roster.length !== alumnoIds.length) {
      await connection.rollback();
      return sendError(res, 'Uno o más alumnos no pertenecen activamente a esta oferta', 403);
    }

    const [profesores] = req.user?.rol === 'profesor'
      ? await connection.query<RowDataPacket[]>('SELECT id FROM profesores WHERE usuario_id = ?', [req.user.userId])
      : [[]];
    for (const item of asistencias) {
      await connection.query(
        `INSERT INTO asistencias
          (alumno_id, curso_id, periodo_grado_curso_id, fecha, estado, minutos_tardanza, observaciones, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado),
           minutos_tardanza = VALUES(minutos_tardanza), observaciones = VALUES(observaciones),
           registrado_por = VALUES(registrado_por)`,
        [item.alumno_id, oferta.curso_id, oferta.periodo_grado_curso_id, fecha,
          item.estado, item.estado === 'tardanza' ? Number(item.minutos_tardanza) : 0,
          item.observaciones || null, profesores[0]?.id || null]
      );
    }
    await connection.commit();
    return sendSuccess(res, { guardadas: asistencias.length }, `${asistencias.length} asistencias guardadas`);
  } catch (error) {
    if (connection) await connection.rollback().catch(rollbackError => logError('Error al revertir el lote:',rollbackError));
    logError('Error al guardar asistencia de la oferta:', error);
    return sendError(res, 'Error al guardar asistencia de la oferta');
  } finally {
    if (connection) {
      await connection.rollback().catch(error => logError('Error al cerrar la transacción:', error));
      connection.release();
    }
  }
}
