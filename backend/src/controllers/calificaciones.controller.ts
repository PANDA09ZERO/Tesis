import { logError } from '../utils/logger';
import { rendimientoSourceSql } from '../utils/reporteAcademico';
import { positiveId, validDate, validGrade } from '../utils/academicValidation';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno, profesorTieneAccesoCurso, profesorTieneAccesoMatricula, profesorRegistroScope, validarRegistroProfesor } from '../utils/profesorAlcance';
import { getOfertaAccessible, lockOfertaForWrite } from '../utils/ofertaAcademica';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getCalificacionesByAlumno(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.alumno_id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))) return sendError(res, 'Alumno, curso o periodo inválido',400);
  try {
    const { alumno_id } = req.params;
    const periodoId = req.query.periodo_id as string;

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, parseInt(alumno_id), periodoId ? parseInt(periodoId) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'No tiene acceso a las calificaciones de este alumno', 403);
      }
    }

    let whereClause = 'WHERE c.alumno_id = ?';
    const params: any[] = [alumno_id];

    if (periodoId) {
      whereClause += ' AND c.periodo_academico_id = ?';
      params.push(periodoId);
    }
    if (req.user?.rol === 'profesor') {
      const scope = profesorRegistroScope('c', req.user.userId, 'nota', periodoId ? Number(periodoId) : 'activo');
      whereClause += ' AND ' + scope.sql; params.push(...scope.params);
    }

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, cu.nombre as curso_nombre, cu.codigo as curso_codigo,
              pa.nombre as periodo_nombre, ev.nota_maxima AS escala_maxima, ev.nombre AS evaluacion_nombre
       FROM calificaciones c LEFT JOIN evaluaciones ev ON ev.id=c.evaluacion_id
       JOIN cursos cu ON c.curso_id = cu.id
       JOIN periodos_academicos pa ON c.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY cu.nombre, c.fecha_evaluacion DESC`,
      params
    );

    const [resumen] = await pool.query<RowDataPacket[]>(`SELECT n.periodo_id,n.grado_id,n.curso_id,n.escala_maxima,
      CASE WHEN n.escala_maxima IS NULL THEN NULL ELSE ROUND(AVG(n.nota),2) END AS promedio_general,
      MIN(n.nota) AS nota_minima,MAX(n.nota) AS nota_maxima,COUNT(*) AS total_notas
      FROM (${rendimientoSourceSql} ${whereClause}) n GROUP BY n.periodo_id,n.grado_id,n.curso_id,n.escala_maxima`,params);
    return sendSuccess(res, {calificaciones, resumen:resumen.length===1?resumen[0]:{promedio_general:null,nota_minima:null,nota_maxima:null,mensaje:'Consulte los resúmenes separados por periodo, grado, curso y escala'}, resumen_por_escala:resumen});
  } catch (error) {
    return sendError(res, 'Error al obtener calificaciones');
  }
}

export async function getCalificacionesByCurso(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.curso_id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))) return sendError(res, 'Alumno, curso o periodo inválido',400);
  try {
    const { curso_id } = req.params;
    const periodoId = req.query.periodo_id as string;

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoCurso(pool, req.user.userId, parseInt(curso_id), periodoId ? parseInt(periodoId) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'No tiene acceso a este curso', 403);
      }
    }

    let whereClause = 'WHERE c.curso_id = ?';
    const params: any[] = [curso_id];

    if (periodoId) {
      whereClause += ' AND c.periodo_academico_id = ?';
      params.push(periodoId);
    }
    if (req.user?.rol === 'profesor') {
      const scope = profesorRegistroScope('c', req.user.userId, 'nota', periodoId ? Number(periodoId) : 'activo');
      whereClause += ' AND ' + scope.sql; params.push(...scope.params);
    }

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.nombre, u.apellido, a.codigo_alumno, ev.nota_maxima AS escala_maxima
       FROM calificaciones c LEFT JOIN evaluaciones ev ON ev.id=c.evaluacion_id
       JOIN alumnos a ON c.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre`,
      params
    );

    const [stats] = await pool.query<RowDataPacket[]>(`SELECT n.periodo_id,n.grado_id,n.escala_maxima,
      CASE WHEN n.escala_maxima IS NULL THEN NULL ELSE ROUND(AVG(n.nota),2) END AS promedio,
      NULL AS aprobados,NULL AS desaprobados,COUNT(*) AS total
      FROM (${rendimientoSourceSql} ${whereClause}) n GROUP BY n.periodo_id,n.grado_id,n.escala_maxima`,params);
    return sendSuccess(res, {calificaciones,estadisticas:stats.length===1?stats[0]:{promedio:null,aprobados:null,desaprobados:null,total:stats.reduce((sum,row)=>sum+Number(row.total),0)},estadisticas_por_escala:stats});
  } catch (error) {
    return sendError(res, 'Error al obtener calificaciones del curso');
  }
}

