import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

export async function reporteRendimientoGeneral(req: Request, res: Response) {
  try {
    const periodoId = req.query.periodo_id as string;

    let whereClause = '';
    const params: any[] = [];
    if (periodoId) { whereClause = 'WHERE c.periodo_academico_id = ?'; params.push(periodoId); }

    const [reporte] = await pool.query<RowDataPacket[]>(
      `SELECT g.nombre as grado, s.nombre as seccion, cu.nombre as curso,
              ROUND(AVG(c.nota), 2) as promedio,
              MIN(c.nota) as nota_minima,
              MAX(c.nota) as nota_maxima,
              SUM(CASE WHEN c.nota >= 11 THEN 1 ELSE 0 END) as aprobados,
              SUM(CASE WHEN c.nota < 11 THEN 1 ELSE 0 END) as desaprobados,
              COUNT(*) as total_evaluaciones
       FROM calificaciones c
       JOIN cursos cu ON c.curso_id = cu.id
       JOIN alumnos a ON c.alumno_id = a.id
       JOIN grados g ON a.grado_id = g.id
       JOIN secciones s ON a.seccion_id = s.id
       ${whereClause}
       GROUP BY g.nombre, s.nombre, cu.nombre
       ORDER BY g.nombre, s.nombre, cu.nombre`,
      params
    );

    return sendSuccess(res, reporte);
  } catch (error) {
    return sendError(res, 'Error al generar reporte de rendimiento');
  }
}

export async function reporteAsistencia(req: Request, res: Response) {
  try {
    const { fecha_inicio, fecha_fin, grado_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (fecha_inicio) { whereClause += ' AND a.fecha >= ?'; params.push(fecha_inicio); }
    if (fecha_fin) { whereClause += ' AND a.fecha <= ?'; params.push(fecha_fin); }
    if (grado_id) { whereClause += ' AND al.grado_id = ?'; params.push(grado_id); }

    const [reporte] = await pool.query<RowDataPacket[]>(
      `SELECT u.nombre, u.apellido, al.codigo_alumno, g.nombre as grado, s.nombre as seccion,
        COUNT(*) as total_dias,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
        ROUND(SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as porcentaje
       FROM asistencias a
       JOIN alumnos al ON a.alumno_id = al.id
       JOIN usuarios u ON al.usuario_id = u.id
       JOIN grados g ON al.grado_id = g.id
       JOIN secciones s ON al.seccion_id = s.id
       ${whereClause}
       GROUP BY u.nombre, u.apellido, al.codigo_alumno, g.nombre, s.nombre
       ORDER BY g.nombre, s.nombre, u.apellido`,
      params
    );

    return sendSuccess(res, reporte);
  } catch (error) {
    return sendError(res, 'Error al generar reporte de asistencia');
  }
}

export async function reporteAlumnosEnRiesgo(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT u.nombre, u.apellido, a.codigo_alumno, g.nombre as grado, s.nombre as seccion,
              aa.tipo_riesgo, aa.nivel_riesgo, aa.indicadores, aa.descripcion,
              aa.recomendacion, aa.created_at as fecha_alerta
       FROM alertas_academicas aa
       JOIN alumnos a ON aa.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN grados g ON a.grado_id = g.id
       JOIN secciones s ON a.seccion_id = s.id
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
