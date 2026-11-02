import { finishTransaction } from '../utils/transaction';
import { logError } from '../utils/logger';
import { hasExpectedSignature } from '../utils/documentValidation';
import { uploadDirectory } from '../config/environment';
import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import fs from 'fs/promises';
import path from 'path';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno } from '../utils/profesorAlcance';
import { getPagination } from '../utils/pagination';
import { sendError, sendPaginated, sendSuccess } from '../utils/response';

const UPLOAD_DIRECTORY = uploadDirectory();

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function documentScope(req: AuthRequest, alias = 'd'): { sql: string; params: number[] } | null {
  const userId = req.user!.userId;
  switch (req.user!.rol) {
    case 'administrador':
      return { sql: '1 = 1', params: [] };
    case 'profesor':
      return {
        sql: `(
          ${alias}.usuario_subio = ?
          OR ${alias}.profesor_id = (SELECT p.id FROM profesores p WHERE p.usuario_id = ?)
          OR (
            ${alias}.alumno_id IS NULL AND ${alias}.profesor_id IS NULL
            AND EXISTS (SELECT 1 FROM usuarios admin
              JOIN roles admin_role ON admin_role.id = admin.rol_id
              WHERE admin.id = ${alias}.usuario_subio AND admin_role.nombre = 'administrador')
          )
        )`,
        params: [userId, userId]
      };
    case 'alumno':
      return {
        sql: `(
          EXISTS (SELECT 1 FROM alumnos own WHERE own.id = ${alias}.alumno_id AND own.usuario_id = ?)
          OR (
            ${alias}.alumno_id IS NULL AND ${alias}.profesor_id IS NULL
            AND EXISTS (SELECT 1 FROM usuarios admin
              JOIN roles admin_role ON admin_role.id = admin.rol_id
              WHERE admin.id = ${alias}.usuario_subio AND admin_role.nombre = 'administrador')
          )
        )`,
        params: [userId]
      };
    case 'apoderado':
      return {
        sql: `(
          EXISTS (
            SELECT 1 FROM apoderado_alumno aa
            JOIN apoderados ap ON ap.id = aa.apoderado_id
            WHERE aa.alumno_id = ${alias}.alumno_id AND ap.usuario_id = ?
          )
          OR (
            ${alias}.alumno_id IS NULL AND ${alias}.profesor_id IS NULL
            AND EXISTS (SELECT 1 FROM usuarios admin
              JOIN roles admin_role ON admin_role.id = admin.rol_id
              WHERE admin.id = ${alias}.usuario_subio AND admin_role.nombre = 'administrador')
          )
        )`,
        params: [userId]
      };
    default:
      return null;
  }
}

