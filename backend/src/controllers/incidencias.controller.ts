import { Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { positiveId, validDate } from '../utils/academicValidation';
import { profesorAlumnoScope, profesorTieneAccesoAlumno } from '../utils/profesorAlcance';
import { academicToday, periodoVigenteSql } from '../utils/periodoVigencia';

export const TIPOS_INCIDENCIA = ['derivacion_direccion', 'conducta', 'citacion_apoderado', 'agresion', 'otro'] as const;
export const GRAVEDADES = ['leve', 'moderada', 'grave'] as const;
export const ESTADOS_INCIDENCIA = ['abierta', 'en_seguimiento', 'cerrada'] as const;

const esAdmin = (req: AuthRequest) => req.user?.rol === 'administrador' || req.user?.rol === 'superadministrador';
const texto = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const textoOpcional = (value: unknown, max: number) => value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim().length <= max);
const limpiar = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const horaValida = (value: unknown) => value === undefined || value === null || value === '' || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value));

const SELECT_INCIDENCIA = `SELECT i.id, i.alumno_id, i.periodo_academico_id, DATE_FORMAT(i.fecha, '%Y-%m-%d') fecha,
  TIME_FORMAT(i.hora, '%H:%i') hora, i.tipo, i.gravedad, i.lugar, i.descripcion, i.medida_tomada,
  i.apoderado_notificado, i.estado, i.resolucion, i.cerrada_en, i.created_at, i.updated_at, i.reportado_por,
  u.nombre alumno_nombre, u.apellido alumno_apellido, a.codigo_alumno,
  ur.nombre reportado_nombre, ur.apellido reportado_apellido,
  uc.nombre cerrada_nombre, uc.apellido cerrada_apellido, pa.nombre periodo
 FROM incidencias i
 JOIN alumnos a ON a.id = i.alumno_id
 JOIN usuarios u ON u.id = a.usuario_id
 JOIN usuarios ur ON ur.id = i.reportado_por
 LEFT JOIN usuarios uc ON uc.id = i.cerrada_por
 LEFT JOIN periodos_academicos pa ON pa.id = i.periodo_academico_id`;

async function auditar(req: AuthRequest, accion: string, id: number, detalles: Record<string, unknown>) {
  try {
    await pool.query(
      `INSERT INTO registro_actividades (usuario_id, accion, entidad, entidad_id, detalles, ip_address) VALUES (?, ?, 'incidencias', ?, ?, ?)`,
      [req.user!.userId, accion, id, JSON.stringify(detalles), req.ip || null]
    );
  } catch { /* La auditoría no debe impedir el registro ya guardado. */ }
}

function validarCampos(body: any, parcial = false): string | null {
  const requerido = (key: string) => !parcial || body[key] !== undefined;
  if (requerido('fecha') && (!validDate(body.fecha) || body.fecha > academicToday())) return 'La fecha debe ser válida y no puede ser futura';
  if (!horaValida(body.hora)) return 'La hora debe tener el formato HH:MM';
  if (requerido('tipo') && !TIPOS_INCIDENCIA.includes(body.tipo)) return 'Tipo de incidencia inválido';
  if (requerido('gravedad') && !GRAVEDADES.includes(body.gravedad)) return 'Gravedad inválida';
  if (requerido('descripcion') && !texto(body.descripcion, 2000)) return 'Describa lo ocurrido (máximo 2000 caracteres)';
  if (!textoOpcional(body.lugar, 120)) return 'El lugar admite como máximo 120 caracteres';
  if (!textoOpcional(body.medida_tomada, 2000)) return 'La medida tomada admite como máximo 2000 caracteres';
  if (body.apoderado_notificado !== undefined && typeof body.apoderado_notificado !== 'boolean') return 'Indique si se notificó al apoderado';
  return null;
}

