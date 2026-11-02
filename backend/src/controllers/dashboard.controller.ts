import { rendimientoSourceSql } from '../utils/reporteAcademico';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket } from 'mysql2';
import { AuthRequest } from '../types';
import { profesorAlumnoScope, profesorCursoScope, profesorRegistroScope } from '../utils/profesorAlcance';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    if (req.user?.rol === 'profesor') {
      const userId = req.user.userId;
      const studentScope = profesorAlumnoScope('a', userId);
      const teacherStudentFilter = studentScope.sql;
      const courseScope = profesorCursoScope({cursoAlias:'cu',gradoAlias:'g',periodoAlias:'pa',userIdParam:userId});
      const attendanceScope = profesorRegistroScope('x', userId, 'asistencia', 'activo');
      const [alumnos] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM alumnos a
         WHERE a.estado = 'matriculado' AND ${teacherStudentFilter}`,
        studentScope.params
      );
      const [apoderados] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT ap.id) as total
         FROM apoderado_alumno aa
         JOIN apoderados ap ON ap.id = aa.apoderado_id
         JOIN alumnos a ON a.id = aa.alumno_id
         WHERE ${teacherStudentFilter}`,
        studentScope.params
      );
      const [cursos] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total
        FROM periodo_grado_cursos pgc JOIN cursos cu ON cu.id = pgc.curso_id
        JOIN grados g ON g.id = pgc.grado_id JOIN periodos_academicos pa ON pa.id = pgc.periodo_academico_id
        WHERE pa.activo = 1 AND ${courseScope.sql}`, courseScope.params);
      const [alertas] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM alertas_academicas aa
         JOIN alumnos a ON a.id = aa.alumno_id
         WHERE aa.estado = 'activa' AND ${teacherStudentFilter}`,
        studentScope.params
      );
      const [docsPendientes] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM documentos d
         JOIN profesores p ON p.usuario_id = ?
         WHERE d.estado = 'pendiente' AND (d.profesor_id = p.id OR d.usuario_subio = p.usuario_id)`,
        [userId]
      );
      const [asistencia] = await pool.query<RowDataPacket[]>(`SELECT
        ROUND(SUM(x.estado = 'presente') * 100.0 / COUNT(*), 2) promedio
        FROM asistencias x WHERE MONTH(x.fecha) = MONTH(CURDATE()) AND YEAR(x.fecha) = YEAR(CURDATE())
          AND ${attendanceScope.sql}`, attendanceScope.params);

      const [activePeriods] = await pool.query<RowDataPacket[]>('SELECT id, nombre FROM periodos_academicos WHERE activo = 1 ORDER BY id LIMIT 1');
      return sendSuccess(res, {
        periodo_academico_id: activePeriods[0]?.id || null,
        periodo_nombre: activePeriods[0]?.nombre || null,
        totalAlumnos: alumnos[0].total,
        totalApoderados: apoderados[0].total,
        totalProfesores: 0,
        totalCursos: cursos[0].total,
        alertasActivas: alertas[0].total,
        documentosPendientes: docsPendientes[0].total,
        asistenciaPromedio: asistencia[0].promedio || 0
      });
    }

    const [alumnos] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM alumnos WHERE estado = 'matriculado'"
    );
    const [profesores] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM profesores'
    );
    const [apoderados] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM apoderados'
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
      totalApoderados: apoderados[0].total,
      totalCursos: cursos[0].total,
      alertasActivas: alertas[0].total,
      documentosPendientes: docsPendientes[0].total,
      asistenciaPromedio: asistencia[0].promedio || 0
    });
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas del dashboard');
  }
}

export async function getRendimientoPorGrado(req: AuthRequest, res: Response) {
  try {
    const periodoId = req.query.periodo_id === undefined || req.query.periodo_id === '' ? undefined : Number(req.query.periodo_id);
    if (periodoId !== undefined && (!Number.isSafeInteger(periodoId) || periodoId <= 0)) return sendError(res, 'Periodo inválido', 400);
    const scope = req.user?.rol === 'profesor' ? profesorRegistroScope('c',req.user.userId,'nota',periodoId ?? 'activo') : null;
    const source = scope ? rendimientoSourceSql + ' WHERE ' + scope.sql : rendimientoSourceSql;
    const periodoFiltro = periodoId ? 'pa.id = ?' : 'pa.activo = 1';
    const periodoParams = periodoId ? [periodoId] : [];
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT n.periodo_id,pa.nombre AS periodo,n.grado_id,g.nombre AS grado,
      n.escala_maxima,CASE WHEN n.escala_maxima IS NULL THEN NULL ELSE ROUND(AVG(n.nota),2) END AS promedio_nota,COUNT(DISTINCT n.alumno_id) AS total_alumnos
      FROM (${source}) n JOIN periodos_academicos pa ON pa.id=n.periodo_id AND ${periodoFiltro}
      LEFT JOIN grados g ON g.id=n.grado_id
      GROUP BY n.periodo_id,pa.nombre,n.grado_id,g.nombre,n.escala_maxima ORDER BY g.nombre,n.escala_maxima`, [...(scope?.params || []), ...periodoParams]);
    return sendSuccess(res,rows);
  } catch (error) {
    return sendError(res, 'Error al obtener rendimiento por grado');
  }
}

export async function getAsistenciaReciente(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorRegistroScope('x', req.user.userId, 'asistencia', 'activo') : null;
    const teacherFilter = scope ? 'AND ' + scope.sql : '';
    const params = scope?.params || [];
    const [asistencia] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(x.fecha) as fecha,
        COUNT(*) as total,
        SUM(CASE WHEN x.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN x.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN x.estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas
       FROM asistencias x
       JOIN alumnos a ON a.id = x.alumno_id
       WHERE x.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ${teacherFilter}
       GROUP BY DATE(x.fecha)
       ORDER BY DATE(x.fecha) DESC
      LIMIT 30`,
          params
    );

    return sendSuccess(res, asistencia);
  } catch (error) {
    return sendError(res, 'Error al obtener asistencia reciente');
  }
}

export async function getActividadReciente(req: AuthRequest, res: Response) {
  try {
    let whereClause = '';
    const params: any[] = [];
    
    if (req.user?.rol === 'profesor') {
      whereClause = 'WHERE ra.usuario_id = ?';
      params.push(req.user.userId);
    } else if (req.user?.rol === 'administrador') {
      // Admin normal: no mostrar logs de login, sesión, suspender, reactivar, supercuenta
      whereClause = 'WHERE ra.accion NOT LIKE "%login%" AND ra.accion NOT LIKE "%sesión%" AND ra.accion NOT LIKE "%suspender%" AND ra.accion NOT LIKE "%reactivar%" AND ra.accion NOT LIKE "%sistema%" AND ra.accion NOT LIKE "%supercuenta%"';
    }
    // Nota: superadministrador no está en DB, pero si existiera mostraría todo (sin filtro)

    const [actividades] = await pool.query<RowDataPacket[]>(
      `SELECT ra.*, u.nombre, u.apellido
       FROM registro_actividades ra
       LEFT JOIN usuarios u ON ra.usuario_id = u.id
       ${whereClause}
       ORDER BY ra.created_at DESC
       LIMIT 20`,
      params
    );

    return sendSuccess(res, actividades);
  } catch (error) {
    return sendError(res, 'Error al obtener actividad reciente');
  }
}
