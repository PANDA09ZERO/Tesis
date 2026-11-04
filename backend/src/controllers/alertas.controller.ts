import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno, profesorAlumnoScope } from '../utils/profesorAlcance';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { positiveId } from '../utils/academicValidation';

const ESTADOS_ALERTA = ['activa', 'atendida', 'resuelta', 'expirada'];
const RIESGOS = ['bajo', 'medio', 'alto'];

export async function getAllAlertas(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    // Corrección: el filtro "Todas" del frontend envía estado='' y antes se convertía en 'activa'.
    // Ahora: sin parámetro => 'activa' (comportamiento por defecto); '' => todos los estados.
    const estado = req.query.estado === undefined ? 'activa' : req.query.estado;
    const tipoRiesgo = req.query.tipo_riesgo;
    // Validación: filtros restringidos a los valores del ENUM.
    if (typeof estado !== 'string' || (estado !== '' && !ESTADOS_ALERTA.includes(estado))) return sendError(res, 'Estado de alerta inválido', 400);
    if (tipoRiesgo !== undefined && tipoRiesgo !== '' && (typeof tipoRiesgo !== 'string' || !RIESGOS.includes(tipoRiesgo))) return sendError(res, 'Tipo de riesgo inválido', 400);

    let whereClause = estado ? 'WHERE aa.estado = ?' : 'WHERE 1=1';
    const params: any[] = estado ? [estado] : [];

    if (req.user?.rol === 'profesor') {
      const scope = profesorAlumnoScope('a_scope', req.user.userId);
      whereClause += ' AND EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = aa.alumno_id AND ' + scope.sql + ')';
      params.push(...scope.params);
    }

    if (req.user?.rol === 'alumno') { whereClause += ' AND aa.alumno_id = (SELECT id FROM alumnos WHERE usuario_id = ?)';params.push(req.user.userId); }
    if (typeof tipoRiesgo === 'string' && tipoRiesgo) { whereClause += ' AND aa.tipo_riesgo = ?'; params.push(tipoRiesgo); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM alertas_academicas aa ${whereClause}`, params
    );

    const [alertas] = await pool.query<RowDataPacket[]>(
      `SELECT aa.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido,
              a.codigo_alumno, g.nombre as grado,
              ua.nombre as asignada_nombre, ua.apellido as asignada_apellido
       FROM alertas_academicas aa
       JOIN alumnos a ON aa.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN usuarios ua ON aa.asignada_a = ua.id
       ${whereClause}
       ORDER BY FIELD(aa.tipo_riesgo, 'alto', 'medio', 'bajo'), aa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, alertas, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener alertas');
  }
}

export async function updateAlertaEstado(req: AuthRequest, res: Response) {
  try {
    const { estado } = req.body;
    if (!positiveId(req.params.id)) return sendError(res, 'Alerta inválida', 400);
    if (!ESTADOS_ALERTA.includes(estado)) return sendError(res, 'Estado de alerta inválido', 400);

    // Primero obtener el alumno_id de la alerta
    const [alerta] = await pool.query<RowDataPacket[]>(
      'SELECT alumno_id FROM alertas_academicas WHERE id = ?',
      [req.params.id]
    );

    if (alerta.length === 0) {
      return sendError(res, 'Alerta no encontrada', 404);
    }

    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, alerta[0].alumno_id);
      if (!tieneAcceso) {
        return sendError(res, 'Alerta no encontrada', 404);
      }
    }

    await pool.query(
      'UPDATE alertas_academicas SET estado = ? WHERE id = ?',
      [estado, req.params.id]
    );

    return sendSuccess(res, null, 'Alerta actualizada');
  } catch (error) {
    return sendError(res, 'Error al actualizar alerta');
  }
}

export async function asignarAlerta(req: Request, res: Response) {
  try {
    const { asignada_a } = req.body;
    // Corrección: antes no se validaba nada y se respondía éxito aunque la alerta no existiera.
    if (!positiveId(req.params.id)) return sendError(res, 'Alerta inválida', 400);
    if (asignada_a !== null && !positiveId(asignada_a)) return sendError(res, 'Responsable inválido', 400);
    if (asignada_a !== null) {
      const [responsable] = await pool.query<RowDataPacket[]>(
        `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.id = ? AND u.activo = 1 AND r.nombre IN ('administrador', 'profesor')`,
        [Number(asignada_a)]
      );
      if (!responsable.length) return sendError(res, 'El responsable debe ser un administrador o profesor activo', 400);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE alertas_academicas SET asignada_a = ? WHERE id = ?',
      [asignada_a === null ? null : Number(asignada_a), Number(req.params.id)]
    );
    if (!result.affectedRows) return sendError(res, 'Alerta no encontrada', 404);

    return sendSuccess(res, null, 'Alerta asignada');
  } catch (error) {
    return sendError(res, 'Error al asignar alerta');
  }
}

export async function getAlertasEstadisticas(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorAlumnoScope('a_scope', req.user.userId) : null;
    const teacherFilter = req.user?.rol === 'alumno' ? 'WHERE alumno_id = (SELECT id FROM alumnos WHERE usuario_id = ?)' : scope ? 'WHERE EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = alertas_academicas.alumno_id AND ' + scope.sql + ')' : '';
    const params = req.user?.rol === 'alumno' ? [req.user.userId] : scope?.params || [];
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'activa' THEN 1 ELSE 0 END) as activas,
        SUM(CASE WHEN tipo_riesgo = 'alto' AND estado = 'activa' THEN 1 ELSE 0 END) as alto_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'medio' AND estado = 'activa' THEN 1 ELSE 0 END) as medio_riesgo,
        SUM(CASE WHEN tipo_riesgo = 'bajo' AND estado = 'activa' THEN 1 ELSE 0 END) as bajo_riesgo
      FROM alertas_academicas
      ${teacherFilter}`,
          params
    );

    return sendSuccess(res, stats[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas de alertas');
  }
}
