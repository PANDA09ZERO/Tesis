import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../types';
import { positiveId } from '../utils/academicValidation';
import { seccionesPendientes } from '../utils/avisos';

const TIPOS_NOTIFICACION = ['info', 'warning', 'success', 'error', 'alerta'];
const PRIORIDADES = ['baja', 'normal', 'alta', 'urgente'];

// Seguridad: valida el contenido antes de guardarlo. El enlace solo puede ser una ruta
// interna ("/...") o una URL http(s); se bloquean "javascript:", "data:" y similares (XSS almacenado).
function validarContenidoNotificacion(body: any): { titulo: string; mensaje: string; tipo: string; prioridad: string; link: string | null } | string {
  const titulo = typeof body?.titulo === 'string' ? body.titulo.trim() : '';
  const mensaje = typeof body?.mensaje === 'string' ? body.mensaje.trim() : '';
  if (!titulo || titulo.length > 255) return 'El título es obligatorio (máximo 255 caracteres)';
  if (!mensaje || mensaje.length > 5000) return 'El mensaje es obligatorio (máximo 5000 caracteres)';
  const tipo = body.tipo === undefined || body.tipo === '' ? 'info' : body.tipo;
  const prioridad = body.prioridad === undefined || body.prioridad === '' ? 'normal' : body.prioridad;
  if (!TIPOS_NOTIFICACION.includes(tipo)) return 'Tipo de notificación inválido';
  if (!PRIORIDADES.includes(prioridad)) return 'Prioridad inválida';
  let link: string | null = null;
  if (body.link !== undefined && body.link !== null && body.link !== '') {
    if (typeof body.link !== 'string' || body.link.length > 500) return 'Enlace inválido';
    const value = body.link.trim();
    const internal = /^\/(?!\/)[^\s]*$/.test(value);
    let external = false;
    try { const url = new URL(value); external = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { external = false; }
    if (!internal && !external) return 'El enlace debe ser una ruta interna (/...) o una URL http(s)';
    link = value;
  }
  return { titulo, mensaje, tipo, prioridad, link };
}

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
      if (!positiveId(usuario_id)) return sendError(res, 'Usuario inválido', 400);
      whereClause += ' AND n.usuario_id = ?';
      params.push(Number(usuario_id));
    }

    // Validación: los filtros deben ser cadenas simples (evita arrays/objetos vía query string).
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) { whereClause += ' AND (n.titulo LIKE ? OR n.mensaje LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
    if (tipo) {
      if (typeof tipo !== 'string' || !TIPOS_NOTIFICACION.includes(tipo)) return sendError(res, 'Tipo de notificación inválido', 400);
      whereClause += ' AND n.tipo = ?'; params.push(tipo);
    }
    if (leida !== undefined) { whereClause += ' AND n.leida = ?'; params.push(leida === 'true' ? 1 : 0); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notificaciones n ${whereClause}`,
      params
    );

    const [notificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido,
              (SELECT COUNT(*) FROM notificacion_respuestas r WHERE r.notificacion_id = n.id) AS respuestas
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
  if (!positiveId(req.params.id)) return sendError(res, 'Notificación inválida', 400);
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
    const datos = validarContenidoNotificacion(req.body);
    if (typeof datos === 'string') return sendError(res, datos, 400);
    // El envío individual exige destinatario: una notificación sin usuario no la recibe nadie
    // (cada cuenta solo ve las suyas). Para varios usuarios se usa el envío masivo por rol.
    const usuarioId = req.body.usuario_id;
    if (usuarioId === undefined || usuarioId === null || usuarioId === '') return sendError(res, 'Elige el destinatario de la notificación', 400);
    if (!positiveId(usuarioId)) return sendError(res, 'Usuario destinatario inválido', 400);
    const [destino] = await pool.query<RowDataPacket[]>(
      `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ? AND u.activo = 1 AND r.nombre <> 'superadministrador'`,
      [Number(usuarioId)]
    );
    if (!destino.length) return sendError(res, 'Usuario destinatario no encontrado', 404);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, usuario_id, link, prioridad, leida)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [datos.titulo, datos.mensaje, datos.tipo, Number(usuarioId), datos.link, datos.prioridad]
    );

    return sendSuccess(res, { id: result.insertId }, 'Notificación creada exitosamente', 201);
  } catch (error) {
    logError('Error al crear notificación:', error);
    return sendError(res, 'Error al crear notificación');
  }
}

export async function marcarLeida(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Notificación inválida', 400);
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
  if (!positiveId(req.params.id)) return sendError(res, 'Notificación inválida', 400);
  try {
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM notificaciones WHERE id = ? ${req.user && req.user.rol !== 'administrador' ? 'AND usuario_id = ?' : ''}`, [req.params.id, ...(req.user && req.user.rol !== 'administrador' ? [req.user.userId] : [])]);
    if (!result.affectedRows) return sendError(res, 'Notificación no encontrada', 404);
    return sendSuccess(res, null, 'Notificación eliminada');
  } catch (error) {
    return sendError(res, 'Error al eliminar notificación');
  }
}

