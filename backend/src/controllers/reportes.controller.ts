import { rendimientoSourceSql, asistenciaSourceSql } from '../utils/reporteAcademico';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';
import { positiveId, validDate } from '../utils/academicValidation';



export async function reporteRendimientoGeneral(req: Request, res: Response) {
  if (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id)) return sendError(res, 'Periodo inválido', 400);
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT n.periodo_id, p.nombre AS periodo, n.grado_id, g.nombre AS grado, n.curso_id, cu.nombre AS curso,
        n.escala_maxima, CASE WHEN n.escala_maxima IS NULL THEN NULL ELSE ROUND(AVG(n.nota),2) END AS promedio, MIN(n.nota) AS nota_minima, MAX(n.nota) AS nota_maxima,
        COUNT(*) AS total_notas, COUNT(DISTINCT n.alumno_id) AS total_alumnos,
        COUNT(DISTINCT n.evaluacion_id) AS total_evaluaciones,
        SUM(n.evaluacion_id IS NULL) AS notas_sin_evaluacion, NULL AS aprobados, NULL AS desaprobados
      FROM (
        ${rendimientoSourceSql}
      ) n LEFT JOIN periodos_academicos p ON p.id=n.periodo_id LEFT JOIN grados g ON g.id=n.grado_id LEFT JOIN cursos cu ON cu.id=n.curso_id
      ${req.query.periodo_id ? 'WHERE n.periodo_id = ?' : ''}
      GROUP BY n.periodo_id,p.nombre,n.grado_id,g.nombre,n.curso_id,cu.nombre,n.escala_maxima
      ORDER BY n.periodo_id,g.nombre,cu.nombre,n.escala_maxima`, req.query.periodo_id ? [req.query.periodo_id] : []);
    return sendSuccess(res,rows);
  } catch { return sendError(res, 'Error al generar reporte de rendimiento'); }
}

export async function reporteAsistencia(req: Request, res: Response) {
  const {periodo_id, grado_id, fecha_inicio, fecha_fin} = req.query;
  if ((periodo_id !== undefined && !positiveId(periodo_id)) || (grado_id !== undefined && !positiveId(grado_id)) || (fecha_inicio !== undefined && !validDate(fecha_inicio)) || (fecha_fin !== undefined && !validDate(fecha_fin)) || (typeof fecha_inicio === 'string' && typeof fecha_fin === 'string' && fecha_inicio > fecha_fin)) return sendError(res, 'Filtros de asistencia inválidos',400);
  const conditions: string[] = []; const params: unknown[] = [];
  for (const [field,value] of [['n.periodo_id',periodo_id],['n.grado_id',grado_id]]) if (value) { conditions.push(field+' = ?'); params.push(value); }
  if (fecha_inicio) { conditions.push('n.fecha >= ?'); params.push(fecha_inicio); }
  if (fecha_fin) { conditions.push('n.fecha <= ?'); params.push(fecha_fin); }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT n.alumno_id, u.nombre,u.apellido,al.codigo_alumno,n.periodo_id,p.nombre AS periodo,n.grado_id,g.nombre AS grado,
        COUNT(DISTINCT n.fecha) AS total_dias, COUNT(*) AS total_sesiones,
        SUM(n.estado='presente') AS presentes, SUM(n.estado='ausente') AS ausentes,
        SUM(n.estado='tardanza') AS tardanzas, SUM(n.estado='justificado') AS justificados,
        ROUND(SUM(n.estado='presente')*100.0/COUNT(*),2) AS porcentaje
      FROM (
        ${asistenciaSourceSql}
      ) n JOIN alumnos al ON al.id=n.alumno_id JOIN usuarios u ON u.id=al.usuario_id
      LEFT JOIN periodos_academicos p ON p.id=n.periodo_id LEFT JOIN grados g ON g.id=n.grado_id
      ${conditions.length ? 'WHERE '+conditions.join(' AND ') : ''}
      GROUP BY n.alumno_id,u.nombre,u.apellido,al.codigo_alumno,n.periodo_id,p.nombre,n.grado_id,g.nombre ORDER BY n.periodo_id,g.nombre,u.apellido`,params);
    return sendSuccess(res,rows);
  } catch { return sendError(res, 'Error al generar reporte de asistencia'); }
}

export async function reporteAlumnosEnRiesgo(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT u.nombre, u.apellido, a.codigo_alumno, (SELECT GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' / ', g.nombre) ORDER BY p.fecha_inicio SEPARATOR '; ') FROM matriculas m JOIN periodos_academicos p ON p.id=m.periodo_academico_id LEFT JOIN cursos cu ON cu.id=m.curso_id LEFT JOIN grados g ON g.id=COALESCE(m.grado_id,cu.grado_id) WHERE m.alumno_id=a.id AND m.estado='activa' AND p.activo=1) as grado,
              aa.tipo_riesgo, aa.nivel_riesgo, aa.indicadores, aa.descripcion,
              aa.recomendacion, aa.created_at as fecha_alerta
       FROM alertas_academicas aa
       JOIN alumnos a ON aa.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE aa.estado = 'activa'
       ORDER BY FIELD(aa.tipo_riesgo, 'alto', 'medio', 'bajo'), u.apellido`
    );

    return sendSuccess(res, alumnos);
  } catch (error) {
    return sendError(res, 'Error al generar reporte de alumnos en riesgo');
  }
}

export async function reporteDocumentos(req: Request, res: Response) {
  try {
    const [documentos] = await pool.query<RowDataPacket[]>(
      `SELECT d.titulo, d.categoria, d.estado, d.obligatorio, d.fecha_vencimiento,
              d.created_at as fecha_subida,
              CASE WHEN d.alumno_id IS NOT NULL THEN CONCAT(u.nombre, ' ', u.apellido) ELSE 'General' END as destino,
              CONCAT(us.nombre, ' ', us.apellido) as subido_por
       FROM documentos d
       LEFT JOIN alumnos a ON d.alumno_id = a.id
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       JOIN usuarios us ON d.usuario_subio = us.id
       ORDER BY d.created_at DESC`
    );

    return sendSuccess(res, documentos);
  } catch (error) {
    return sendError(res, 'Error al generar reporte de documentos');
  }
}
