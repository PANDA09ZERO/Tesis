import { Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { logError } from '../utils/logger';
import { positiveId } from '../utils/academicValidation';

// Trámites documentales: traslados, certificados de estudios y constancias.
// Sirven para alumnos actuales y exalumnos (incluidos los importados como históricos).

export const TIPOS_TRAMITE = ['traslado', 'certificado_estudios', 'constancia_estudios', 'constancia_matricula', 'constancia_conducta', 'otro'] as const;
export const ESTADOS_TRAMITE = ['solicitado', 'en_proceso', 'listo', 'entregado', 'anulado'] as const;
const FINALES = new Set(['entregado', 'anulado']);

const SELECT_TRAMITE = `SELECT t.*, a.codigo_alumno, u.nombre, u.apellido, u.dni, a.estado estado_alumno, a.es_historico,
  d.titulo documento_titulo, CONCAT(at.nombre,' ',at.apellido) atendido_por_nombre, CONCAT(cr.nombre,' ',cr.apellido) creado_por_nombre
  FROM tramites_documentales t JOIN alumnos a ON a.id = t.alumno_id JOIN usuarios u ON u.id = a.usuario_id
  LEFT JOIN documentos d ON d.id = t.documento_id LEFT JOIN usuarios at ON at.id = t.atendido_por
  LEFT JOIN usuarios cr ON cr.id = t.creado_por`;

function textoOpcional(valor: unknown, max: number): string | null | false {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || valor.trim().length > max) return false;
  return valor.trim() || null;
}

/** GET /tramites?estado=&alumno_id=&pendientes=1 */
export async function listarTramites(req: AuthRequest, res: Response) {
  const condiciones: string[] = [], params: unknown[] = [];
  if (req.query.alumno_id !== undefined) {
    if (!positiveId(req.query.alumno_id)) return sendError(res, 'Alumno inválido', 400);
    condiciones.push('t.alumno_id = ?'); params.push(Number(req.query.alumno_id));
  }
  if (req.query.estado !== undefined && req.query.estado !== '') {
    if (!ESTADOS_TRAMITE.includes(req.query.estado as any)) return sendError(res, 'Estado inválido', 400);
    condiciones.push('t.estado = ?'); params.push(req.query.estado);
  }
  if (req.query.pendientes === '1') condiciones.push("t.estado IN ('solicitado','en_proceso','listo')");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_TRAMITE} ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
      ORDER BY FIELD(t.estado,'solicitado','en_proceso','listo','entregado','anulado'), t.created_at DESC LIMIT 500`, params);
    return sendSuccess(res, rows);
  } catch (error) {
    logError('Error al listar trámites:', error);
    return sendError(res, 'No se pudieron cargar los trámites');
  }
}

/** POST /tramites */
export async function crearTramite(req: AuthRequest, res: Response) {
  const b = req.body || {};
  const solicitante = textoOpcional(b.solicitante, 150), destino = textoOpcional(b.destino, 200), observaciones = textoOpcional(b.observaciones, 2000);
  if (!positiveId(b.alumno_id) || !TIPOS_TRAMITE.includes(b.tipo) || solicitante === false || destino === false || observaciones === false)
    return sendError(res, 'Revisa el alumno, el tipo de trámite y los textos', 400);
  if (b.tipo === 'otro' && !observaciones) return sendError(res, 'Describe el trámite en observaciones', 400);
  try {
    const [alumno] = await pool.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ?', [b.alumno_id]);
    if (!alumno.length) return sendError(res, 'Alumno no encontrado', 404);
    const [r] = await pool.query<ResultSetHeader>(`INSERT INTO tramites_documentales (alumno_id, tipo, solicitante, destino, observaciones, creado_por)
      VALUES (?, ?, ?, ?, ?, ?)`, [b.alumno_id, b.tipo, solicitante, destino, observaciones, req.user!.userId]);
    const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_TRAMITE} WHERE t.id = ?`, [r.insertId]);
    return sendSuccess(res, rows[0], 'Trámite registrado', 201);
  } catch (error) {
    logError('Error al crear trámite:', error);
    return sendError(res, 'No se pudo registrar el trámite');
  }
}

/** PUT /tramites/:id — estado, textos y documento final. */
export async function actualizarTramite(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Trámite inválido', 400);
  const b = req.body || {};
  if (b.estado !== undefined && !ESTADOS_TRAMITE.includes(b.estado)) return sendError(res, 'Estado inválido', 400);
  const campos: Record<string, unknown> = {};
  for (const [campo, max] of [['solicitante', 150], ['destino', 200], ['observaciones', 2000]] as const) {
    if (b[campo] === undefined) continue;
    const valor = textoOpcional(b[campo], max);
    if (valor === false) return sendError(res, `Texto inválido: ${campo}`, 400);
    campos[campo] = valor;
  }
  if (b.documento_id !== undefined && b.documento_id !== null && !positiveId(b.documento_id)) return sendError(res, 'Documento inválido', 400);
  try {
    const [actual] = await pool.query<RowDataPacket[]>('SELECT * FROM tramites_documentales WHERE id = ?', [req.params.id]);
    if (!actual.length) return sendError(res, 'Trámite no encontrado', 404);
    const t = actual[0];
    if (FINALES.has(t.estado) && b.estado !== undefined && b.estado !== t.estado) return sendError(res, `El trámite ya está ${t.estado}; registra uno nuevo si hace falta`, 409);
    if (b.documento_id) {
      const [doc] = await pool.query<RowDataPacket[]>('SELECT id FROM documentos WHERE id = ? AND alumno_id = ?', [b.documento_id, t.alumno_id]);
      if (!doc.length) return sendError(res, 'El documento no pertenece a este alumno', 400);
    }
    if (b.documento_id !== undefined) campos.documento_id = b.documento_id || null;
    if (b.estado !== undefined) campos.estado = b.estado;
    if (!Object.keys(campos).length) return sendError(res, 'No hay cambios', 400);
    const sets = Object.keys(campos).map(c => `${c} = ?`);
    const valores = Object.values(campos);
    sets.push('atendido_por = ?'); valores.push(req.user!.userId);
    if (b.estado === 'entregado' && t.estado !== 'entregado') sets.push('entregado_en = NOW()');
    await pool.query(`UPDATE tramites_documentales SET ${sets.join(', ')} WHERE id = ?`, [...valores, req.params.id]);
    const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_TRAMITE} WHERE t.id = ?`, [req.params.id]);
    return sendSuccess(res, rows[0], 'Trámite actualizado');
  } catch (error) {
    logError('Error al actualizar trámite:', error);
    return sendError(res, 'No se pudo actualizar el trámite');
  }
}
