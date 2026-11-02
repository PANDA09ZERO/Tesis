import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendError, sendSuccess } from '../utils/response';

function normalizedName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 100) return null;
  return name.toLocaleLowerCase('es');
}

export async function getDocumentoCategorias(req: AuthRequest, res: Response) {
  try {
    const includeArchived = req.user?.rol === 'administrador'
      && req.query.incluir_archivadas === 'true';
    const [categories] = await pool.query<RowDataPacket[]>(
      `SELECT id, nombre, estado, created_at, updated_at
       FROM documento_categorias
       ${includeArchived ? '' : "WHERE estado = 'activa'"}
       ORDER BY nombre`
    );
    return sendSuccess(res, categories);
  } catch (error) {
    logError('Error al obtener categorías de documentos:', error);
    return sendError(res, 'Error al obtener categorías de documentos');
  }
}

export async function createDocumentoCategoria(req: AuthRequest, res: Response) {
  const nombre = typeof req.body.nombre === 'string'
    ? req.body.nombre.trim().replace(/\s+/g, ' ')
    : '';
  const normalized = normalizedName(nombre);
  if (!normalized) return sendError(res, 'El nombre debe tener entre 1 y 100 caracteres', 400);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO documento_categorias (nombre, nombre_normalizado, creado_por)
       VALUES (?, ?, ?)`,
      [nombre, normalized, req.user!.userId]
    );
    return sendSuccess(res, { id: result.insertId, nombre, estado: 'activa' }, 'Categoría creada', 201);
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return sendError(res, 'Ya existe una categoría con ese nombre', 409);
    }
    logError('Error al crear categoría de documentos:', error);
    return sendError(res, 'Error al crear categoría de documentos');
  }
}

export async function updateDocumentoCategoria(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return sendError(res, 'Identificador de categoría no válido', 400);
  }

  const state = req.body.estado;
  const hasName = req.body.nombre !== undefined;
  const nombre = typeof req.body.nombre === 'string'
    ? req.body.nombre.trim().replace(/\s+/g, ' ')
    : '';
  const normalized = hasName ? normalizedName(nombre) : null;
  if (hasName && !normalized) return sendError(res, 'El nombre debe tener entre 1 y 100 caracteres', 400);
  if (!hasName && state !== 'archivada') {
    return sendError(res, 'Indique un nuevo nombre o archive la categoría', 400);
  }
  if (state !== undefined && state !== 'activa' && state !== 'archivada') {
    return sendError(res, 'Estado de categoría no válido', 400);
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE documento_categorias
       SET nombre = COALESCE(?, nombre),
           nombre_normalizado = COALESCE(?, nombre_normalizado),
           estado = COALESCE(?, estado)
       WHERE id = ?`,
      [hasName ? nombre : null, normalized, state || null, categoryId]
    );
    if (result.affectedRows === 0) return sendError(res, 'Categoría no encontrada', 404);
    return sendSuccess(res, null, state === 'archivada' ? 'Categoría archivada' : 'Categoría actualizada');
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return sendError(res, 'Ya existe una categoría con ese nombre', 409);
    }
    logError('Error al actualizar categoría de documentos:', error);
    return sendError(res, 'Error al actualizar categoría de documentos');
  }
}
