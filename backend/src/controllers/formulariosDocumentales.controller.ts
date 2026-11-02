import { logError } from '../utils/logger';
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { getPagination } from '../utils/pagination';
import { sendError, sendPaginated, sendSuccess } from '../utils/response';

const FIELD_TYPES = ['texto', 'parrafo', 'numero', 'fecha', 'correo', 'seleccion', 'casilla'] as const;
type FieldType = typeof FIELD_TYPES[number];

interface FormField {
  id: string;
  etiqueta: string;
  tipo: FieldType;
  requerido: boolean;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
}

function normalizeFields(value: unknown): FormField[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null;
  const ids = new Set<string>();
  const fields: FormField[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const field = item as Record<string, unknown>;
    if (typeof field.id !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(field.id)
      || ids.has(field.id)
      || typeof field.etiqueta !== 'string'
      || !field.etiqueta.trim()
      || field.etiqueta.trim().length > 120
      || !FIELD_TYPES.includes(field.tipo as FieldType)
      || typeof field.requerido !== 'boolean') return null;
    ids.add(field.id);

    const normalized: FormField = {
      id: field.id,
      etiqueta: field.etiqueta.trim(),
      tipo: field.tipo as FieldType,
      requerido: field.requerido
    };
    if (normalized.tipo === 'seleccion') {
      if (!Array.isArray(field.opciones) || field.opciones.length < 1 || field.opciones.length > 50
        || field.opciones.some(option => typeof option !== 'string' || !option.trim() || option.length > 120)) {
        return null;
      }
      const options = (field.opciones as string[]).map(option => option.trim());
      if (new Set(options).size !== options.length) return null;
      normalized.opciones = options;
    } else if (field.opciones !== undefined) {
      return null;
    }
    if (normalized.tipo === 'numero') {
      if (field.minimo !== undefined && (typeof field.minimo !== 'number' || !Number.isFinite(field.minimo))) return null;
      if (field.maximo !== undefined && (typeof field.maximo !== 'number' || !Number.isFinite(field.maximo))) return null;
      if (typeof field.minimo === 'number') normalized.minimo = field.minimo;
      if (typeof field.maximo === 'number') normalized.maximo = field.maximo;
      if (normalized.minimo !== undefined && normalized.maximo !== undefined
        && normalized.minimo > normalized.maximo) return null;
    } else if (field.minimo !== undefined || field.maximo !== undefined) {
      return null;
    }
    fields.push(normalized);
  }
  return fields;
}

