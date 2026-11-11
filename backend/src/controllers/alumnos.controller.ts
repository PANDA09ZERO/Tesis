import { accountFailure } from '../utils/accountErrors';
import { logError } from '../utils/logger';
import { PoolConnection } from 'mysql2/promise';
import { finishTransaction } from '../utils/transaction';
import { accountError } from '../utils/accountValidation';
import { positiveId } from '../utils/academicValidation';
import { asistenciaSourceSql } from '../utils/reporteAcademico';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { profesorTieneAccesoAlumno, profesorAlumnoScope, profesorRegistroScope, profesorHorarioScope, profesorMatriculaScope } from '../utils/profesorAlcance';
import { alumnoDeCuenta,periodoDelAlumno,horariosDelAlumno,ErrorEstudiante } from '../utils/estudianteAlcance';
import { obtenerMatriculasAlumno } from '../utils/matriculasAlumno';
import { createInstitutionalCredentials, generateStudentCode } from '../utils/credentials';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllAlumnos(req: AuthRequest, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const search = (req.query.search as string) || '';
    const gradoId = req.query.grado_id as string;
    const periodoId = req.query.periodo_id === undefined || req.query.periodo_id === '' ? undefined : Number(req.query.periodo_id);
    if (periodoId !== undefined && (!Number.isSafeInteger(periodoId) || periodoId <= 0)) return sendError(res, 'Periodo inválido', 400);
    const filtrarPorPeriodo = req.user?.rol !== 'profesor' && periodoId !== undefined;
    // 'con' = alumnos con matrícula en el periodo (análisis); 'sin' = candidatos a rematrícula
    // (alumnos con historial en otros periodos y sin matrícula activa en el periodo consultado)
    const matriculaPeriodo = (req.query.matricula_periodo as string) || 'con';
    if (!['con', 'sin'].includes(matriculaPeriodo)) return sendError(res, 'Filtro de matrícula por periodo inválido', 400);
    const candidatosRematricula = filtrarPorPeriodo && matriculaPeriodo === 'sin';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    // Exalumnos anteriores al sistema: solo aparecen en su propia vista (historicos=1).
    const verHistoricos = req.query.historicos === '1' && req.user?.rol === 'administrador';
    whereClause += verHistoricos ? ' AND a.es_historico = 1' : ' AND a.es_historico = 0';

    if (search) {
      whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR a.codigo_alumno LIKE ? OR u.dni LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (gradoId) {
      if (req.user?.rol === 'profesor') {
        const scope = profesorMatriculaScope('filter_m',req.user.userId);
        whereClause += ` AND EXISTS (SELECT 1 FROM matriculas filter_m
          JOIN cursos filter_cu ON filter_cu.id = filter_m.curso_id
          JOIN periodos_academicos filter_pa ON filter_pa.id = filter_m.periodo_academico_id
          WHERE filter_m.alumno_id = a.id AND filter_m.estado = 'activa'
            AND COALESCE(filter_m.grado_id,filter_cu.grado_id) = ?
            AND ${periodoId ? 'filter_pa.id = ?' : 'filter_pa.activo = 1'} AND ${scope.sql})`;
        params.push(gradoId,...(periodoId ? [periodoId] : []),...scope.params);
      } else if (filtrarPorPeriodo) {
        whereClause += ` AND EXISTS (SELECT 1 FROM matriculas filter_gm
          LEFT JOIN cursos filter_gc ON filter_gc.id = filter_gm.curso_id
          WHERE filter_gm.alumno_id = a.id AND filter_gm.periodo_academico_id = ?
            AND COALESCE(filter_gm.grado_id, filter_gc.grado_id) = ?)`;
        params.push(periodoId, gradoId);
      } else { whereClause += ' AND a.grado_id = ?';params.push(gradoId); }
    }
    if (req.user?.rol === 'profesor') {
      const scope = profesorAlumnoScope('a', req.user.userId, periodoId);
      whereClause += ' AND ' + scope.sql; params.push(...scope.params);
    } else if (candidatosRematricula) {
      whereClause += ` AND NOT EXISTS (SELECT 1 FROM matriculas mper WHERE mper.alumno_id = a.id AND mper.periodo_academico_id = ? AND mper.estado = 'activa')
        AND EXISTS (SELECT 1 FROM matriculas mhist WHERE mhist.alumno_id = a.id AND mhist.periodo_academico_id <> ?)`;
      params.push(periodoId, periodoId);
    } else if (filtrarPorPeriodo) {
      whereClause += ' AND EXISTS (SELECT 1 FROM matriculas mper WHERE mper.alumno_id = a.id AND mper.periodo_academico_id = ?)';
      params.push(periodoId);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM alumnos a JOIN usuarios u ON a.usuario_id = u.id ${whereClause}`,
      params
    );

    let gradoExpression = 'g.nombre';
    const selectParams: any[] = [];
    let estadoMatriculaExpression = 'NULL';
    let activaPeriodoExpression = 'NULL';
    if (req.user?.rol === 'profesor') {
      const scope = profesorMatriculaScope('grade_m',req.user.userId);
      gradoExpression = `(SELECT GROUP_CONCAT(DISTINCT grade_g.nombre ORDER BY grade_g.nombre SEPARATOR ', ')
        FROM matriculas grade_m JOIN periodos_academicos grade_pa ON grade_pa.id = grade_m.periodo_academico_id
        JOIN cursos grade_cu ON grade_cu.id = grade_m.curso_id JOIN grados grade_g ON grade_g.id = COALESCE(grade_m.grado_id,grade_cu.grado_id)
        WHERE grade_m.alumno_id = a.id AND grade_m.estado = 'activa'
          AND ${periodoId ? 'grade_pa.id = ?' : 'grade_pa.activo = 1'} AND ${scope.sql})`;
      selectParams.push(...(periodoId ? [periodoId] : []),...scope.params);
    } else if (filtrarPorPeriodo) {
      if (!candidatosRematricula) {
        // Con filtro 'con': el grado proviene de la matrícula del periodo consultado
        gradoExpression = `(SELECT GROUP_CONCAT(DISTINCT per_g.nombre ORDER BY per_g.nombre SEPARATOR ', ')
          FROM matriculas per_m LEFT JOIN cursos per_cu ON per_cu.id = per_m.curso_id
          JOIN grados per_g ON per_g.id = COALESCE(per_m.grado_id, per_cu.grado_id)
          WHERE per_m.alumno_id = a.id AND per_m.periodo_academico_id = ?)`;
        selectParams.push(periodoId);
      }
      // Con filtro 'sin' (candidatos): el grado mostrado es el de la última matrícula (caché),
      // que es el grado sugerido para la rematrícula.
      estadoMatriculaExpression = `(SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          WHEN SUM(per_m.estado = 'activa') > 0 THEN 'activa'
          WHEN SUM(per_m.estado = 'pendiente') > 0 THEN 'pendiente'
          WHEN SUM(per_m.estado = 'completada') > 0 THEN 'completada'
          ELSE 'cancelada' END
        FROM matriculas per_m
        WHERE per_m.alumno_id = a.id AND per_m.periodo_academico_id = ?)`;
      activaPeriodoExpression = `EXISTS(SELECT 1 FROM matriculas act_m
        WHERE act_m.alumno_id = a.id AND act_m.periodo_academico_id = ? AND act_m.estado = 'activa')`;
      selectParams.push(periodoId, periodoId);
    }

    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.codigo_alumno, u.nombre, u.apellido, u.email, u.dni,
              u.fecha_nacimiento, u.genero, u.telefono, u.foto_url, u.activo,
              ${gradoExpression} as grado, g.nivel,
              pa.nombre as periodo_academico, a.estado, a.created_at,
              a.es_historico, a.anio_ultimo_estudio, a.ultimo_grado_cursado,
              ${estadoMatriculaExpression} as estado_matricula,
              ${activaPeriodoExpression} as tiene_matricula_activa_periodo,
              EXISTS(SELECT 1 FROM matriculas ma WHERE ma.alumno_id = a.id) tiene_matricula
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN periodos_academicos pa ON a.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY u.apellido, u.nombre
       LIMIT ? OFFSET ?`,
      [...selectParams, ...params, limit, offset]
    );

    return sendPaginated(res, alumnos, countResult[0].total, page, limit);
  } catch (error) {
    logError('Error al obtener alumnos:', error);
    return sendError(res, 'Error al obtener alumnos');
  }
}

