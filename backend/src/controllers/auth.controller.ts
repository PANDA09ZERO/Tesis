import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email y contraseña son requeridos', 400);
    }

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = ? AND u.activo = 1`,
      [email]
    );

    if (users.length === 0) {
      return sendError(res, 'Credenciales inválidas', 401);
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return sendError(res, 'Credenciales inválidas', 401);
    }

    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol_nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    await pool.query(
      `INSERT INTO registro_actividades (usuario_id, accion, entidad, detalles, ip_address)
       VALUES (?, 'login', 'usuarios', ?, ?)`,
      [user.id, JSON.stringify({ email }), req.ip]
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol_nombre,
        foto_url: user.foto_url
      }
    }, 'Inicio de sesión exitoso');
  } catch (error) {
    console.error('Error en login:', error);
    return sendError(res, 'Error al procesar el inicio de sesión');
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, nombre, apellido, dni, rol_id } = req.body;

    if (!email || !password || !nombre || !apellido) {
      return sendError(res, 'Campos obligatorios faltantes', 400);
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return sendError(res, 'El email ya está registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, rol_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, nombre, apellido, dni || null, rol_id || 4]
    );

    return sendSuccess(res, { id: result.insertId }, 'Usuario registrado exitosamente', 201);
  } catch (error) {
    console.error('Error en registro:', error);
    return sendError(res, 'Error al registrar usuario');
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.dni, u.telefono, 
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url, 
              r.nombre as rol, u.created_at
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [req.user!.userId]
    );

    if (users.length === 0) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    return sendSuccess(res, users[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return sendError(res, 'Error al obtener el perfil');
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Contraseña actual y nueva contraseña requeridas', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.user!.userId]
    );

    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) {
      return sendError(res, 'La contraseña actual es incorrecta', 401);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user!.userId]);

    return sendSuccess(res, null, 'Contraseña actualizada exitosamente');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return sendError(res, 'Error al cambiar la contraseña');
  }
}
