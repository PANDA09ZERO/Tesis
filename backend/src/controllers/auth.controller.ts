import {suspension,operationBusy,suspendedResponse} from '../utils/operations';
import { logError } from '../utils/logger';
import { accountError } from '../utils/accountValidation';
import { accountFailure } from '../utils/accountErrors';
import { finishTransaction } from '../utils/transaction';
import { credentialVersion } from '../utils/session';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { verifyPasswordAsync, encryptPasswordAsync, needsPasswordRehash } from '../utils/encrypt';
import { createInstitutionalCredentials } from '../utils/credentials';
import { validDate } from '../utils/academicValidation';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 255 || password.length > 1024) {
      return sendError(res, 'Email y contraseña son requeridos', 400);
    }

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = ? AND u.activo = 1`,
      [email.trim()]
    );

    if (users.length === 0) {
      return sendError(res, 'Credenciales inválidas', 401);
    }

    const user = users[0];
    const validPassword = await verifyPasswordAsync(password, user.password_hash);

    if (!validPassword) {
      return sendError(res, 'Credenciales inválidas', 401);
    }

    if(await operationBusy()||((await suspension()).suspended&&user.rol_nombre!=='superadministrador'))return suspendedResponse(res);

    if (needsPasswordRehash(user.password_hash)) {
      const previousHash = user.password_hash;
      user.password_hash = await encryptPasswordAsync(password);
      const [rehash] = await pool.query<ResultSetHeader>('UPDATE usuarios SET password_hash = ? WHERE id = ? AND password_hash = ?', [user.password_hash, user.id, previousHash]);
      if (!rehash.affectedRows) return sendError(res, 'Credenciales inválidas. Intente iniciar sesión nuevamente', 401);
    }

    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

    const userId = (user as any).id;
    const userEmail = (user as any).email;
    const userRol = (user as any).rol_nombre;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpires = process.env.JWT_EXPIRES_IN || '24h';

    if (!jwtSecret) {
      return sendError(res, 'La configuración de autenticación no está disponible', 500);
    }

    // @ts-ignore
    const token = jwt.sign(
      { userId, email: userEmail, rol: userRol, rolSistema: userRol === 'superadministrador' ? 'superadministrador' : undefined, credentialVersion: credentialVersion(user.password_hash, jwtSecret) },
      jwtSecret,
      { expiresIn: jwtExpires }
    ) as string;

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
        rolSistema: user.rol_nombre === 'superadministrador' ? 'superadministrador' : undefined,
        foto_url: user.foto_url,
        debe_cambiar_password: Boolean(user.debe_cambiar_password)
      }
    }, 'Inicio de sesión exitoso');
  } catch (error) {
    logError('Error al procesar login');
    return sendError(res, 'Error al procesar el inicio de sesión');
  }
}

export async function register(req: Request, res: Response) {
  const validation=accountError(req.body,true,true);if(validation)return sendError(res,validation,400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    const { nombre, apellido, dni, ocupacion } = req.body;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const { email, temporaryPassword } = await createInstitutionalCredentials(connection, 'apoderado', nombre, apellido);
    const passwordEncrypted = await encryptPasswordAsync(temporaryPassword);
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, debe_cambiar_password, nombre, apellido, dni, rol_id)
       VALUES (?, ?, 1, ?, ?, ?, 4)`,
      [email, passwordEncrypted, nombre, apellido, dni || null]
    );
    await connection.query<ResultSetHeader>(
      'INSERT INTO apoderados (usuario_id, ocupacion) VALUES (?, ?)',
      [result.insertId, ocupacion || null]
    );
    await connection.commit();
    committed = true;

    return sendSuccess(res, {
      id: result.insertId,
      credentials: { email, temporaryPassword, mustChangePassword: true, mailboxCreated: false }
    }, 'Usuario registrado. Comparta estas credenciales de forma segura; la contraseña se cambiará al primer ingreso', 201);
  } catch (error) {
    return accountFailure(res, error, 'Error al registrar usuario');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.dni, u.telefono, 
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url, 
              r.nombre as rol, u.created_at, u.debe_cambiar_password
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [req.user!.userId]
    );

    if (users.length === 0) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    const user = users[0];
    const profile = {
      ...user,
      debe_cambiar_password: Boolean(user.debe_cambiar_password),
      rolSistema: user.rol === 'superadministrador' ? 'superadministrador' : undefined
    };

    return sendSuccess(res, profile);
  } catch (error) {
    logError('Error al obtener perfil:', error);
    return sendError(res, 'Error al obtener el perfil');
  }
}

export async function updatePersonalProfile(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, 'No autenticado', 401);
  if (req.user.rol === 'superadministrador') {
    return sendError(res, 'Este perfil no permite editar datos personales', 403);
  }
  const body = req.body;
  const allowedFields = ['fecha_nacimiento', 'genero'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !allowedFields.includes(key)) ||
      !Object.keys(body).length) {
    return sendError(res, 'Envía únicamente fecha de nacimiento o género', 400);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'fecha_nacimiento') &&
      body.fecha_nacimiento !== null && body.fecha_nacimiento !== '' &&
      !validDate(body.fecha_nacimiento)) {
    return sendError(res, 'Fecha de nacimiento inválida', 400);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'genero') &&
      !['M', 'F', 'Otro'].includes(body.genero)) {
    return sendError(res, 'Género inválido', 400);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (Object.prototype.hasOwnProperty.call(body, 'fecha_nacimiento')) {
    fields.push('fecha_nacimiento = ?');
    values.push(body.fecha_nacimiento || null);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'genero')) {
    fields.push('genero = ?');
    values.push(body.genero);
  }
  values.push(req.user.userId);

  try {
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    return sendSuccess(res, null, 'Datos personales actualizados');
  } catch (error) {
    logError('Error al actualizar datos personales');
    return sendError(res, 'No se pudieron actualizar tus datos personales');
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return sendError(res, 'Contraseña actual y nueva contraseña requeridas', 400);
    }

    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT password_hash, debe_cambiar_password FROM usuarios WHERE id = ?',
      [req.user!.userId]
    );

    if (!users.length) return sendError(res,'Usuario no encontrado',404);
    const minimumLength = req.user?.rol === 'superadministrador' || Number(users[0].debe_cambiar_password) === 1 ? 12 : 6;
    if (newPassword.length < minimumLength || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return sendError(res, `La nueva contraseña debe tener al menos ${minimumLength} caracteres y como máximo 72 bytes`, 400);
    }
    const valid = await verifyPasswordAsync(currentPassword, users[0].password_hash);
    if (!valid) {
      return sendError(res, 'La contraseña actual es incorrecta', 400);
    }

    const encrypted = await encryptPasswordAsync(newPassword);
    const [changed] = await pool.query<ResultSetHeader>('UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0 WHERE id = ? AND password_hash = ?', [encrypted, req.user!.userId, users[0].password_hash]);
    if (!changed.affectedRows) return sendError(res, 'La contraseña cambió durante la operación. Inicie sesión nuevamente', 409);

    return sendSuccess(res, null, 'Contraseña actualizada. Todas las sesiones se han cerrado');
  } catch (error) {
    logError('Error al cambiar contraseña');
    return sendError(res, 'Error al cambiar la contraseña');
  }
}
