import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllUsers(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = req.query.search as string || '';
    const rol = req.query.rol as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (rol) {
      whereClause += ' AND r.nombre = ?';
      params.push(rol);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM usuarios u JOIN roles r ON u.rol_id = r.id ${whereClause}`,
      params
    );

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.dni, u.telefono, 
              u.fecha_nacimiento, u.genero, u.foto_url, r.nombre as rol, 
              u.activo, u.ultimo_acceso, u.created_at
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, users, countResult[0].total, page, limit);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return sendError(res, 'Error al obtener usuarios');
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.dni, u.telefono,
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url,
              r.nombre as rol, u.activo, u.created_at
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    return sendSuccess(res, users[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener usuario');
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, rol_id } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return sendError(res, 'El email ya está registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password || '123456', 12);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, nombre, apellido, dni || null, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro', rol_id]
    );

    return sendSuccess(res, { id: result.insertId }, 'Usuario creado exitosamente', 201);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return sendError(res, 'Error al crear usuario');
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { nombre, apellido, dni, telefono, direccion, fecha_nacimiento, genero, activo } = req.body;
    const userId = req.params.id;

    await pool.query(
      `UPDATE usuarios SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido),
       dni = COALESCE(?, dni), telefono = COALESCE(?, telefono),
       direccion = COALESCE(?, direccion), fecha_nacimiento = COALESCE(?, fecha_nacimiento),
       genero = COALESCE(?, genero), activo = COALESCE(?, activo)
       WHERE id = ?`,
      [nombre, apellido, dni, telefono, direccion, fecha_nacimiento, genero, activo, userId]
    );

    return sendSuccess(res, null, 'Usuario actualizado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al actualizar usuario');
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Usuario desactivado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al eliminar usuario');
  }
}