export async function getAlumnosByCurso(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.curso_id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))) return sendError(res, 'Curso o periodo inválido', 400);
  try {
    const curso_id = parseInt(req.params.curso_id);
    const periodoId = req.query.periodo_id as string;

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoCurso(pool, req.user.userId, curso_id, periodoId ? parseInt(periodoId) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'No tiene acceso a este curso', 403);
      }
    }

    const params: (string | number)[] = [curso_id];
    let periodoFilter = '';
    if (periodoId) {
      periodoFilter = ' AND m.periodo_academico_id = ?';
      params.push(parseInt(periodoId));
    } else {
      periodoFilter = ' AND pa.activo = 1';
    }
    const teacherFilter = req.user?.rol === 'profesor'
      ? `AND (
          EXISTS (
            SELECT 1 FROM periodo_grado_cursos pgc
            JOIN periodo_grado_curso_profesores pgcp ON pgcp.periodo_grado_curso_id = pgc.id
            JOIN profesores p ON p.id = pgcp.profesor_id
            WHERE pgc.periodo_academico_id = m.periodo_academico_id
              AND pgc.grado_id = COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id))
              AND pgc.curso_id = m.curso_id AND p.usuario_id = ?
          )
        )`
      : '';
    if (req.user?.rol === 'profesor') params.push(req.user.userId);

    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT a.id as alumno_id, a.codigo_alumno, u.nombre, u.apellido,
              g.nombre as grado, m.estado as estado_matricula
       FROM matriculas m
       JOIN alumnos a ON a.id = m.alumno_id
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN grados g ON g.id = COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id))
       LEFT JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
      WHERE m.curso_id = ? AND m.estado = 'activa'${periodoFilter} ${teacherFilter}
       ORDER BY u.apellido, u.nombre`,
      params
    );

    return sendSuccess(res, alumnos);
  } catch (error) {
    return sendError(res, 'Error al obtener alumnos del curso');
  }
}

function validLegacyGrade(item: any) {
  return item && [item.alumno_id, item.curso_id, item.periodo_academico_id].every(positiveId)
    && validGrade(item.nota)
    && (item.fecha_evaluacion === undefined || validDate(item.fecha_evaluacion))
    && (item.tipo_evaluacion === undefined || (typeof item.tipo_evaluacion === 'string' && Boolean(item.tipo_evaluacion.trim()) && item.tipo_evaluacion.length <= 50))
    && (item.observaciones === undefined || item.observaciones === null || typeof item.observaciones === 'string')
    && item.evaluacion_id === undefined && item.periodo_grado_curso_id === undefined;
}

async function validateGradeEnrollment(req: AuthRequest, item: any) {
  const date = item.fecha_evaluacion || new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'}).format(new Date());
  if (req.user?.rol === 'profesor') return validarRegistroProfesor(pool, req.user.userId, item.alumno_id, item.curso_id, item.periodo_academico_id, date);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') inicio, DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') fin
    FROM matriculas m JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
    WHERE m.alumno_id = ? AND m.curso_id = ? AND m.periodo_academico_id = ? AND m.estado = 'activa'`,
    [item.alumno_id, item.curso_id, item.periodo_academico_id]);
  if (!rows.length) return {status:403, message:'El alumno no tiene matrícula activa en el curso y periodo'};
  if (date < rows[0].inicio || date > rows[0].fin) return {status:400, message:'La fecha debe estar dentro del periodo académico'};
  return null;
}

