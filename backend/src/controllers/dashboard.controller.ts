import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM alumnos WHERE estado = 'matriculado'"
    );
    const [profesores] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM profesores'
    );
    const [cursos] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM cursos'
    );
    const [alertas] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM alertas_academicas WHERE estado = 'activa'"
    );
    const [docsPendientes] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM documentos WHERE obligatorio = 1 AND estado = 'pendiente'"
    );
    const [asistencia] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
       ) as promedio
       FROM asistencias
       WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())`
    );

    return sendSuccess(res, {
      totalAlumnos: alumnos[0].total,
      totalProfesores: profesores[0].total,
      totalCursos: cursos[0].total,
      alertasActivas: alertas[0].total,
      documentosPendientes: docsPendientes[0].total,
      asistenciaPromedio: asistencia[0].promedio || 0
    });
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas del dashboard');
  }
}

export async function getRendimientoPorGrado(req: Request, res: Response) {
  try {
    const [rendimiento] = await pool.query<RowDataPacket[]>(
      `SELECT g.nombre as grado, s.nombre as seccion,
              ROUND(AVG(c.nota), 2) as promedio_nota,
              COUNT(DISTINCT c.alumno_id) as total_alumnos
       FROM calificaciones c
       JOIN alumnos a ON c.alumno_id = a.id
       JOIN grados g ON a.grado_id = g.id
       JOIN secciones s ON a.seccion_id = s.id
       WHERE c.periodo_academico_id = (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1)
       GROUP BY g.nombre, s.nombre
       ORDER BY g.nombre, s.nombre`
    );

    return sendSuccess(res, rendimiento);
  } catch (error) {
    return sendError(res, 'Error al obtener rendimiento por grado');
  }
}

export async function getAsistenciaReciente(req: Request, res: Response) {
  try {
    const [asistencia] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(fecha) as fecha,
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas
       FROM asistencias
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(fecha)
       ORDER BY fecha DESC
       LIMIT 30`
    );

    return sendSuccess(res, asistencia);
  } catch (error) {
    return sendError(res, 'Error al obtener asistencia reciente');
  }
}

export async function getActividadReciente(req: Request, res: Response) {
  try {
    const [actividades] = await pool.query<RowDataPacket[]>(
      `SELECT ra.*, u.nombre, u.apellido
       FROM registro_actividades ra
       LEFT JOIN usuarios u ON ra.usuario_id = u.id
       ORDER BY ra.created_at DESC
       LIMIT 20`
    );

    return sendSuccess(res, actividades);
  } catch (error) {
    return sendError(res, 'Error al obtener actividad reciente');
  }
}