export async function getIncidencias(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const { estado, tipo, gravedad, alumno_id, search, desde, hasta } = req.query;
    if (estado !== undefined && estado !== '' && !ESTADOS_INCIDENCIA.includes(estado as any)) return sendError(res, 'Estado inválido', 400);
    if (tipo !== undefined && tipo !== '' && !TIPOS_INCIDENCIA.includes(tipo as any)) return sendError(res, 'Tipo de incidencia inválido', 400);
    if (gravedad !== undefined && gravedad !== '' && !GRAVEDADES.includes(gravedad as any)) return sendError(res, 'Gravedad inválida', 400);
    if (alumno_id !== undefined && alumno_id !== '' && !positiveId(alumno_id)) return sendError(res, 'Alumno inválido', 400);
    if ((desde !== undefined && desde !== '' && !validDate(desde)) || (hasta !== undefined && hasta !== '' && !validDate(hasta))) return sendError(res, 'Rango de fechas inválido', 400);
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) return sendError(res, 'Búsqueda inválida', 400);

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (req.user?.rol === 'profesor') {
      const scope = profesorAlumnoScope('a', req.user.userId);
      where += ` AND ${scope.sql}`; params.push(...scope.params);
    }
    if (estado) { where += ' AND i.estado = ?'; params.push(estado); }
    if (tipo) { where += ' AND i.tipo = ?'; params.push(tipo); }
    if (gravedad) { where += ' AND i.gravedad = ?'; params.push(gravedad); }
    if (alumno_id) { where += ' AND i.alumno_id = ?'; params.push(Number(alumno_id)); }
    if (desde) { where += ' AND i.fecha >= ?'; params.push(desde); }
    if (hasta) { where += ' AND i.fecha <= ?'; params.push(hasta); }
    if (typeof search === 'string' && search.trim()) {
      where += " AND (CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR a.codigo_alumno LIKE ?)";
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [count] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) total FROM incidencias i JOIN alumnos a ON a.id = i.alumno_id JOIN usuarios u ON u.id = a.usuario_id ${where}`, params);
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_INCIDENCIA} ${where} ORDER BY i.fecha DESC, i.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return sendPaginated(res, rows, Number(count[0].total), page, limit);
  } catch {
    return sendError(res, 'Error al obtener incidencias');
  }
}

export async function getIncidenciasEstadisticas(req: AuthRequest, res: Response) {
  try {
    const scope = req.user?.rol === 'profesor' ? profesorAlumnoScope('a', req.user.userId) : null;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) total,
        COALESCE(SUM(i.estado <> 'cerrada'), 0) abiertas,
        COALESCE(SUM(i.tipo = 'derivacion_direccion'), 0) derivaciones,
        COALESCE(SUM(i.gravedad = 'grave' AND i.estado <> 'cerrada'), 0) graves_abiertas,
        COALESCE(SUM(i.fecha >= DATE_SUB(?, INTERVAL 30 DAY)), 0) ultimos_30_dias
       FROM incidencias i JOIN alumnos a ON a.id = i.alumno_id ${scope ? 'WHERE ' + scope.sql : ''}`,
      [academicToday(), ...(scope?.params || [])]
    );
    const r = rows[0];
    return sendSuccess(res, Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])));
  } catch {
    return sendError(res, 'Error al obtener el resumen de incidencias');
  }
}