function parseFields(value: unknown): FormField[] | null {
  if (typeof value === 'string') {
    try {
      return normalizeFields(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return normalizeFields(value);
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateAnswers(fields: FormField[], value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const answers = value as Record<string, unknown>;
  const fieldIds = new Set(fields.map(field => field.id));
  if (Object.keys(answers).some(key => !fieldIds.has(key))) return null;

  for (const field of fields) {
    const answer = answers[field.id];
    if (answer === undefined || answer === null || answer === '') {
      if (field.requerido) return null;
      continue;
    }
    if (field.tipo === 'texto' || field.tipo === 'parrafo') {
      if (typeof answer !== 'string' || answer.length > 5000 || (field.tipo === 'texto' && answer.length > 500)) return null;
    } else if (field.tipo === 'correo') {
      if (typeof answer !== 'string' || answer.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) return null;
    } else if (field.tipo === 'numero') {
      if (typeof answer !== 'number' || !Number.isFinite(answer)
        || (field.minimo !== undefined && answer < field.minimo)
        || (field.maximo !== undefined && answer > field.maximo)) return null;
    } else if (field.tipo === 'fecha') {
      if (typeof answer !== 'string' || !validDate(answer)) return null;
    } else if (field.tipo === 'seleccion') {
      if (typeof answer !== 'string' || !field.opciones?.includes(answer)) return null;
    } else if (field.tipo === 'casilla') {
      if (typeof answer !== 'boolean' || (field.requerido && answer !== true)) return null;
    }
  }
  return answers;
}

async function getCategoryId(value: unknown): Promise<number | null | false> {
  if (value === undefined || value === null || value === '') return null;
  const id = parseId(value);
  if (!id) return false;
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM documento_categorias WHERE id = ? AND estado = 'activa'",
    [id]
  );
  return rows.length > 0 ? id : false;
}

async function hasFormAccess(formId: number, user: AuthRequest['user'], allowArchived = false): Promise<boolean> {
  if (!user) return false;
  const statusCondition = allowArchived ? "estado IN ('publicada', 'archivada')" : "estado = 'publicada'";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM formularios_documentales WHERE id = ? AND ${statusCondition}`,
    [formId]
  );
  return rows.length > 0;
}

export async function getFormularios(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as { page?: string; limit?: string });
    const conditions: string[] = [];
    const params: (number | string)[] = [];
    if (req.user?.rol !== 'administrador') conditions.push("f.estado = 'publicada'");
    else if (req.query.estado) {
      conditions.push('f.estado = ?');
      params.push(String(req.query.estado));
    }
    if (req.query.categoria_id) {
      const categoryId = parseId(req.query.categoria_id);
      if (!categoryId) return sendError(res, 'Categoría no válida', 400);
      conditions.push('f.categoria_id = ?');
      params.push(categoryId);
    }
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      conditions.push('(f.titulo LIKE ? OR f.descripcion LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM formularios_documentales f ${where}`,
      params
    );
    const [forms] = await pool.query<RowDataPacket[]>(
      `SELECT f.id, f.titulo, f.descripcion, f.categoria_id, c.nombre AS categoria,
              f.estado, f.creado_por, f.created_at, f.updated_at,
              JSON_LENGTH(f.campos) AS cantidad_campos,
              ${req.user?.rol === 'administrador'
                ? '(SELECT COUNT(*) FROM formularios_documentales_envios e WHERE e.formulario_id = f.id)'
                : 'NULL'} AS envios_count
       FROM formularios_documentales f
       LEFT JOIN documento_categorias c ON c.id = f.categoria_id
       ${where}
       ORDER BY f.updated_at DESC, f.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return sendPaginated(res, forms, Number(counts[0]?.total || 0), page, limit);
  } catch (error) {
    logError('Error al listar formularios:', error);
    return sendError(res, 'Error al obtener formularios');
  }
}

export async function getFormulario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de formulario no válido', 400);
  try {
    const [forms] = await pool.query<RowDataPacket[]>(
      `SELECT f.id, f.titulo, f.descripcion, f.categoria_id, c.nombre AS categoria,
              f.campos, f.estado, f.creado_por, f.created_at, f.updated_at
       FROM formularios_documentales f
       LEFT JOIN documento_categorias c ON c.id = f.categoria_id
       WHERE f.id = ?`,
      [id]
    );
    const form = forms[0];
    if (!form || (req.user?.rol !== 'administrador' && form.estado !== 'publicada')) {
      return sendError(res, 'Formulario no encontrado', 404);
    }
    const fields = parseFields(form.campos);
    if (!fields) return sendError(res, 'La definición del formulario no es válida', 500);
    return sendSuccess(res, { ...form, campos: fields });
  } catch (error) {
    logError('Error al obtener formulario:', error);
    return sendError(res, 'Error al obtener formulario');
  }
}

export async function createFormulario(req: AuthRequest, res: Response) {
  const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const fields = parseFields(req.body.campos);
  if (!titulo || titulo.length > 150 || descripcion.length > 5000 || !fields) {
    return sendError(res, 'Título, descripción o campos del formulario no válidos', 400);
  }
  try {
    const categoryId = await getCategoryId(req.body.categoria_id);
    if (categoryId === false) return sendError(res, 'Seleccione una categoría activa', 400);
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO formularios_documentales
        (titulo, descripcion, categoria_id, campos, estado, creado_por)
       VALUES (?, ?, ?, ?, 'borrador', ?)`,
      [titulo, descripcion || null, categoryId, JSON.stringify(fields), req.user!.userId]
    );
    return sendSuccess(res, { id: result.insertId, estado: 'borrador' }, 'Formulario creado como borrador', 201);
  } catch (error) {
    logError('Error al crear formulario:', error);
    return sendError(res, 'Error al crear formulario');
  }
}

export async function updateFormulario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const fields = parseFields(req.body.campos);
  if (!id || !titulo || titulo.length > 150 || descripcion.length > 5000 || !fields) {
    return sendError(res, 'Datos del formulario no válidos', 400);
  }
  try {
    const categoryId = await getCategoryId(req.body.categoria_id);
    if (categoryId === false) return sendError(res, 'Seleccione una categoría activa', 400);
    const [forms] = await pool.query<RowDataPacket[]>(
      'SELECT estado FROM formularios_documentales WHERE id = ?',
      [id]
    );
    if (forms.length === 0) return sendError(res, 'Formulario no encontrado', 404);
    if (forms[0].estado !== 'borrador') {
      return sendError(res, 'Solo se pueden editar formularios en borrador. Duplique el formulario publicado para cambiar sus campos.', 409);
    }
    await pool.query(
      `UPDATE formularios_documentales
       SET titulo = ?, descripcion = ?, categoria_id = ?, campos = ?
       WHERE id = ? AND estado = 'borrador'`,
      [titulo, descripcion || null, categoryId, JSON.stringify(fields), id]
    );
    return sendSuccess(res, null, 'Formulario actualizado');
  } catch (error) {
    logError('Error al actualizar formulario:', error);
    return sendError(res, 'Error al actualizar formulario');
  }
}

