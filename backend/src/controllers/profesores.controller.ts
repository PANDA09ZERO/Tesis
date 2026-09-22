import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllProfesores(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause = 'WHERE u.nombre LIKE ? OR u.apellido LIKE ? OR p.especialidad LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM profesores p JOIN usuarios u ON p.usuario_id = u.id ${whereClause}`,
      params
    );

    const [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.usuario_id, u.nombre, u.apellido, u.email, u.dni,
              u.telefono, u.foto_url, p.especialidad, p.fecha_ingreso,
              p.titulo_profesional, u.activo
       FROM profesores p
       JOIN usuarios u ON p.usuario_id = u.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, profesores, countResult[0].total, page, limit);
  } catch (error) {
    return sendError(res, 'Error al obtener profesores');
  }
}

export async function getProfesorById(req: Request, res: Response) {
  try {
    const [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.nombre, u.apellido, u.email, u.dni, u.telefono,
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url
       FROM profesores p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (profesores.length === 0) {
      return sendError(res, 'Profesor no encontrado', 404);
    }

    const [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT cu.nombre, cu.codigo, s.nombre as seccion, g.nombre as grado,
              pa.nombre as periodo, h.dia_semana, h.hora_inicio, h.hora_fin
       FROM horarios h
       JOIN cursos cu ON h.curso_id = cu.id
       JOIN secciones s ON h.seccion_id = s.id
       JOIN grados g ON s.grado_id = g.id
       JOIN periodos_academicos pa ON h.periodo_academico_id = pa.id
       WHERE h.profesor_id = ?
       ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')`,
      [req.params.id]
    );

    // Obtener cursos asignados directamente
    const [cursosAsignados] = await pool.query<RowDataPacket[]>(
      `SELECT cu.id, cu.nombre, cu.codigo
       FROM profesor_curso pc
       JOIN cursos cu ON pc.curso_id = cu.id
       WHERE pc.profesor_id = ?`,
      [req.params.id]
    );

    // Si no hay cursos asignados directamente, obtener cursos de horarios
    let cursosIds = cursosAsignados.map(c => c.id);
    if (cursosIds.length === 0) {
      const [cursosHorarios] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT cu.id, cu.nombre, cu.codigo
         FROM horarios h
         JOIN cursos cu ON h.curso_id = cu.id
         WHERE h.profesor_id = ?`,
        [req.params.id]
      );
      cursosIds = cursosHorarios.map(c => c.id);
    }

    return sendSuccess(res, { ...profesores[0], cursos_asignados: cursos, cursos: cursosIds });
  } catch (error) {
    return sendError(res, 'Error al obtener profesor');
  }
}

export async function createProfesor(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { email, password, nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, especialidad, titulo_profesional, fecha_ingreso, cursos } = req.body;

    const [existing] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return sendError(res, 'El email ya está registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password || '123456', 12);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)`,
      [email, passwordHash, nombre, apellido, dni, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro']
    );

    const [profResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO profesores (usuario_id, especialidad, titulo_profesional, fecha_ingreso)
       VALUES (?, ?, ?, ?)`,
      [userResult.insertId, especialidad || null, titulo_profesional || null, fecha_ingreso || null]
    );

    // Asignar cursos si se proporcionan
    if (cursos && Array.isArray(cursos) && cursos.length > 0) {
      for (const cursoId of cursos) {
        await connection.query(
          'INSERT INTO profesor_curso (profesor_id, curso_id) VALUES (?, ?)',
          [profResult.insertId, cursoId]
        );
      }
    }

    await connection.commit();

    return sendSuccess(res, {
      id: profResult.insertId,
      usuario_id: userResult.insertId
    }, 'Profesor registrado exitosamente', 201);
  } catch (error) {
    await connection.rollback();
    return sendError(res, 'Error al registrar profesor');
  } finally {
    connection.release();
  }
}

export async function updateProfesor(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { especialidad, titulo_profesional, fecha_ingreso, cursos } = req.body;

    await pool.query(
      `UPDATE profesores SET especialidad = COALESCE(?, especialidad),
       titulo_profesional = COALESCE(?, titulo_profesional),
       fecha_ingreso = COALESCE(NULLIF(?, ''), fecha_ingreso)
       WHERE id = ?`,
      [especialidad, titulo_profesional, fecha_ingreso, req.params.id]
    );

    // Actualizar cursos si se proporcionan
    if (cursos !== undefined) {
      // Eliminar asignaciones existentes
      await connection.query(
        'DELETE FROM profesor_curso WHERE profesor_id = ?',
        [req.params.id]
      );

      // Agregar nuevas asignaciones
      if (Array.isArray(cursos) && cursos.length > 0) {
        for (const cursoId of cursos) {
          await connection.query(
            'INSERT INTO profesor_curso (profesor_id, curso_id) VALUES (?, ?)',
            [req.params.id, cursoId]
          );
        }
      }
    }

    await connection.commit();

    return sendSuccess(res, null, 'Profesor actualizado exitosamente');
  } catch (error) {
    await connection.rollback();
    return sendError(res, 'Error al actualizar profesor');
  } finally {
    connection.release();
  }
}

export async function getProfesorAlumnos(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT u.nombre, u.apellido, a.codigo_alumno,
              g.nombre as grado, s.nombre as seccion
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN secciones s ON a.seccion_id = s.id
       JOIN grados g ON s.grado_id = g.id
       JOIN horarios h ON h.seccion_id = a.seccion_id
       WHERE h.profesor_id = ?
       ORDER BY g.nombre, s.nombre, u.apellido`,
      [req.params.id]
    );

    return sendSuccess(res, alumnos);
  } catch (error) {
    return sendError(res, 'Error al obtener alumnos del profesor');
  }
}

export async function getProfesorCursos(req: Request, res: Response) {
  try {
    const [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT cu.id, cu.nombre, cu.codigo
       FROM cursos cu
       JOIN horarios h ON h.curso_id = cu.id
       WHERE h.profesor_id = ?
       ORDER BY cu.nombre`,
      [req.params.id]
    );

    return sendSuccess(res, cursos);
  } catch (error) {
    return sendError(res, 'Error al obtener cursos del profesor');
  }
}
