import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../types';

export async function getAllNotificaciones(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const { usuario_id, tipo, leida } = req.query;
    const authRequest = req as any;
    const currentUserId = authRequest.user?.userId;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Si no es admin, solo ver sus propias notificaciones
    if (authRequest.user?.rol !== 'administrador') {
      whereClause += ' AND n.usuario_id = ?';
      params.push(currentUserId);
    } else if (usuario_id) {
      whereClause += ' AND n.usuario_id = ?';
      params.push(usuario_id);
    }

    if (req.query.search) { whereClause += ' AND (n.titulo LIKE ? OR n.mensaje LIKE ?)'; params.push(`%${req.query.search}%`,`%${req.query.search}%`); }
    if (tipo) { whereClause += ' AND n.tipo = ?'; params.push(tipo); }
    if (leida !== undefined) { whereClause += ' AND n.leida = ?'; params.push(leida === 'true' ? 1 : 0); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notificaciones n ${whereClause}`,
      params
    );

    const [notificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM notificaciones n
       LEFT JOIN usuarios u ON n.usuario_id = u.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, notificaciones, countResult[0].total, page, limit);
  } catch (error) {
    logError('Error al obtener notificaciones:', error);
    return sendError(res, 'Error al obtener notificaciones');
  }
}

export async function getNotificacionById(req: AuthRequest, res: Response) {
  try {
    const [notificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM notificaciones n
       LEFT JOIN usuarios u ON n.usuario_id = u.id
       WHERE n.id = ? ${req.user && req.user.rol !== 'administrador' ? 'AND n.usuario_id = ?' : ''}`,
      [req.params.id, ...(req.user && req.user.rol !== 'administrador' ? [req.user.userId] : [])]
    );

    if (notificaciones.length === 0) {
      return sendError(res, 'Notificación no encontrada', 404);
    }

    return sendSuccess(res, notificaciones[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener notificación');
  }
}

export async function createNotificacion(req: Request, res: Response) {
  try {
    const { titulo, mensaje, tipo, usuario_id, link, prioridad } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, usuario_id, link, prioridad, leida)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [titulo, mensaje, tipo || 'info', usuario_id || null, link || null, prioridad || 'normal']
    );

    return sendSuccess(res, { id: result.insertId }, 'Notificación creada exitosamente', 201);
  } catch (error) {
    logError('Error al crear notificación:', error);
    return sendError(res, 'Error al crear notificación');
  }
}

export async function marcarLeida(req: AuthRequest, res: Response) {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE notificaciones SET leida = 1, fecha_leida = NOW() WHERE id = ? ${req.user && req.user.rol !== 'administrador' ? 'AND usuario_id = ?' : ''}`,
      [req.params.id, ...(req.user && req.user.rol !== 'administrador' ? [req.user.userId] : [])]
    );
    if (!result.affectedRows) return sendError(res, 'Notificación no encontrada', 404);

    return sendSuccess(res, null, 'Notificación marcada como leída');
  } catch (error) {
    return sendError(res, 'Error al marcar notificación como leída');
  }
}

export async function marcarTodasLeidas(req: Request, res: Response) {
  try {
    const authRequest = req as any;
    const currentUserId = authRequest.user?.userId;

    await pool.query(
      'UPDATE notificaciones SET leida = 1, fecha_leida = NOW() WHERE usuario_id = ? AND leida = 0',
      [currentUserId]
    );

    return sendSuccess(res, null, 'Todas las notificaciones marcadas como leídas');
  } catch (error) {
    return sendError(res, 'Error al marcar notificaciones como leídas');
  }
}

export async function deleteNotificacion(req: AuthRequest, res: Response) {
  try {
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM notificaciones WHERE id = ? ${req.user && req.user.rol !== 'administrador' ? 'AND usuario_id = ?' : ''}`, [req.params.id, ...(req.user && req.user.rol !== 'administrador' ? [req.user.userId] : [])]);
    if (!result.affectedRows) return sendError(res, 'Notificación no encontrada', 404);
    return sendSuccess(res, null, 'Notificación eliminada');
  } catch (error) {
    return sendError(res, 'Error al eliminar notificación');
  }
}

export async function getNotificacionesNoLeidas(req: Request, res: Response) {
  try {
    const authRequest = req as any;
    const currentUserId = authRequest.user?.userId;

    const [notificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notificaciones 
       WHERE usuario_id = ? AND leida = 0`,
      [currentUserId]
    );

    const [recientes] = await pool.query<RowDataPacket[]>(
      `SELECT id, titulo, mensaje, tipo, prioridad, link, created_at
       FROM notificaciones 
       WHERE usuario_id = ? AND leida = 0
       ORDER BY created_at DESC
       LIMIT 5`,
      [currentUserId]
    );

    return sendSuccess(res, {
      total: notificaciones[0].total,
      recientes
    });
  } catch (error) {
    return sendError(res, 'Error al obtener notificaciones no leídas');
  }
}

export async function enviarNotificacionMasiva(req: Request, res: Response) {
  try {
    const { titulo, mensaje, tipo, rol_ids, link, prioridad } = req.body;

    if (!rol_ids || !Array.isArray(rol_ids) || rol_ids.length === 0) {
      return sendError(res, 'Debe especificar al menos un rol', 400);
    }

    // Obtener usuarios de los roles especificados
    const usuariosParams = rol_ids.map(() => '?').join(',');
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE rol_id IN (${usuariosParams})`,
      rol_ids
    );

    if (usuarios.length === 0) {
      return sendError(res, 'No se encontraron usuarios para los roles especificados', 404);
    }

    // Crear notificaciones para cada usuario
    const values = usuarios.map(u => [titulo, mensaje, tipo || 'info', u.id, link || null, prioridad || 'normal']);
    
    await pool.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, usuario_id, link, prioridad, leida)
       VALUES ?`,
      [values]
    );

    return sendSuccess(res, { total: usuarios.length }, `Notificación enviada a ${usuarios.length} usuarios`, 201);
  } catch (error) {
    logError('Error al enviar notificación masiva:', error);
    return sendError(res, 'Error al enviar notificación masiva');
  }
}