function resolveFilePath(fileUrl: unknown): string | null {
  if (typeof fileUrl !== 'string' || !fileUrl) return null;
  const filename = path.basename(fileUrl);
  if (!filename || filename === '.' || filename === '..') return null;
  const resolved = path.resolve(UPLOAD_DIRECTORY, filename);
  return resolved.startsWith(`${UPLOAD_DIRECTORY}${path.sep}`) ? resolved : null;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function extensionMime(extension: string): { type: string; mime: string } | null {
  const types: Record<string, { type: string; mime: string }> = {
    '.pdf': { type: 'pdf', mime: 'application/pdf' },
    '.jpg': { type: 'imagen', mime: 'image/jpeg' },
    '.jpeg': { type: 'imagen', mime: 'image/jpeg' },
    '.png': { type: 'imagen', mime: 'image/png' },
    '.gif': { type: 'imagen', mime: 'image/gif' },
    '.doc': { type: 'documento', mime: 'application/msword' },
    '.docx': { type: 'documento', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  };
  return types[extension] || null;
}

export async function getAllDocumentos(req: AuthRequest, res: Response) {
  const scope = documentScope(req);
  if (!scope) return sendError(res, 'No tiene permisos para consultar documentos', 403);
  try {
    const { page, limit, offset } = getPagination(req.query as { page?: string; limit?: string });
    const conditions = [scope.sql];
    const params: (string | number)[] = [...scope.params];
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      conditions.push('(d.titulo LIKE ? OR d.descripcion LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (req.query.categoria_id) {
      const categoryId = parseId(req.query.categoria_id);
      if (!categoryId) return sendError(res, 'Categoría no válida', 400);
      conditions.push('d.categoria_id = ?');
      params.push(categoryId);
    } else if (typeof req.query.categoria === 'string' && req.query.categoria.trim()) {
      conditions.push('COALESCE(c.nombre, d.categoria) = ?');
      params.push(req.query.categoria.trim());
    }
    if (typeof req.query.estado === 'string' && req.query.estado) {
      conditions.push('d.estado = ?');
      params.push(req.query.estado);
    } else {
      conditions.push("d.estado <> 'archivado'");
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM documentos d
       LEFT JOIN documento_categorias c ON c.id = d.categoria_id
       ${where}`,
      params
    );
    const [documents] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.titulo, d.descripcion, d.tipo_archivo, d.tamano_bytes,
              COALESCE(c.nombre, d.categoria) AS categoria, d.categoria_id,
              d.subcategoria, d.alumno_id, d.profesor_id, d.usuario_subio,
              d.obligatorio, d.fecha_vencimiento, d.estado, d.created_at,
              ua.nombre AS subido_por_nombre, ua.apellido AS subido_por_apellido,
              CASE WHEN d.alumno_id IS NOT NULL THEN CONCAT(ua2.nombre, ' ', ua2.apellido) ELSE NULL END AS alumno_nombre
       FROM documentos d
       LEFT JOIN documento_categorias c ON c.id = d.categoria_id
       JOIN usuarios ua ON d.usuario_subio = ua.id
       LEFT JOIN alumnos a ON d.alumno_id = a.id
       LEFT JOIN usuarios ua2 ON a.usuario_id = ua2.id
       ${where}
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return sendPaginated(res, documents, Number(countResult[0]?.total || 0), page, limit);
  } catch (error) {
    logError('Error al obtener documentos:', error);
    return sendError(res, 'Error al obtener documentos');
  }
}

export async function getDocumentoById(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  const scope = documentScope(req);
  if (!id) return sendError(res, 'Identificador de documento no válido', 400);
  if (!scope) return sendError(res, 'No tiene permisos para consultar documentos', 403);
  try {
    const [documents] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.titulo, d.descripcion, d.tipo_archivo, d.tamano_bytes,
              COALESCE(c.nombre, d.categoria) AS categoria, d.categoria_id,
              d.subcategoria, d.alumno_id, d.profesor_id, d.usuario_subio,
              d.obligatorio, d.fecha_vencimiento, d.estado, d.created_at,
              d.updated_at, ua.nombre AS subido_por_nombre, ua.apellido AS subido_por_apellido
       FROM documentos d
       LEFT JOIN documento_categorias c ON c.id = d.categoria_id
       JOIN usuarios ua ON ua.id = d.usuario_subio
       WHERE d.id = ? AND ${scope.sql}`,
      [id, ...scope.params]
    );
    if (!documents.length) return sendError(res, 'Documento no encontrado', 404);

    const [history] = await pool.query<RowDataPacket[]>(
      `SELECT dh.id, dh.accion, dh.detalles, dh.created_at, u.nombre, u.apellido
       FROM documentos_historial dh
       JOIN usuarios u ON u.id = dh.usuario_id
       WHERE dh.documento_id = ?
       ORDER BY dh.created_at DESC`,
      [id]
    );
    return sendSuccess(res, { ...documents[0], historial: history });
  } catch (error) {
    logError('Error al obtener documento:', error);
    return sendError(res, 'Error al obtener documento');
  }
}

export async function downloadDocumento(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  const scope = documentScope(req);
  if (!id) return sendError(res, 'Identificador de documento no válido', 400);
  if (!scope) return sendError(res, 'No tiene permisos para descargar documentos', 403);
  try {
    const [documents] = await pool.query<RowDataPacket[]>(
      `SELECT d.archivo_url, d.titulo, d.estado
       FROM documentos d WHERE d.id = ? AND ${scope.sql}`,
      [id, ...scope.params]
    );
    const document = documents[0];
    if (!document || document.estado === 'archivado') return sendError(res, 'Documento no encontrado', 404);
    const filePath = resolveFilePath(document.archivo_url);
    if (!filePath) return sendError(res, 'El archivo del documento no está disponible', 404);
    await fs.access(filePath);
    const safeTitle = String(document.titulo || 'documento').replace(/[^\p{L}\p{N}._ -]/gu, '_');
    const extension = path.extname(filePath);
    return res.download(filePath, `${safeTitle}${extension}`, error => {
      if (error && !res.headersSent) {
        logError('Error al enviar archivo documental:', error);
        sendError(res, 'No se pudo descargar el documento');
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return sendError(res, 'El archivo del documento no está disponible', 404);
    }
    logError('Error al descargar documento:', error);
    return sendError(res, 'No se pudo descargar el documento');
  }
}

export async function uploadDocumento(req: AuthRequest, res: Response) {
  if (!req.file) return sendError(res, 'Archivo requerido', 400);
  const title = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
  const description = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const categoryId = req.body.categoria_id ? parseId(req.body.categoria_id) : null;
  const filename = path.basename(req.file.originalname).slice(0, 255);
  const extension = path.extname(filename).toLowerCase();
  const fileType = extensionMime(extension);
  if (!title || title.length > 255 || description.length > 5000
    || !filename || filename.length === 0 || !fileType
    || fileType.mime !== req.file.mimetype
    || (req.body.obligatorio !== undefined && !['true', 'false'].includes(req.body.obligatorio))
    || (req.body.fecha_vencimiento && !validDate(req.body.fecha_vencimiento))
    || (req.body.alumno_id && req.user?.rol !== 'administrador')) {
    await fs.unlink(req.file.path).catch(() => undefined);
    return sendError(res, 'Los datos del documento o el archivo no son válidos', 400);
  }
  try {
    if (!(await hasExpectedSignature(req.file.path, extension))) {
      await fs.unlink(req.file.path).catch(() => undefined);
      return sendError(res, 'El contenido del archivo no coincide con el tipo declarado', 400);
    }
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => undefined);
    logError('No se pudo validar el contenido del archivo:', error);
    return sendError(res, 'No se pudo validar el archivo subido');
  }

  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    if (categoryId) {
      const [categories] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM documento_categorias WHERE id = ? AND estado = 'activa' FOR UPDATE",
        [categoryId]
      );
      if (!categories.length) {
        await connection.rollback();
        await fs.unlink(req.file.path).catch(() => undefined);
        return sendError(res, 'Seleccione una categoría activa', 400);
      }
    }

    let assignedTeacherId: number | null = null;
    if (req.user?.rol === 'profesor') {
      const [teachers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM profesores WHERE usuario_id = ?',
        [req.user.userId]
      );
      if (!teachers.length) {
        await connection.rollback();
        await fs.unlink(req.file.path).catch(() => undefined);
        return sendError(res, 'Perfil de profesor no encontrado', 404);
      }
      assignedTeacherId = teachers[0].id;
    } else if (req.body.profesor_id) {
      assignedTeacherId = parseId(req.body.profesor_id);
      if (!assignedTeacherId) {
        await connection.rollback();
        await fs.unlink(req.file.path).catch(() => undefined);
        return sendError(res, 'Profesor no válido', 400);
      }
    }

    const studentId = req.body.alumno_id ? parseId(req.body.alumno_id) : null;
    if (req.body.alumno_id && !studentId) {
      await connection.rollback();
      await fs.unlink(req.file.path).catch(() => undefined);
      return sendError(res, 'Alumno no válido', 400);
    }
    if (studentId && req.user?.rol === 'profesor' && !(await profesorTieneAccesoAlumno(pool, req.user.userId, studentId))) {
      await connection.rollback(); await fs.unlink(req.file.path).catch(() => undefined);
      return sendError(res, 'Alumno fuera de su asignación', 403);
    }
    if (studentId) {
      const [students] = await connection.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ?', [studentId]);
      if (!students.length) {
        await connection.rollback();
        await fs.unlink(req.file.path).catch(() => undefined);
        return sendError(res, 'Alumno no encontrado', 404);
      }
    }
    const legacyCategory = categoryId
      ? (await connection.query<RowDataPacket[]>(
        'SELECT nombre FROM documento_categorias WHERE id = ?',
        [categoryId]
      ))[0][0]?.nombre || null
      : null;
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO documentos
        (titulo, descripcion, archivo_url, tipo_archivo, tamano_bytes,
         categoria, categoria_id, subcategoria, alumno_id, profesor_id,
         usuario_subio, obligatorio, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description || null, `/uploads/${req.file.filename}`, fileType.type,
        req.file.size, legacyCategory, categoryId, req.body.subcategoria || null,
        studentId, assignedTeacherId, req.user!.userId,
        req.body.obligatorio === 'true' ? 1 : 0,
        req.body.fecha_vencimiento || null
      ]
    );
    await connection.query(
      `INSERT INTO documentos_historial (documento_id, usuario_id, accion, detalles)
       VALUES (?, ?, 'subida', ?)`,
      [result.insertId, req.user!.userId, JSON.stringify({ filename })]
    );
    await connection.commit();
    return sendSuccess(res, {
      id: result.insertId,
      archivo_url: `/api/documentos/${result.insertId}/archivo`
    }, 'Documento subido exitosamente', 201);
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(rollbackError => {
        logError('No se pudo revertir la transacción de carga:', rollbackError);
      });
    }
    await fs.unlink(req.file.path).catch(unlinkError => {
      logError('No se pudo limpiar el archivo subido tras fallar la operación:', unlinkError);
    });
    logError('Error al subir documento:', error);
    return sendError(res, 'Error al subir documento');
  } finally {
    connection?.release();
  }
}