export async function updateEstadoFormulario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  const estado = req.body.estado;
  if (!id || !['publicada', 'archivada'].includes(estado)) {
    return sendError(res, 'Estado de formulario no válido', 400);
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [forms] = await connection.query<RowDataPacket[]>(
      'SELECT id, estado, campos FROM formularios_documentales WHERE id = ? FOR UPDATE',
      [id]
    );
    const form = forms[0];
    if (!form) {
      await connection.rollback();
      return sendError(res, 'Formulario no encontrado', 404);
    }
    if (form.estado === 'archivada') {
      await connection.rollback();
      return sendError(res, 'Un formulario archivado no se puede volver a publicar', 409);
    }
    if (estado === 'publicada' && !parseFields(form.campos)) {
      await connection.rollback();
      return sendError(res, 'El formulario no contiene campos válidos', 400);
    }
    await connection.query('UPDATE formularios_documentales SET estado = ? WHERE id = ?', [estado, id]);
    await connection.commit();
    return sendSuccess(res, null, estado === 'publicada' ? 'Formulario publicado' : 'Formulario archivado');
  } catch (error) {
    await connection.rollback();
    logError('Error al actualizar estado del formulario:', error);
    return sendError(res, 'Error al actualizar el estado del formulario');
  } finally {
    connection.release();
  }
}

export async function submitFormulario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de formulario no válido', 400);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [forms] = await connection.query<RowDataPacket[]>(
      'SELECT campos, estado FROM formularios_documentales WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!forms[0] || forms[0].estado !== 'publicada') {
      await connection.rollback();
      return sendError(res, 'El formulario no está disponible para envíos', 404);
    }
    const fields = parseFields(forms[0].campos);
    const answers = fields && validateAnswers(fields, req.body.respuestas);
    if (!answers) {
      await connection.rollback();
      return sendError(res, 'Las respuestas no son válidas o faltan campos obligatorios', 400);
    }

    let alumnoId: number | null = null;
    if (req.body.alumno_id !== undefined && req.body.alumno_id !== null && req.body.alumno_id !== '') {
      alumnoId = parseId(req.body.alumno_id);
      if (!alumnoId) {
        await connection.rollback();
        return sendError(res, 'Alumno no válido', 400);
      }
      if (req.user?.rol === 'alumno') {
        const [links] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM alumnos WHERE id = ? AND usuario_id = ?',
          [alumnoId, req.user.userId]
        );
        if (!links.length) {
          await connection.rollback();
          return sendError(res, 'Alumno no encontrado', 404);
        }
      } else if (req.user?.rol === 'apoderado') {
        const [links] = await connection.query<RowDataPacket[]>(
          `SELECT 1 FROM apoderado_alumno aa
           JOIN apoderados ap ON ap.id = aa.apoderado_id
           WHERE ap.usuario_id = ? AND aa.alumno_id = ?`,
          [req.user.userId, alumnoId]
        );
        if (!links.length) {
          await connection.rollback();
          return sendError(res, 'Alumno no encontrado', 404);
        }
      } else if (req.user?.rol !== 'administrador') {
        await connection.rollback();
        return sendError(res, 'No puede asociar respuestas a otro alumno', 403);
      }
    }

    if (req.user?.rol === 'alumno' && alumnoId === null) {
      const [own] = await connection.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE usuario_id = ?', [req.user.userId]);
      if (!own.length) { await connection.rollback();return sendError(res,'Perfil de alumno no encontrado',404); }
      alumnoId = own[0].id;
    }
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO formularios_documentales_envios
        (formulario_id, usuario_id, alumno_id, respuestas)
       VALUES (?, ?, ?, ?)`,
      [id, req.user!.userId, alumnoId, JSON.stringify(answers)]
    );
    await connection.commit();
    return sendSuccess(res, { id: result.insertId }, 'Formulario enviado', 201);
  } catch (error) {
    await connection.rollback();
    logError('Error al enviar formulario:', error);
    return sendError(res, 'Error al enviar formulario');
  } finally {
    connection.release();
  }
}

export async function getEnviosFormulario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de formulario no válido', 400);
  try {
    const hasAccess = await hasFormAccess(id, req.user, true);
    if (!hasAccess) return sendError(res, 'Formulario no encontrado', 404);

    const { page, limit, offset } = getPagination(req.query as { page?: string; limit?: string });
    const ownOnly = req.user?.rol !== 'administrador';
    const condition = ownOnly ? 'AND e.usuario_id = ?' : '';
    const params: number[] = ownOnly ? [id, req.user!.userId] : [id];
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM formularios_documentales_envios e
       WHERE e.formulario_id = ? ${condition}`,
      params
    );
    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT e.id, e.usuario_id, e.alumno_id, e.respuestas, e.created_at,
              u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
              a.codigo_alumno, ua.nombre AS alumno_nombre, ua.apellido AS alumno_apellido
       FROM formularios_documentales_envios e
       JOIN usuarios u ON u.id = e.usuario_id
       LEFT JOIN alumnos a ON a.id = e.alumno_id
       LEFT JOIN usuarios ua ON ua.id = a.usuario_id
       WHERE e.formulario_id = ? ${condition}
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return sendPaginated(res, submissions, Number(counts[0]?.total || 0), page, limit);
  } catch (error) {
    logError('Error al obtener envíos de formulario:', error);
    return sendError(res, 'Error al obtener envíos de formulario');
  }
}