export async function registerCalificacion(req: AuthRequest, res: Response) {
  if (!validLegacyGrade(req.body)) return sendError(res, 'Datos de calificación inválidos; las evaluaciones se registran desde su oferta', 400);
  try {
    const enrollmentError = await validateGradeEnrollment(req, req.body);
    if (enrollmentError) return sendError(res, enrollmentError.message, enrollmentError.status);
    const { alumno_id, curso_id, periodo_academico_id, nota, tipo_evaluacion, observaciones, fecha_evaluacion } = req.body;

    const [profesor] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM profesores WHERE usuario_id = ?',
      [req.user!.userId]
    );

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion, observaciones, registrado_por, fecha_evaluacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion || 'general', observaciones || null,
       profesor.length > 0 ? profesor[0].id : null, fecha_evaluacion || new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'}).format(new Date())]
    );

    return sendSuccess(res, { id: result.insertId }, 'Calificación registrada exitosamente', 201);
  } catch (error) {
    return sendError(res, 'Error al registrar calificación');
  }
}

export async function updateCalificacion(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Calificación inválida', 400);
  const { nota, tipo_evaluacion, observaciones } = req.body;
  if ((nota === undefined && tipo_evaluacion === undefined && observaciones === undefined)
    || (nota !== undefined && !validGrade(nota))
    || (tipo_evaluacion !== undefined && (typeof tipo_evaluacion !== 'string' || !tipo_evaluacion.trim() || tipo_evaluacion.length > 50))
    || (observaciones !== undefined && observaciones !== null && typeof observaciones !== 'string')) {
    return sendError(res, 'Datos de calificación inválidos', 400);
  }
  try {
    const [gradeRows] = await pool.query<RowDataPacket[]>(
      'SELECT alumno_id, curso_id, periodo_academico_id, periodo_grado_curso_id, evaluacion_id FROM calificaciones WHERE id = ?',
      [req.params.id]
    );
    const grade = gradeRows[0];
    if (!grade) return sendError(res, 'Calificación no encontrada', 404);
    if (req.user?.rol === 'profesor') {
      const writeError = await validarRegistroProfesor(pool, req.user.userId, grade.alumno_id, grade.curso_id, grade.periodo_academico_id);
      if (writeError) return sendError(res, writeError.message, writeError.status);
      if (grade.periodo_grado_curso_id) {
        const oferta = await getOfertaAccessible(grade.periodo_grado_curso_id, req.user.userId, req.user.rol);
        if (!oferta || oferta.curso_id !== grade.curso_id || oferta.periodo_academico_id !== grade.periodo_academico_id) {
          return sendError(res, 'Calificación no encontrada', 404);
        }
      }
    }
    if (grade.evaluacion_id) {
      const [evaluations] = await pool.query<RowDataPacket[]>(
        'SELECT estado, nota_maxima, tipo, periodo_grado_curso_id FROM evaluaciones WHERE id = ?', [grade.evaluacion_id]
      );
      const evaluation = evaluations[0];
      if (!evaluation || evaluation.estado !== 'activa') return sendError(res, 'La evaluación está cerrada', 409);
      if (evaluation.periodo_grado_curso_id !== grade.periodo_grado_curso_id) return sendError(res, 'La evaluación no corresponde a la oferta de la nota', 409);
      if (nota !== undefined && nota > Number(evaluation.nota_maxima)) return sendError(res, 'La nota supera el máximo de la evaluación', 400);
      if (tipo_evaluacion !== undefined && tipo_evaluacion !== evaluation.tipo) return sendError(res, 'El tipo corresponde a la evaluación vinculada', 400);
    }
    await pool.query(
      `UPDATE calificaciones SET nota = COALESCE(?, nota), tipo_evaluacion = COALESCE(?, tipo_evaluacion),
       observaciones = CASE WHEN ? THEN ? ELSE observaciones END WHERE id = ?`,
      [nota ?? null, tipo_evaluacion ?? null, observaciones !== undefined, observaciones ?? null, req.params.id]
    );
    return sendSuccess(res, null, 'Calificación actualizada exitosamente');
  } catch (error) {
    logError('Error al actualizar calificación:', error);
    return sendError(res, 'Error al actualizar calificación');
  }
}