export async function updateDocumento(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de documento no válido', 400);
  if (!['administrador', 'profesor'].includes(req.user!.rol)) {
    return sendError(res, 'No tiene permisos para modificar documentos', 403);
  }
  const title = req.body.titulo === undefined ? null : String(req.body.titulo).trim();
  const description = req.body.descripcion === undefined ? null : String(req.body.descripcion).trim();
  if ((title !== null && (!title || title.length > 255))
    || (description !== null && description.length > 5000)) {
    return sendError(res, 'Título o descripción no válidos', 400);
  }
  const categoryId = req.body.categoria_id === undefined
    ? undefined
    : req.body.categoria_id === null || req.body.categoria_id === ''
      ? null
      : parseId(req.body.categoria_id);
  if (categoryId === null && req.body.categoria_id && req.body.categoria_id !== '') {
    return sendError(res, 'Categoría no válida', 400);
  }
  try {
    const scope = req.user?.rol === 'profesor' ? {sql:'(d.usuario_subio = ? OR d.profesor_id = (SELECT id FROM profesores WHERE usuario_id = ?))',params:[req.user.userId,req.user.userId]} : documentScope(req);
    const category = categoryId
      ? (await pool.query<RowDataPacket[]>(
        "SELECT id, nombre FROM documento_categorias WHERE id = ? AND estado = 'activa'",
        [categoryId]
      ))[0][0]
      : null;
    if (categoryId && !category) return sendError(res, 'Seleccione una categoría activa', 400);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE documentos d
       SET d.titulo = COALESCE(?, d.titulo),
           d.descripcion = COALESCE(?, d.descripcion),
           d.categoria_id = COALESCE(?, d.categoria_id),
           d.categoria = COALESCE(?, d.categoria)
       WHERE d.id = ? AND (${scope!.sql})`,
      [title, description, categoryId === undefined ? null : categoryId,
        category?.nombre ?? null, id, ...scope!.params]
    );
    if (result.affectedRows === 0) return sendError(res, 'Documento no encontrado', 404);
    return sendSuccess(res, null, 'Documento actualizado');
  } catch (error) {
    logError('Error al actualizar documento:', error);
    return sendError(res, 'Error al actualizar documento');
  }
}

export async function deleteDocumento(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de documento no válido', 400);
  if (req.user?.rol !== 'administrador') return sendError(res, 'No tiene permisos para eliminar documentos', 403);
  let connection: import('mysql2/promise').PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [documents] = await connection.query<RowDataPacket[]>(
      'SELECT id, archivo_url, estado FROM documentos WHERE id = ? FOR UPDATE', [id]);
    if (!documents.length) return sendError(res, 'Documento no encontrado', 404);
    if (documents[0].estado === 'archivado') return sendError(res, 'El documento ya está archivado', 409);
    // Conservar archivo y referencia: aún no existe política institucional de purga.
    await connection.query("UPDATE documentos SET estado = 'archivado' WHERE id = ?", [id]);
    await connection.query(
      `INSERT INTO documentos_historial (documento_id, usuario_id, accion, detalles)
       VALUES (?, ?, 'archivado', ?)`, [id, req.user.userId, JSON.stringify({archivo_conservado:true})]);
    await connection.commit();committed = true;
    return sendSuccess(res, null, 'Documento archivado; archivo e historial conservados');
  } catch (error) {
    logError('Error al archivar documento:', error);
    return sendError(res, 'Error al archivar documento');
  } finally {await finishTransaction(connection,committed);}
}

export async function getDocumentosPendientes(req: AuthRequest, res: Response) {
  const scope = documentScope(req);
  if (!scope) return sendError(res, 'No tiene permisos para consultar documentos', 403);
  try {
    const [documents] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.titulo, d.fecha_vencimiento, d.alumno_id,
              ua.nombre AS alumno_nombre, ua.apellido AS alumno_apellido
       FROM documentos d
       LEFT JOIN alumnos a ON d.alumno_id = a.id
       LEFT JOIN usuarios ua ON ua.id = a.usuario_id
       WHERE d.obligatorio = 1 AND d.estado = 'pendiente' AND ${scope.sql}
       ORDER BY d.fecha_vencimiento ASC, d.id`,
      scope.params
    );
    return sendSuccess(res, documents);
  } catch (error) {
    logError('Error al obtener documentos pendientes:', error);
    return sendError(res, 'Error al obtener documentos pendientes');
  }
}