const MAX_ELIMINAR = 200;

/** Elimina varias notificaciones. Cada cuenta solo borra las suyas; la administración, cualquiera. */
export async function deleteNotificaciones(req: AuthRequest, res: Response) {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return sendError(res, 'Elige al menos una notificación', 400);
  if (ids.length > MAX_ELIMINAR) return sendError(res, `Se pueden eliminar hasta ${MAX_ELIMINAR} a la vez`, 400);
  if (ids.some((id: unknown) => !positiveId(id))) return sendError(res, 'Notificación inválida', 400);
  const unicos = [...new Set(ids.map(Number))];
  try {
    const propias = req.user && req.user.rol !== 'administrador';
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM notificaciones WHERE id IN (?) ${propias ? 'AND usuario_id = ?' : ''}`,
      [unicos, ...(propias ? [req.user!.userId] : [])]
    );
    if (!result.affectedRows) return sendError(res, 'No se encontraron las notificaciones', 404);
    return sendSuccess(res, { eliminadas: result.affectedRows }, result.affectedRows === 1 ? 'Notificación eliminada' : `${result.affectedRows} notificaciones eliminadas`);
  } catch (error) {
    logError('Error al eliminar notificaciones:', error);
    return sendError(res, 'Error al eliminar notificaciones');
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

    // La administración también debe enterarse de las respuestas que aún no abrió.
    let respuestasPendientes = 0;
    if (authRequest.user?.rol === 'administrador') {
      const [pendientes] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM notificaciones WHERE respuesta_pendiente = 1');
      respuestasPendientes = Number(pendientes[0].total);
    }

    // Alertas activas, incidencias abiertas y trámites solicitados que esperan atención.
    const secciones = await seccionesPendientes(pool, currentUserId, authRequest.user?.rol);

    return sendSuccess(res, {
      total: notificaciones[0].total,
      respuestas_pendientes: respuestasPendientes,
      secciones,
      recientes
    });
  } catch (error) {
    return sendError(res, 'Error al obtener notificaciones no leídas');
  }
}

export async function enviarNotificacionMasiva(req: Request, res: Response) {
  try {
    const { rol_ids } = req.body;
    const datos = validarContenidoNotificacion(req.body);
    if (typeof datos === 'string') return sendError(res, datos, 400);

    // Validación: lista acotada de IDs de rol enteros y sin duplicados.
    if (!Array.isArray(rol_ids) || rol_ids.length === 0 || rol_ids.length > 10 || rol_ids.some((id: unknown) => !positiveId(id))) {
      return sendError(res, 'Debe especificar al menos un rol válido', 400);
    }
    const roles = [...new Set(rol_ids.map(Number))];

    // Solo usuarios activos: no se generan avisos para cuentas desactivadas.
    const usuariosParams = roles.map(() => '?').join(',');
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE activo = 1 AND rol_id IN (${usuariosParams})`,
      roles
    );

    if (usuarios.length === 0) {
      return sendError(res, 'No se encontraron usuarios para los roles especificados', 404);
    }

    // Crear notificaciones para cada usuario
    // Corrección: el INSERT declara 7 columnas (incluida "leida"); antes se enviaban 6 valores
    // por fila y el envío masivo fallaba siempre con "Column count doesn't match".
    const values = usuarios.map(u => [datos.titulo, datos.mensaje, datos.tipo, u.id, datos.link, datos.prioridad, 0]);
    
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
// ---------------------------------------------------------------------------
// Respuestas: el destinatario y la administración conversan bajo cada notificación.
// ---------------------------------------------------------------------------
const MAX_RESPUESTA = 2000;

async function notificacionAccesible(req: AuthRequest, id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT n.id, n.usuario_id, n.titulo, n.mensaje, n.tipo, n.prioridad, n.link, n.leida, n.created_at,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM notificaciones n LEFT JOIN usuarios u ON u.id = n.usuario_id WHERE n.id = ?`,
    [id]
  );
  const notificacion = rows[0];
  if (!notificacion) return null;
  const esAdmin = req.user?.rol === 'administrador';
  if (!esAdmin && notificacion.usuario_id !== req.user?.userId) return null;
  return { notificacion, esAdmin };
}

export async function getRespuestas(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Notificación inválida', 400);
  try {
    const acceso = await notificacionAccesible(req, Number(req.params.id));
    if (!acceso) return sendError(res, 'Notificación no encontrada', 404);
    const [respuestas] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.mensaje, r.created_at, r.usuario_id, u.nombre, u.apellido, ro.nombre AS rol
       FROM notificacion_respuestas r
       JOIN usuarios u ON u.id = r.usuario_id JOIN roles ro ON ro.id = u.rol_id
       WHERE r.notificacion_id = ? ORDER BY r.created_at, r.id`,
      [acceso.notificacion.id]
    );
    // Abrir la conversación la da por vista: la administración atiende la respuesta;
    // el destinatario lee la notificación.
    if (acceso.esAdmin) await pool.query('UPDATE notificaciones SET respuesta_pendiente = 0 WHERE id = ?', [acceso.notificacion.id]);
    else await pool.query('UPDATE notificaciones SET leida = 1, fecha_leida = COALESCE(fecha_leida, NOW()) WHERE id = ?', [acceso.notificacion.id]);
    return sendSuccess(res, { notificacion: acceso.notificacion, respuestas });
  } catch (error) {
    logError('Error al obtener respuestas:', error);
    return sendError(res, 'Error al obtener las respuestas');
  }
}