/** Historial de un alumno; el acceso del profesor y del apoderado lo verifica authorizeLinkedAlumno. */
export async function getIncidenciasAlumno(req: AuthRequest, res: Response) {
  try {
    if (!positiveId(req.params.alumnoId)) return sendError(res, 'Alumno inválido', 400);
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_INCIDENCIA} WHERE i.alumno_id = ? ORDER BY i.fecha DESC, i.id DESC LIMIT 200`, [Number(req.params.alumnoId)]);
    // El apoderado ve el hecho y la medida, no quién lo registró internamente.
    const data = req.user?.rol === 'apoderado'
      ? rows.map(({ reportado_por, reportado_nombre, reportado_apellido, cerrada_nombre, cerrada_apellido, ...rest }) => rest)
      : rows;
    return sendSuccess(res, data);
  } catch {
    return sendError(res, 'Error al obtener las incidencias del alumno');
  }
}

export async function createIncidencia(req: AuthRequest, res: Response) {
  try {
    const body = req.body || {};
    if (!positiveId(body.alumno_id)) return sendError(res, 'Seleccione un alumno válido', 400);
    const error = validarCampos(body);
    if (error) return sendError(res, error, 400);
    const alumnoId = Number(body.alumno_id);

    const [alumno] = await pool.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ?', [alumnoId]);
    if (!alumno.length) return sendError(res, 'Alumno no encontrado', 404);
    if (req.user?.rol === 'profesor' && !(await profesorTieneAccesoAlumno(pool, req.user.userId, alumnoId))) {
      return sendError(res, 'Solo puede registrar incidencias de sus alumnos del periodo vigente', 403);
    }

    const [periodo] = await pool.query<RowDataPacket[]>(
      `SELECT pa.id FROM periodos_academicos pa WHERE ? BETWEEN pa.fecha_inicio AND pa.fecha_fin ORDER BY ${periodoVigenteSql('pa')} DESC, pa.id DESC LIMIT 1`, [body.fecha]);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO incidencias (alumno_id, periodo_academico_id, reportado_por, fecha, hora, tipo, gravedad, lugar, descripcion, medida_tomada, apoderado_notificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [alumnoId, periodo[0]?.id ?? null, req.user!.userId, body.fecha, limpiar(body.hora), body.tipo, body.gravedad,
        limpiar(body.lugar), body.descripcion.trim(), limpiar(body.medida_tomada), body.apoderado_notificado ? 1 : 0]
    );
    await auditar(req, 'crear_incidencia', result.insertId, { alumno_id: alumnoId, tipo: body.tipo, gravedad: body.gravedad });
    return sendSuccess(res, { id: result.insertId }, 'Incidencia registrada', 201);
  } catch {
    return sendError(res, 'Error al registrar la incidencia');
  }
}

export async function updateIncidencia(req: AuthRequest, res: Response) {
  try {
    if (!positiveId(req.params.id)) return sendError(res, 'Incidencia inválida', 400);
    const body = req.body || {};
    const error = validarCampos(body, true);
    if (error) return sendError(res, error, 400);

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, alumno_id, reportado_por, estado FROM incidencias WHERE id = ?', [Number(req.params.id)]);
    if (!rows.length) return sendError(res, 'Incidencia no encontrada', 404);
    const actual = rows[0];
    if (!esAdmin(req)) {
      if (!(await profesorTieneAccesoAlumno(pool, req.user!.userId, actual.alumno_id))) return sendError(res, 'Incidencia no encontrada', 404);
      if (actual.reportado_por !== req.user!.userId) return sendError(res, 'Solo puede editar las incidencias que usted registró', 403);
      if (actual.estado === 'cerrada') return sendError(res, 'La incidencia está cerrada; solicite cambios a administración', 409);
    }

    const editables: Record<string, (v: any) => any> = {
      fecha: v => v, hora: limpiar, tipo: v => v, gravedad: v => v, lugar: limpiar,
      descripcion: v => v.trim(), medida_tomada: limpiar, apoderado_notificado: v => (v ? 1 : 0)
    };
    const sets: string[] = []; const params: any[] = [];
    for (const [key, map] of Object.entries(editables)) if (body[key] !== undefined) { sets.push(`${key} = ?`); params.push(map(body[key])); }
    if (!sets.length) return sendError(res, 'No hay cambios para guardar', 400);

    await pool.query(`UPDATE incidencias SET ${sets.join(', ')} WHERE id = ?`, [...params, actual.id]);
    await auditar(req, 'editar_incidencia', actual.id, { campos: Object.keys(editables).filter(k => body[k] !== undefined) });
    return sendSuccess(res, null, 'Incidencia actualizada');
  } catch {
    return sendError(res, 'Error al actualizar la incidencia');
  }
}

/** Cambia el seguimiento: solo administración cierra o reabre. */
export async function updateEstadoIncidencia(req: AuthRequest, res: Response) {
  try {
    if (!positiveId(req.params.id)) return sendError(res, 'Incidencia inválida', 400);
    const { estado, resolucion } = req.body || {};
    if (!ESTADOS_INCIDENCIA.includes(estado)) return sendError(res, 'Estado inválido', 400);
    if (estado === 'cerrada' && !texto(resolucion, 2000)) return sendError(res, 'Indique cómo se resolvió la incidencia para cerrarla', 400);
    if (!textoOpcional(resolucion, 2000)) return sendError(res, 'La resolución admite como máximo 2000 caracteres', 400);

    const cerrar = estado === 'cerrada';
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE incidencias SET estado = ?, resolucion = ${cerrar ? '?' : 'resolucion'},
        cerrada_por = ${cerrar ? '?' : 'NULL'}, cerrada_en = ${cerrar ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = ?`,
      cerrar ? [estado, resolucion.trim(), req.user!.userId, Number(req.params.id)] : [estado, Number(req.params.id)]
    );
    if (!result.affectedRows) return sendError(res, 'Incidencia no encontrada', 404);
    await auditar(req, 'estado_incidencia', Number(req.params.id), { estado });
    return sendSuccess(res, null, cerrar ? 'Incidencia cerrada' : 'Estado actualizado');
  } catch {
    return sendError(res, 'Error al actualizar el estado de la incidencia');
  }
}
