import { accountFailure } from '../utils/accountErrors';
import { logError } from '../utils/logger';
import { accountError } from '../utils/accountValidation';
import { positiveId } from '../utils/academicValidation';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { encryptPasswordAsync } from '../utils/encrypt';
import { createInstitutionalCredentials, generateStudentCode, type AccountRole } from '../utils/credentials';
import { PoolConnection } from 'mysql2/promise';
import { finishTransaction } from '../utils/transaction';

export async function getAllUsers(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = req.query.search as string || '';
    const rol = req.query.rol as string;

    let whereClause = "WHERE r.nombre <> 'superadministrador'";
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
    logError('Error al obtener usuarios:', error);
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
       WHERE u.id = ? AND r.nombre <> 'superadministrador'`,
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
  const validation=accountError(req.body,true,true);if(validation)return sendError(res,validation,400);
  if(![1,2,3,4].includes(Number(req.body.rol_id))||!positiveId(req.body.rol_id))return sendError(res,'Rol inválido',400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    const { nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, rol_id } = req.body;

    const roleById: Record<number, AccountRole> = { 1: 'administrador', 2: 'profesor', 3: 'alumno', 4: 'apoderado' };
    const role = roleById[Number(rol_id)];
    const codigo = role === 'alumno' ? generateStudentCode() : undefined;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const { email, temporaryPassword } = await createInstitutionalCredentials(connection, role, nombre, apellido);
    const passwordEncrypted = await encryptPasswordAsync(temporaryPassword);
    const [result] = await connection.query<ResultSetHeader & { insertId: number }>(
      `INSERT INTO usuarios (email, password_hash, debe_cambiar_password, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordEncrypted, nombre, apellido, dni || null, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro', rol_id]
    );

    if (role === 'alumno') {
      await connection.query('INSERT INTO alumnos (usuario_id, codigo_alumno) VALUES (?, ?)', [result.insertId, codigo]);
    } else if (role === 'profesor') {
      await connection.query('INSERT INTO profesores (usuario_id) VALUES (?)', [result.insertId]);
    } else if (role === 'apoderado') {
      await connection.query('INSERT INTO apoderados (usuario_id) VALUES (?)', [result.insertId]);
    }

    await connection.commit();
    committed = true;
    return sendSuccess(res, {
      id: result.insertId,
      usuario_id: result.insertId,
      ...(codigo ? { codigo_alumno: codigo } : {}),
      credentials: { email, temporaryPassword, mustChangePassword: true, mailboxCreated: false }
    }, 'Usuario creado. Comparta estas credenciales de forma segura; la contraseña se cambiará al primer ingreso', 201);
  } catch (error) {
    return accountFailure(res,error,'Error al crear usuario');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function updateUser(req: Request, res: Response) {
  const validation=accountError(req.body,false);if(validation)return sendError(res,validation,400);
  if(!positiveId(req.params.id))return sendError(res,'ID inválido',400);
  try {
    const { nombre, apellido, dni, telefono, direccion, fecha_nacimiento, genero, activo, password } = req.body;
    const userId = req.params.id;

    const updateFields: any[] = [];
    const updateValues: any[] = [];

    if (nombre !== undefined) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (apellido !== undefined) { updateFields.push('apellido = ?'); updateValues.push(apellido); }
    if (dni !== undefined) { updateFields.push('dni = ?'); updateValues.push(dni); }
    if (telefono !== undefined) { updateFields.push('telefono = ?'); updateValues.push(telefono); }
    if (direccion !== undefined) { updateFields.push('direccion = ?'); updateValues.push(direccion); }
    if (fecha_nacimiento !== undefined) { updateFields.push('fecha_nacimiento = ?'); updateValues.push(fecha_nacimiento); }
    if (genero !== undefined) { updateFields.push('genero = ?'); updateValues.push(genero); }
    if (activo !== undefined) { updateFields.push('activo = ?'); updateValues.push(activo); }
    if (password) {
      updateFields.push('password_hash = ?');
      updateValues.push(await encryptPasswordAsync(password));
      updateFields.push('debe_cambiar_password = 1');
    }

    if(!updateFields.length)return sendError(res,'No hay campos para actualizar',400);
    const [existing]=await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id = ? AND rol_id IN (SELECT id FROM roles WHERE nombre <> \'superadministrador\')' ,[userId]);
    if(!existing.length)return sendError(res,'Usuario no encontrado',404);
    updateValues.push(userId);

    await pool.query(
      `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return sendSuccess(res, null, 'Usuario actualizado exitosamente');
  } catch (error) {
    return accountFailure(res,error,'Error al actualizar usuario');
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    if(!positiveId(req.params.id))return sendError(res,'ID inválido',400);
    const [existing]=await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id=? AND rol_id IN (SELECT id FROM roles WHERE nombre <> \'superadministrador\')' ,[req.params.id]);
    if(!existing.length)return sendError(res,'Usuario no encontrado',404);
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Usuario desactivado exitosamente');
  } catch (error) {
    return sendError(res, 'Error al eliminar usuario');
  }
}
