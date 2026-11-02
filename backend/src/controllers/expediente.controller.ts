import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { positiveId } from '../utils/academicValidation';
import { obtenerMatriculasAlumno } from '../utils/matriculasAlumno';
import { rendimientoSourceSql, asistenciaSourceSql } from '../utils/reporteAcademico';
import { sendError, sendSuccess } from '../utils/response';
import { logError } from '../utils/logger';

/** Administrative dossier. All academic attribution uses the same sources as reports. */
export async function getExpedienteAlumno(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Alumno inválido', 400);
  const id = Number(req.params.id);
  try {
    const data = await getExpedienteData(id);
    if (!data) return sendError(res, 'Alumno no encontrado', 404);
    return sendSuccess(res, data);
  } catch (error) {
    logError('Error al obtener expediente:', error);
    return sendError(res, 'No se pudo cargar el expediente estudiantil');
  }
}

export async function getExpedienteData(id: number, db: Pick<typeof pool, 'query'> = pool) {
    const [students] = await db.query<RowDataPacket[]>(`SELECT a.id, a.codigo_alumno, a.estado,
      u.nombre, u.apellido, u.dni, u.email, u.telefono, u.direccion, u.fecha_nacimiento
      FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = ?`, [id]);
    if (!students.length) return null;
    const [matriculas, [calificaciones], [evaluaciones], [asistencia], [apoderados], [documentos]] = await Promise.all([
      obtenerMatriculasAlumno(id, undefined, undefined, false, db),
      db.query<RowDataPacket[]>(`SELECT r.id, r.curso_id, r.periodo_id, r.grado_id, r.evaluacion_id,
        r.nota, r.escala_maxima, r.fecha_evaluacion fecha, r.observaciones,
        cu.nombre curso, pa.nombre periodo, g.nombre grado, e.nombre evaluacion
        FROM (${rendimientoSourceSql}) r JOIN cursos cu ON cu.id = r.curso_id
        LEFT JOIN periodos_academicos pa ON pa.id = r.periodo_id LEFT JOIN grados g ON g.id = r.grado_id
        LEFT JOIN evaluaciones e ON e.id = r.evaluacion_id
        WHERE r.alumno_id = ? ORDER BY pa.fecha_inicio DESC, g.nombre, cu.nombre, r.fecha_evaluacion, r.id`, [id]),
      db.query<RowDataPacket[]>(`SELECT e.id, e.nombre, e.tipo, e.fecha_evaluacion fecha, e.nota_maxima, e.estado,
        o.curso_id, cu.nombre curso, o.periodo_academico_id periodo_id, pa.nombre periodo, o.grado_id, g.nombre grado
        FROM evaluaciones e JOIN periodo_grado_cursos o ON o.id = e.periodo_grado_curso_id
        JOIN cursos cu ON cu.id = o.curso_id JOIN grados g ON g.id = o.grado_id
        JOIN periodos_academicos pa ON pa.id = o.periodo_academico_id
        WHERE EXISTS (SELECT 1 FROM matriculas m LEFT JOIN cursos mc ON mc.id = m.curso_id
          WHERE m.alumno_id = ? AND m.curso_id = o.curso_id AND m.periodo_academico_id = o.periodo_academico_id
          AND COALESCE(m.grado_id, mc.grado_id) = o.grado_id)
        ORDER BY pa.fecha_inicio DESC, cu.nombre, e.fecha_evaluacion, e.id`, [id]),
      db.query<RowDataPacket[]>(`SELECT a.periodo_id, pa.nombre periodo, a.grado_id, g.nombre grado,
        a.estado, COUNT(*) total FROM (${asistenciaSourceSql}) a
        LEFT JOIN periodos_academicos pa ON pa.id = a.periodo_id LEFT JOIN grados g ON g.id = a.grado_id
        WHERE a.alumno_id = ? GROUP BY a.periodo_id, pa.nombre, a.grado_id, g.nombre, a.estado`, [id]),
      db.query<RowDataPacket[]>(`SELECT ap.id, u.nombre, u.apellido, u.email, u.telefono, aa.parentesco
        FROM apoderado_alumno aa JOIN apoderados ap ON ap.id = aa.apoderado_id
        JOIN usuarios u ON u.id = ap.usuario_id WHERE aa.alumno_id = ? ORDER BY u.apellido, u.nombre`, [id]),
      db.query<RowDataPacket[]>(`SELECT id, titulo, tipo_archivo, estado FROM documentos
        WHERE alumno_id = ? ORDER BY id DESC`, [id])
    ]);
    return { alumno: students[0], matriculas, calificaciones, evaluaciones, asistencia, apoderados, documentos };
}