export async function getAlumnoById(req: AuthRequest, res: Response) {
  if (!positiveId(req.params.id) || (req.query.periodo_id !== undefined && !positiveId(req.query.periodo_id))) return sendError(res, 'Alumno o periodo inválido',400);
  try {
    if (req.user?.rol === 'profesor') {
      const tieneAcceso = await profesorTieneAccesoAlumno(pool, req.user.userId, parseInt(req.params.id), req.query.periodo_id ? Number(req.query.periodo_id) : undefined);
      if (!tieneAcceso) {
        return sendError(res, 'Alumno no encontrado', 404);
      }
    }
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.nombre, u.apellido, u.email, u.dni, u.telefono,
              u.direccion, u.fecha_nacimiento, u.genero, u.foto_url,
              g.nombre as grado, g.nivel,
              pa.nombre as periodo_academico
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN grados g ON a.grado_id = g.id
       LEFT JOIN periodos_academicos pa ON a.periodo_academico_id = pa.id
      WHERE a.id = ?`,
          [req.params.id]
    );

    if (alumnos.length === 0) {
      return sendError(res, 'Alumno no encontrado', 404);
    }

    const alumno = alumnos[0];
    const gradeScope = req.user?.rol === 'profesor' ? profesorRegistroScope('c', req.user.userId, 'nota', req.query.periodo_id ? Number(req.query.periodo_id) : 'activo') : null;
    const teacherCourseFilter = gradeScope ? ' AND ' + gradeScope.sql : '';
    const teacherParams = gradeScope?.params || [];

    const [calificaciones] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, cu.nombre as curso_nombre, pa.nombre as periodo, ev.nota_maxima AS escala_maxima
       FROM calificaciones c LEFT JOIN evaluaciones ev ON ev.id=c.evaluacion_id
       JOIN cursos cu ON c.curso_id = cu.id
       JOIN periodos_academicos pa ON c.periodo_academico_id = pa.id
       WHERE c.alumno_id = ?${req.query.periodo_id ? ' AND c.periodo_academico_id = ?' : ''}${teacherCourseFilter}
       ORDER BY c.fecha_evaluacion DESC`,
      [req.params.id, ...(req.query.periodo_id ? [req.query.periodo_id] : []), ...teacherParams]
    );

    const attendanceScope = req.user?.rol === 'profesor' ? profesorRegistroScope('attendance', req.user.userId, 'asistencia', req.query.periodo_id ? Number(req.query.periodo_id) : 'activo') : null;
    const attendanceCourseFilter = attendanceScope ? ' AND ' + attendanceScope.sql : '';
    const [asistencias] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total, COUNT(DISTINCT fecha) as dias_unicos,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
        SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados
      FROM (${asistenciaSourceSql}) attendance WHERE alumno_id = ? ${req.query.periodo_id ? 'AND attendance.periodo_id = ?' : 'AND YEAR(fecha) = YEAR(CURDATE())'}${attendanceCourseFilter}`,
          [req.params.id, ...(req.query.periodo_id ? [req.query.periodo_id] : []), ...(attendanceScope?.params || [])]
    );

    const matriculasAcademicas = await obtenerMatriculasAlumno(Number(req.params.id),
      req.user?.rol === 'profesor' ? req.user.userId : undefined, req.query.periodo_id ? Number(req.query.periodo_id) : undefined, req.user?.rol !== 'apoderado');
    return sendSuccess(res, {
      ...alumno,
      matriculas_academicas: matriculasAcademicas,
      calificaciones,
      resumenAsistencia: asistencias[0]
    });
  } catch (error) {
    return sendError(res, 'Error al obtener alumno');
  }
}

export async function getAlumnoMatriculas(req: AuthRequest, res: Response) {
  const alumnoId = Number(req.params.id);
  if (!Number.isInteger(alumnoId) || alumnoId <= 0) return sendError(res, 'Alumno inválido', 400);
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ?', [alumnoId]);
    if (!rows.length) return sendError(res, 'Alumno no encontrado', 404);
    const matriculas = await obtenerMatriculasAlumno(alumnoId, req.user?.rol === 'profesor' ? req.user.userId : undefined, undefined, req.user?.rol !== 'apoderado');
    return sendSuccess(res, matriculas);
  } catch (error) {
    logError('Error al obtener matrículas del alumno:', error);
    return sendError(res, 'No se pudieron cargar las matrículas del alumno');
  }
}

export async function createAlumno(req: Request, res: Response) {
  const validation = accountError(req.body,true,true);
  if(validation)return sendError(res,validation,400);
  if (req.body.grado_id !== undefined || req.body.periodo_academico_id !== undefined) {
    return sendError(res, 'El grado y el periodo se establecen al registrar la matrícula', 400);
  }
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { nombre, apellido, dni, telefono, direccion,
            fecha_nacimiento, genero } = req.body;

    const codigo = generateStudentCode();
    const { email, temporaryPassword } = await createInstitutionalCredentials(connection, 'alumno', nombre, apellido);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, debe_cambiar_password, nombre, apellido, dni, telefono,
       direccion, fecha_nacimiento, genero, rol_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 3)`,
      [email, passwordHash, nombre, apellido, dni || null, telefono || null,
       direccion || null, fecha_nacimiento || null, genero || 'Otro']
    );

    const [alumnoResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO alumnos (usuario_id, codigo_alumno) VALUES (?, ?)`,
      [userResult.insertId, codigo]
    );

    await connection.commit(); committed = true;

    return sendSuccess(res, {
      id: alumnoResult.insertId,
      usuario_id: userResult.insertId,
      codigo_alumno: codigo,
      credentials: { email, temporaryPassword, mustChangePassword: true, mailboxCreated: false }
    }, 'Alumno registrado exitosamente', 201);
  } catch (error) {
    return accountFailure(res,error,'Error al registrar alumno');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function updateAlumno(req: Request, res: Response) {
  const validation = accountError(req.body,false);
  if(validation)return sendError(res,validation,400);
  if(!positiveId(req.params.id))return sendError(res,'ID inválido',400);
  if(req.body.estado!==undefined&&!['matriculado','retirado','egresado','trasladado'].includes(req.body.estado))return sendError(res,'Estado del alumno inválido',400);
  if (req.body.grado_id !== undefined || req.body.periodo_academico_id !== undefined) {
    return sendError(res, 'El grado y el periodo se modifican desde la matrícula', 400);
  }
  let connection: PoolConnection | undefined;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [current] = await connection.query<RowDataPacket[]>('SELECT id FROM alumnos WHERE id = ? FOR UPDATE',[req.params.id]);
    if(!current.length)return sendError(res,'Alumno no encontrado',404);

    const { estado, telefono, fecha_nacimiento, genero } = req.body;

    // Actualizar datos del alumno
    await connection.query(
      `UPDATE alumnos SET estado = COALESCE(?, estado)
       WHERE id = ?`,
      [estado ?? null, req.params.id]
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

    await connection.commit(); committed = true;

    return sendSuccess(res, null, 'Alumno actualizado exitosamente');
  } catch (error) {
    return accountFailure(res,error,'Error al actualizar alumno');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function getAlumnoHorario(req: AuthRequest, res: Response) {
  try {
    if (req.user?.rol === 'alumno') {
      const alumno = await alumnoDeCuenta(req.user.userId);
      if (Number(req.params.id) !== alumno.id) return sendError(res,'Alumno no encontrado',404);
      const periodo = await periodoDelAlumno(alumno.id,req.query.periodo_id);
      return sendSuccess(res,periodo ? await horariosDelAlumno(alumno.id,periodo.id) : []);
    }
    if (req.user?.rol === 'profesor') {
      const scope = profesorHorarioScope('h',req.user.userId);
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT h.*,cu.nombre curso_nombre,cu.codigo curso_codigo,g.nombre grado
        FROM horarios h JOIN cursos cu ON cu.id = h.curso_id
        LEFT JOIN periodo_grado_cursos pgc ON pgc.id = h.periodo_grado_curso_id
        LEFT JOIN grados g ON g.id = COALESCE(pgc.grado_id,cu.grado_id)
        WHERE ${scope.sql} AND EXISTS (SELECT 1 FROM matriculas m
          WHERE m.alumno_id = ? AND m.curso_id = h.curso_id AND m.periodo_academico_id = h.periodo_academico_id
            AND m.estado = 'activa' AND (pgc.id IS NULL OR COALESCE(m.grado_id,cu.grado_id) = pgc.grado_id))
        ORDER BY h.dia_semana,h.hora_inicio`,[...scope.params,req.params.id]);
      return sendSuccess(res,rows);
    }

    const teacherFilter = req.user?.rol === 'profesor'
      ? ' AND h.profesor_id = (SELECT id FROM profesores WHERE usuario_id = ?)'
      : '';
    const params = req.user?.rol === 'profesor'
      ? [req.params.id, req.user.userId]
      : [req.params.id];
    const [horarios] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, cu.nombre as curso_nombre, cu.codigo as curso_codigo,
              u.nombre as profesor_nombre, u.apellido as profesor_apellido,
              g.nombre as grado
       FROM horarios h
       JOIN cursos cu ON h.curso_id = cu.id
       JOIN profesores p ON h.profesor_id = p.id
       JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN grados g ON cu.grado_id = g.id
      WHERE cu.grado_id = (SELECT grado_id FROM alumnos WHERE id = ?)${teacherFilter}
       ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'), h.hora_inicio`,
          params
    );

    return sendSuccess(res, horarios);
  } catch (error) {
    if (error instanceof ErrorEstudiante) return sendError(res,error.message,error.status);
    return sendError(res, 'Error al obtener horario');
  }
}