export async function createRespuesta(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Notificación inválida', 400);
  const mensaje = typeof req.body?.mensaje === 'string' ? req.body.mensaje.trim() : '';
  if (!mensaje) return sendError(res, 'Escribe tu respuesta', 400);
  if (mensaje.length > MAX_RESPUESTA) return sendError(res, `La respuesta admite hasta ${MAX_RESPUESTA} caracteres`, 400);
  try {
    const acceso = await notificacionAccesible(req, Number(req.params.id));
    if (!acceso) return sendError(res, 'Notificación no encontrada', 404);
    if (acceso.notificacion.usuario_id === null) return sendError(res, 'Esta notificación no tiene destinatario', 409);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO notificacion_respuestas (notificacion_id, usuario_id, mensaje) VALUES (?, ?, ?)',
      [acceso.notificacion.id, req.user!.userId, mensaje]
    );
    // Quien no escribió se entera: si responde el destinatario, queda pendiente para la
    // administración; si responde la administración, vuelve a "no leída" para el destinatario.
    if (acceso.esAdmin && acceso.notificacion.usuario_id !== req.user!.userId) {
      await pool.query('UPDATE notificaciones SET leida = 0, fecha_leida = NULL, respuesta_pendiente = 0 WHERE id = ?', [acceso.notificacion.id]);
    } else {
      await pool.query('UPDATE notificaciones SET respuesta_pendiente = 1 WHERE id = ?', [acceso.notificacion.id]);
    }
    return sendSuccess(res, { id: result.insertId }, 'Respuesta enviada', 201);
  } catch (error) {
    logError('Error al responder notificación:', error);
    return sendError(res, 'Error al enviar la respuesta');
  }
}
