import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllAlumnos(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';
    const gradoId = req.query.grado_id as string;
    const seccionId = req.query.seccion_id as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR a.codigo_alumno LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (gradoId) { whereClause += ' AND a.grado_id = ?'; params.push(gradoId); }
    if (seccionId) { whereClause += ' AND a.seccion_id = ?'; params.push(seccionId); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM alumnos a JOIN usuarios u ON a.usuario_id = u.id ${whereClause}`,
      params
    );

    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.codigo_alumno, u.nombre, u.apellido, u.email, u.dni,
              u.fecha_nacimiento, u.genero, u.telefono, u.foto_url, u.activo,
              g.nombre as grado, g.nivel, s.nombre as seccion,
              pa.nombre as periodo_academico, a.estado, a.created_at
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN secciones s ON a.seccion_id = s.id
       LEFT JOIN periodos_academicos pa ON a.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, alumnos, countResult[0].total, page, limit);
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    return sendError(res, 'Error al obtener alumnos');
  }
}

export async function getAlumnoById(req: Request, res: Response) {
  try {
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.nombre, u.apellido, u.email, u.dni, u.telefono,
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url,
              g.nombre as grado, g.nivel, s.nombre as seccion,
              pa.nombre as periodo_academico
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN secciones s ON a.seccion_id = s.id
       LEFT JOIN periodos_academicos pa ON a.periodo_academico_id = pa.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (alumnos.length === 0) {
      return sendError(res, 'Alumno no encontrado', 404);
    }

    const alumno = alumnos[0];

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, cu.nombre as curso_nombre, pa.nombre as periodo
       FROM calificaciones c
       JOIN cursos cu ON c.curso_id = cu.id
       JOIN periodos_academicos pa ON c.periodo_academico_id = pa.id
       WHERE c.alumno_id = ?
       ORDER BY c.fecha_evaluacion DESC`,
      [req.params.id]
    );

    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
        SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados
       FROM asistencias WHERE alumno_id = ? AND YEAR(fecha) = YEAR(CURDATE())`,
      [req.params.id]
    );

    return sendSuccess(res, {
      ...alumno,
      calificaciones,
      resumenAsistencia: asistencias[0]
    });
  } catch (error) {
    return sendError(res, 'Error al obtener alumno');
  }
}

export async function createAlumno(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { email, password, nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero, grado_id, seccion_id, periodo_academico_id } = req.body;

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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)`,
      [email, passwordHash, nombre, apellido, dni, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro']
    );

    const codigo = `ALU-${Date.now().toString(36).toUpperCase()}`;

    const [alumnoResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO alumnos (usuario_id, codigo_alumno, grado_id, seccion_id, periodo_academico_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userResult.insertId, codigo, grado_id || null, seccion_id || null, periodo_academico_id || null]
    );

    await connection.commit();

    return sendSuccess(res, {
      id: alumnoResult.insertId,
      usuario_id: userResult.insertId,
      codigo_alumno: codigo
    }, 'Alumno registrado exitosamente', 201);
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear alumno:', error);
    return sendError(res, 'Error al registrar alumno');
  } finally {
    connection.release();
  }
}

export async function updateAlumno(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { grado_id, seccion_id, periodo_academico_id, estado, telefono, fecha_nacimiento, genero } = req.body;

    // Actualizar datos del alumno
    await connection.query(
      `UPDATE alumnos SET grado_id = COALESCE(?, grado_id),
       seccion_id = COALESCE(?, seccion_id),
       periodo_academico_id = COALESCE(?, periodo_academico_id),
       estado = COALESCE(?, estado)
       WHERE id = ?`,
      [grado_id, seccion_id, periodo_academico_id, estado, req.params.id]
    );

    // Actualizar datos del usuario (telefono, fecha_nacimiento, genero) si se proporcionan
    if (telefono !== undefined || fecha_nacimiento !== undefined || genero !== undefined) {
      await connection.query(
        `UPDATE usuarios SET
         telefono = COALESCE(NULLIF(?, ''), telefono),
         fecha_nacimiento = COALESCE(NULLIF(?, ''), fecha_nacimiento),
         genero = COALESCE(NULLIF(?, ''), genero)
         WHERE id = (SELECT usuario_id FROM alumnos WHERE id = ?)`,
        [telefono, fecha_nacimiento, genero, req.params.id]
      );
    }

    await connection.commit();

    return sendSuccess(res, null, 'Alumno actualizado exitosamente');
  } catch (error) {
    await connection.rollback();
    return sendError(res, 'Error al actualizar alumno');
  } finally {
    connection.release();
  }
}

export async function getAlumnoHorario(req: Request, res: Response) {
  try {
    const [horarios] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, cu.nombre as curso_nombre, cu.codigo as curso_codigo,
              u.nombre as profesor_nombre, u.apellido as profesor_apellido,
              s.nombre as seccion
       FROM horarios h
       JOIN cursos cu ON h.curso_id = cu.id
       JOIN profesores p ON h.profesor_id = p.id
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN secciones s ON h.seccion_id = s.id
       WHERE h.seccion_id = (SELECT seccion_id FROM alumnos WHERE id = ?)
       ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'), h.hora_inicio`,
      [req.params.id]
    );

    return sendSuccess(res, horarios);
  } catch (error) {
    return sendError(res, 'Error al obtener horario');
  }
}