export async function bulkRegisterCalificaciones(req: AuthRequest, res: Response) {
  try {
    const { calificaciones } = req.body;

    if (!Array.isArray(calificaciones) || calificaciones.length === 0 || calificaciones.length > 500) {
      return sendError(res, 'Array de calificaciones requerido', 400);
    }

    if (!calificaciones.every(validLegacyGrade)) return sendError(res, 'Datos de calificación inválidos; las evaluaciones se registran desde su oferta', 400);
    for (const c of calificaciones) {
      const error = await validateGradeEnrollment(req, c);
      if (error) return sendError(res, error.message, error.status);
    }

    const [profesor] = req.user?.rol === 'profesor'
      ? await pool.query<RowDataPacket[]>('SELECT id FROM profesores WHERE usuario_id = ?', [req.user.userId])
      : [[]];
    const values = calificaciones.map((c: any) => [
      c.alumno_id, c.curso_id, c.periodo_academico_id,
      c.nota, c.tipo_evaluacion || 'general', c.observaciones || null,
      c.fecha_evaluacion || new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'}).format(new Date()), profesor[0]?.id || null
    ]);

    await pool.query(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota,
       tipo_evaluacion, observaciones, fecha_evaluacion, registrado_por)
       VALUES ?`,
      [values]
    );

    return sendSuccess(res, null, `${calificaciones.length} calificaciones registradas`, 201);
  } catch (error) {
    return sendError(res, 'Error al registrar calificaciones masivamente');
  }
}

export async function getLibroCalificacionesOferta(req: AuthRequest, res: Response) {
  try {
    const oferta = await getOfertaAccessible(Number(req.params.ofertaId), req.user!.userId, req.user!.rol);
    if (!oferta) return sendError(res, 'Oferta académica no encontrada', 404);

    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT a.id AS alumno_id, a.codigo_alumno, u.nombre, u.apellido,
              COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) AS grado_id
       FROM matriculas m
       JOIN alumnos a ON a.id = m.alumno_id
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE m.periodo_academico_id = ? AND m.curso_id = ?
         AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = ? AND m.estado = 'activa'
       ORDER BY u.apellido, u.nombre`,
      [oferta.periodo_academico_id, oferta.curso_id, oferta.grado_id]
    );
    const [evaluaciones] = await pool.query<RowDataPacket[]>(
      `SELECT id, nombre, tipo, fecha_evaluacion, nota_maxima, estado
       FROM evaluaciones WHERE periodo_grado_curso_id = ?
       ORDER BY fecha_evaluacion, id`,
      [oferta.periodo_grado_curso_id]
    );
    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.alumno_id, c.nota, c.tipo_evaluacion, c.fecha_evaluacion,
              c.observaciones, c.evaluacion_id, ev.nombre AS evaluacion_nombre,
              u.nombre, u.apellido, a.codigo_alumno
       FROM calificaciones c
       JOIN alumnos a ON a.id = c.alumno_id
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN evaluaciones ev ON ev.id = c.evaluacion_id
       WHERE c.periodo_grado_curso_id = ?
          OR (c.periodo_grado_curso_id IS NULL AND c.evaluacion_id IS NULL
              AND c.curso_id = ? AND c.periodo_academico_id = ?
              AND EXISTS (
                SELECT 1 FROM matriculas m
                JOIN alumnos ma ON ma.id = m.alumno_id
                WHERE m.alumno_id = c.alumno_id AND m.curso_id = c.curso_id
                  AND m.periodo_academico_id = c.periodo_academico_id
                  AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = ? AND m.estado = 'activa'
              ))
       ORDER BY c.fecha_evaluacion, c.id`,
      [oferta.periodo_grado_curso_id, oferta.curso_id,
        oferta.periodo_academico_id, oferta.grado_id]
    );

    return sendSuccess(res, { alumnos, evaluaciones, calificaciones });
  } catch (error) {
    logError('Error al obtener libro de calificaciones:', error);
    return sendError(res, 'Error al obtener el libro de calificaciones');
  }
}

export async function bulkRegisterCalificacionesOferta(req: AuthRequest, res: Response) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;
  try {
    connection = await pool.getConnection();
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const oferta = await lockOfertaForWrite(connection, Number(req.params.ofertaId), req.user!.userId, req.user!.rol);
    if (!oferta) return sendError(res, 'Oferta académica no encontrada', 404);
    if (req.user?.rol === 'profesor' && !oferta.periodo_activo) return sendError(res, 'El periodo histórico es de solo consulta para profesores', 409);
    const [evaluaciones] = await connection.query<RowDataPacket[]>(
      `SELECT id, tipo, fecha_evaluacion, nota_maxima, estado
       FROM evaluaciones WHERE id = ? AND periodo_grado_curso_id = ? FOR UPDATE`,
      [req.params.evaluacionId, oferta.periodo_grado_curso_id]
    );
    const evaluacion = evaluaciones[0];
    if (!evaluacion) return sendError(res, 'Evaluación no encontrada', 404);
    if (evaluacion.estado !== 'activa') return sendError(res, 'La evaluación está cerrada', 409);

    const { calificaciones } = req.body;
    if (!Array.isArray(calificaciones) || calificaciones.length === 0 || calificaciones.length > 500) {
      return sendError(res, 'Debe enviar entre 1 y 500 calificaciones', 400);
    }
    if (calificaciones.some((item: any) => !item || !positiveId(item.alumno_id) || (item.observaciones != null && typeof item.observaciones !== 'string'))) return sendError(res, 'Alumno u observaciones inválidos', 400);
    const alumnoIds = calificaciones.map((item: any) => Number(item.alumno_id));
    if (alumnoIds.some((id: number) => !Number.isInteger(id) || id <= 0)
      || new Set(alumnoIds).size !== alumnoIds.length) {
      return sendError(res, 'La lista de alumnos no es válida o contiene duplicados', 400);
    }
    for (const item of calificaciones) {
      const nota = Number(item?.nota);
      if (!item || !validGrade(item.nota, true) || nota > Number(evaluacion.nota_maxima)) {
        return sendError(res, `Las notas deben estar entre 0 y ${evaluacion.nota_maxima}`, 400);
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
    for (const item of calificaciones) {
      await connection.query(
        `INSERT INTO calificaciones
          (alumno_id, curso_id, periodo_academico_id, periodo_grado_curso_id,
           evaluacion_id, nota, tipo_evaluacion, observaciones, registrado_por, fecha_evaluacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nota = VALUES(nota), observaciones = VALUES(observaciones),
           registrado_por = VALUES(registrado_por), fecha_evaluacion = VALUES(fecha_evaluacion)`,
        [item.alumno_id, oferta.curso_id, oferta.periodo_academico_id,
          oferta.periodo_grado_curso_id, evaluacion.id, Number(item.nota), evaluacion.tipo,
          item.observaciones || null, profesores[0]?.id || null, evaluacion.fecha_evaluacion]
      );
    }
    await connection.commit();
    return sendSuccess(res, { guardadas: calificaciones.length }, `${calificaciones.length} calificaciones guardadas`);
  } catch (error) {
    if (connection) await connection.rollback().catch(rollbackError => logError('Error al revertir el lote:',rollbackError));
    logError('Error al guardar calificaciones de la oferta:', error);
    return sendError(res, 'Error al guardar las calificaciones');
  } finally {
    if (connection) {
      await connection.rollback().catch(error => logError('Error al cerrar la transacción:', error));
      connection.release();
    }
  }
}
