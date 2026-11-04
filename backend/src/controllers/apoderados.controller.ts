import { accountFailure } from '../utils/accountErrors';
import { logError } from '../utils/logger';
import { PoolConnection } from 'mysql2/promise';
import { finishTransaction } from '../utils/transaction';
import { accountError } from '../utils/accountValidation';
import { positiveId } from '../utils/academicValidation';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../types';
import { createInstitutionalCredentials } from '../utils/credentials';
import { encryptPasswordAsync } from '../utils/encrypt';

export async function getMisAlumnos(req: AuthRequest, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT al.id, al.codigo_alumno, u.nombre, u.apellido,
              (SELECT GROUP_CONCAT(DISTINCT g.nombre ORDER BY g.nombre SEPARATOR ', ') FROM matriculas m JOIN periodos_academicos pa ON pa.id=m.periodo_academico_id AND pa.activo=1 LEFT JOIN cursos cu ON cu.id=m.curso_id LEFT JOIN grados g ON g.id=COALESCE(m.grado_id,cu.grado_id) WHERE m.alumno_id=al.id AND m.estado='activa') as grado, al.estado, aa.parentesco
       FROM apoderado_alumno aa
       JOIN apoderados ap ON ap.id = aa.apoderado_id
       JOIN alumnos al ON al.id = aa.alumno_id
       JOIN usuarios u ON u.id = al.usuario_id
       WHERE ap.usuario_id = ?
       ORDER BY u.apellido, u.nombre`,
      [req.user!.userId]
    );

    return sendSuccess(res, alumnos);
  } catch (error) {
    return sendError(res, 'Error al obtener los alumnos vinculados');
  }
}

export async function getAllApoderados(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      // También permite encontrar al apoderado escribiendo el nombre de uno de sus alumnos.
      whereClause = `WHERE u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?
        OR EXISTS (SELECT 1 FROM apoderado_alumno sa JOIN alumnos sal ON sal.id = sa.alumno_id
          JOIN usuarios su ON su.id = sal.usuario_id
          WHERE sa.apoderado_id = a.id AND CONCAT(su.nombre, ' ', su.apellido) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM apoderados a JOIN usuarios u ON a.usuario_id = u.id ${whereClause}`,
      params
    );

    const [apoderados] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.usuario_id, a.ocupacion, u.nombre, u.apellido, u.email, 
              u.dni, u.telefono, u.direccion, u.foto_url, u.activo,
              -- Corrección: el listado no incluía los alumnos vinculados; solo se veían al abrir el modal.
              (SELECT GROUP_CONCAT(CONCAT(ua.nombre, ' ', ua.apellido) ORDER BY ua.apellido, ua.nombre SEPARATOR ', ')
                 FROM apoderado_alumno aa
                 JOIN alumnos al ON al.id = aa.alumno_id
                 JOIN usuarios ua ON ua.id = al.usuario_id
                WHERE aa.apoderado_id = a.id) AS alumnos_vinculados,
              (SELECT COUNT(*) FROM apoderado_alumno aa WHERE aa.apoderado_id = a.id) AS total_alumnos
       FROM apoderados a
       JOIN usuarios u ON a.usuario_id = u.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, apoderados, countResult[0].total, page, limit);
  } catch (error) {
    logError('Error al obtener apoderados:', error);
    return sendError(res, 'Error al obtener apoderados');
  }
}

export async function getApoderadoById(req: Request, res: Response) {
  try {
    const [apoderados] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.nombre, u.apellido, u.email, u.dni, u.telefono, 
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url
       FROM apoderados a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (apoderados.length === 0) {
      return sendError(res, 'Apoderado no encontrado', 404);
    }

    // Obtener alumnos asignados a este apoderado
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT aa.parentesco, al.id as alumno_id, al.codigo_alumno,
              u.nombre as alumno_nombre, u.apellido as alumno_apellido,
              g.nombre as grado
       FROM apoderado_alumno aa
       JOIN alumnos al ON aa.alumno_id = al.id
       JOIN usuarios u ON al.usuario_id = u.id
       LEFT JOIN grados g ON al.grado_id = g.id
       WHERE aa.apoderado_id = ?`,
      [req.params.id]
    );

    return sendSuccess(res, { ...apoderados[0], alumnos });
  } catch (error) {
    return sendError(res, 'Error al obtener apoderado');
  }
}

