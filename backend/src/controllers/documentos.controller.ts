import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import fs from 'fs';
import path from 'path';

export async function getAllDocumentos(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';
    const categoria = req.query.categoria as string;
    const alumnoId = req.query.alumno_id as string;
    const estado = req.query.estado as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (d.titulo LIKE ? OR d.descripcion LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoria) { whereClause += ' AND d.categoria = ?'; params.push(categoria); }
    if (alumnoId) { whereClause += ' AND d.alumno_id = ?'; params.push(alumnoId); }
    if (estado) { whereClause += ' AND d.estado = ?'; params.push(estado); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM documentos d ${whereClause}`, params
    );

    const [documentos] = await pool.query<RowDataPacket[]>(
      `SELECT d.*, 
              ua.nombre as subido_por_nombre, ua.apellido as subido_por_apellido,
              CASE WHEN d.alumno_id IS NOT NULL THEN CONCAT(ua2.nombre, ' ', ua2.apellido) ELSE NULL END as alumno_nombre
       FROM documentos d
       JOIN usuarios ua ON d.usuario_subio = ua.id
       LEFT JOIN alumnos a ON d.alumno_id = a.id
       LEFT JOIN usuarios ua2 ON a.usuario_id = ua2.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, documentos, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener documentos');
  }
}

export async function getDocumentoById(req: Request, res: Response) {
  try {
    const [docs] = await pool.query<RowDataPacket[]>(
      `SELECT d.*, ua.nombre as subido_por_nombre, ua.apellido as subido_por_apellido
       FROM documentos d
       JOIN usuarios ua ON d.usuario_subio = ua.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (docs.length === 0) {
      return sendError(res, 'Documento no encontrado', 404);
    }

    const [historial] = await pool.query<RowDataPacket[]>(
      `SELECT dh.*, u.nombre, u.apellido
       FROM documentos_historial dh
       JOIN usuarios u ON dh.usuario_id = u.id
       WHERE dh.documento_id = ?
       ORDER BY dh.created_at DESC`,
      [req.params.id]
    );

    return sendSuccess(res, { ...docs[0], historial });
  } catch (error) {
    return sendError(res, 'Error al obtener documento');
  }
}

export async function uploadDocumento(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return sendError(res, 'Archivo requerido', 400);
    }

    const { titulo, descripcion, categoria, subcategoria, alumno_id, profesor_id, obligatorio, fecha_vencimiento } = req.body;

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    let tipoArchivo: string = 'otro';
    if (ext === 'pdf') tipoArchivo = 'pdf';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) tipoArchivo = 'imagen';
    else if (['doc', 'docx'].includes(ext)) tipoArchivo = 'documento';

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO documentos (titulo, descripcion, archivo_url, tipo_archivo, tamano_bytes,
       categoria, subcategoria, alumno_id, profesor_id, usuario_subio, obligatorio, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion || null, `/uploads/${req.file.filename}`, tipoArchivo,
       req.file.size, categoria || null, subcategoria || null,
       alumno_id || null, profesor_id || null, req.user!.userId,
       obligatorio === 'true' ? 1 : 0, fecha_vencimiento || null]
    );

    await pool.query(
      `INSERT INTO documentos_historial (documento_id, usuario_id, accion, detalles)
       VALUES (?, ?, 'subida', ?)`,
      [result.insertId, req.user!.userId, JSON.stringify({ filename: req.file.originalname })]
    );

    return sendSuccess(res, { id: result.insertId, archivo_url: `/uploads/${req.file.filename}` },
      'Documento subido exitosamente', 201);
  } catch (error) {
    console.error('Error al subir documento:', error);
    return sendError(res, 'Error al subir documento');
  }
}

export async function updateDocumento(req: Request, res: Response) {
  try {
    const { titulo, descripcion, categoria, subcategoria, estado, obligatorio } = req.body;

    await pool.query(
      `UPDATE documentos SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion),
       categoria = COALESCE(?, categoria), subcategoria = COALESCE(?, subcategoria),
       estado = COALESCE(?, estado), obligatorio = COALESCE(?, obligatorio)
       WHERE id = ?`,
      [titulo, descripcion, categoria, subcategoria, estado, obligatorio, req.params.id]
    );

    return sendSuccess(res, null, 'Documento actualizado');
  } catch (error) {
    return sendError(res, 'Error al actualizar documento');
  }
}

export async function deleteDocumento(req: Request, res: Response) {
  try {
    const [docs] = await pool.query<RowDataPacket[]>(
      'SELECT archivo_url FROM documentos WHERE id = ?', [req.params.id]
    );

    if (docs.length > 0) {
      const filePath = path.join(__dirname, '..', '..', docs[0].archivo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM documentos WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Documento eliminado');
  } catch (error) {
    return sendError(res, 'Error al eliminar documento');
  }
}

export async function getDocumentosPendientes(req: Request, res: Response) {
  try {
    const [docs] = await pool.query<RowDataPacket[]>(
      `SELECT d.*, ua.nombre as alumno_nombre, ua.apellido as alumno_apellido
       FROM documentos d
       LEFT JOIN alumnos a ON d.alumno_id = a.id
       LEFT JOIN usuarios ua ON a.usuario_id = ua.id
       WHERE d.obligatorio = 1 AND d.estado = 'pendiente'
       ORDER BY d.fecha_vencimiento ASC`
    );

    return sendSuccess(res, docs);
  } catch (error) {
    return sendError(res, 'Error al obtener documentos pendientes');
  }
}