export async function createApoderado(req: Request, res: Response) {
  const validation = accountError(req.body,true,true);
  if(validation)return sendError(res,validation,400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, ocupacion } = req.body;

    const { email, temporaryPassword } = await createInstitutionalCredentials(connection, 'apoderado', nombre, apellido);
    const passwordHash = await encryptPasswordAsync(temporaryPassword);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, debe_cambiar_password, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 4)`,
      [email, passwordHash, nombre, apellido, dni || null, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro']
    );

    const [apoderadoResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO apoderados (usuario_id, ocupacion)
       VALUES (?, ?)`,
      [userResult.insertId, ocupacion || null]
    );

    await connection.commit(); committed = true;

    return sendSuccess(res, {
      id: apoderadoResult.insertId,
      usuario_id: userResult.insertId,
      credentials: { email, temporaryPassword, mustChangePassword: true, mailboxCreated: false }
    }, 'Apoderado registrado exitosamente', 201);
  } catch (error) {
    return accountFailure(res,error,'Error al registrar apoderado');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function updateApoderado(req: Request, res: Response) {
  const validation = accountError(req.body,false);
  if(validation)return sendError(res,validation,400);
  if(!positiveId(req.params.id))return sendError(res,'ID inválido',400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [current] = await connection.query<RowDataPacket[]>('SELECT id FROM apoderados WHERE id = ? FOR UPDATE',[req.params.id]);
    if(!current.length)return sendError(res,'Apoderado no encontrado',404);

    const { ocupacion, telefono, direccion, fecha_nacimiento, genero } = req.body;

    // Actualizar datos del apoderado
    await connection.query(
      `UPDATE apoderados SET ocupacion = COALESCE(?, ocupacion)
       WHERE id = ?`,
      [ocupacion, req.params.id]
    );

    // Actualizar datos del usuario si se proporcionan
    if (telefono !== undefined || direccion !== undefined || fecha_nacimiento !== undefined || genero !== undefined) {
      await connection.query(
        `UPDATE usuarios SET
         telefono = COALESCE(NULLIF(?, ''), telefono),
         direccion = COALESCE(NULLIF(?, ''), direccion),
         fecha_nacimiento = COALESCE(NULLIF(?, ''), fecha_nacimiento),
         genero = COALESCE(NULLIF(?, ''), genero)
         WHERE id = (SELECT usuario_id FROM apoderados WHERE id = ?)`,
        [telefono, direccion, fecha_nacimiento, genero, req.params.id]
      );
    }

    await connection.commit(); committed = true;

    return sendSuccess(res, null, 'Apoderado actualizado exitosamente');
  } catch (error) {
    return accountFailure(res,error,'Error al actualizar apoderado');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function deleteApoderado(req: Request, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'ID inválido', 400);
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [current] = await connection.query<RowDataPacket[]>('SELECT id, usuario_id FROM apoderados WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!current.length) return sendError(res, 'Apoderado no encontrado', 404);
    // Seguridad: antes se borraba el perfil pero la cuenta de usuario seguía activa y podía iniciar sesión.
    // Ahora se desactiva la cuenta en la misma transacción (los vínculos se eliminan por ON DELETE CASCADE).
    await connection.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [current[0].usuario_id]);
    await connection.query('DELETE FROM apoderados WHERE id = ?', [req.params.id]);
    await connection.commit(); committed = true;
    return sendSuccess(res, null, 'Apoderado eliminado y cuenta desactivada');
  } catch (error) {
    logError('Error al eliminar apoderado:', error);
    return sendError(res, 'Error al eliminar apoderado');
  } finally {
    await finishTransaction(connection, committed);
  }
}

export async function asignarAlumno(req: Request, res: Response) {
  try {
    const { alumno_id, parentesco } = req.body;
    // Validación: IDs enteros, parentesco acotado a VARCHAR(50) y existencia de ambas entidades
    // (antes un ID inexistente provocaba un error 500 por clave foránea).
    if (!positiveId(req.params.id) || !positiveId(alumno_id)) return sendError(res, 'Apoderado o alumno inválido', 400);
    if (parentesco !== undefined && parentesco !== null && parentesco !== '' && (typeof parentesco !== 'string' || parentesco.trim().length > 50)) {
      return sendError(res, 'Parentesco inválido (máximo 50 caracteres)', 400);
    }
    const [apoderado] = await pool.query<RowDataPacket[]>('SELECT id FROM apoderados WHERE id = ?', [req.params.id]);
    if (!apoderado.length) return sendError(res, 'Apoderado no encontrado', 404);
    const [alumno] = await pool.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ?', [alumno_id]);
    if (!alumno.length) return sendError(res, 'Alumno no encontrado', 404);

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM apoderado_alumno WHERE apoderado_id = ? AND alumno_id = ?',
      [req.params.id, alumno_id]
    );

    if (existing.length > 0) {
      return sendError(res, 'El alumno ya está asignado a este apoderado', 409);
    }

    await pool.query(
      'INSERT INTO apoderado_alumno (apoderado_id, alumno_id, parentesco) VALUES (?, ?, ?)',
      [req.params.id, alumno_id, (typeof parentesco === 'string' && parentesco.trim()) || 'Padre/Madre']
    );

    return sendSuccess(res, null, 'Alumno asignado exitosamente', 201);
  } catch (error) {
    // Dos solicitudes simultáneas: la clave única evita el duplicado; se informa como conflicto.
    if ((error as any)?.code === 'ER_DUP_ENTRY') return sendError(res, 'El alumno ya está asignado a este apoderado', 409);
    logError('Error al asignar alumno:', error);
    return sendError(res, 'Error al asignar alumno');
  }
}

export async function removerAlumno(req: Request, res: Response) {
  if (!positiveId(req.params.id) || !positiveId(req.params.alumnoId)) return sendError(res, 'Apoderado o alumno inválido', 400);
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM apoderado_alumno WHERE apoderado_id = ? AND alumno_id = ?',
      [req.params.id, req.params.alumnoId]
    );
    // Corrección: antes respondía éxito aunque el vínculo no existiera.
    if (!result.affectedRows) return sendError(res, 'El alumno no está asignado a este apoderado', 404);

    return sendSuccess(res, null, 'Alumno removido exitosamente');
  } catch (error) {
    return sendError(res, 'Error al remover alumno');
  }
}

export async function getAlumnosByApoderado(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT al.id, al.codigo_alumno, u.nombre, u.apellido, 
              g.nombre as grado, al.estado,
              aa.parentesco
       FROM apoderado_alumno aa
       JOIN alumnos al ON aa.alumno_id = al.id
       JOIN usuarios u ON al.usuario_id = u.id
       LEFT JOIN grados g ON al.grado_id = g.id
       WHERE aa.apoderado_id = ?
       ORDER BY u.apellido, u.nombre`,
      [req.params.id]
    );

    return sendSuccess(res, alumnos);
  } catch (error) {
    return sendError(res, 'Error al obtener alumnos del apoderado');
  }
}