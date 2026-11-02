import { logError } from '../utils/logger';
import { PoolConnection } from 'mysql2/promise';
import { positiveId } from '../utils/academicValidation';
import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllMatriculas(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const { alumno_id, curso_id, periodo_id, estado } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (alumno_id) { whereClause += ' AND m.alumno_id = ?'; params.push(alumno_id); }
    if (curso_id) { whereClause += ' AND m.curso_id = ?'; params.push(curso_id); }
    if (periodo_id) { whereClause += ' AND m.periodo_academico_id = ?'; params.push(periodo_id); }
    if (estado) { whereClause += ' AND m.estado = ?'; params.push(estado); }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM matriculas m ${whereClause}`,
      params
    );

    const [matriculas] = await pool.query<RowDataPacket[]>(
            `SELECT m.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido, a.codigo_alumno,
              cu.nombre as curso,
              g.nombre as grado, pa.nombre as periodo,
              CASE WHEN m.estado = 'activa' THEN 'success' WHEN m.estado = 'cancelada' THEN 'danger' ELSE 'warning' END as estado_variant
       FROM matriculas m
       JOIN alumnos a ON m.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN cursos cu ON m.curso_id = cu.id
      LEFT JOIN grados g ON COALESCE(m.grado_id, cu.grado_id) = g.id
       LEFT JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id
       ${whereClause}
       ORDER BY m.fecha_matricula DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, matriculas, countResult[0].total, page, limit);
  } catch (error) {
    logError('Error al obtener matrículas:', error);
    return sendError(res, 'Error al obtener matrículas');
  }
}

export async function getMatriculaById(req: Request, res: Response) {
  try {
    const [matriculas] = await pool.query<RowDataPacket[]>(
            `SELECT m.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido, a.codigo_alumno,
              u.email as alumno_email, u.telefono as alumno_telefono,
              g.nombre as grado, pa.nombre as periodo,
              ap.nombre as apoderado_nombre, ap.apellido as apoderado_apellido
       FROM matriculas m
       JOIN alumnos a ON m.alumno_id = a.id
       LEFT JOIN cursos cu ON cu.id = m.curso_id
       JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN grados g ON COALESCE(m.grado_id, cu.grado_id) = g.id
       LEFT JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id
       LEFT JOIN apoderado_alumno aa ON a.id = aa.alumno_id
       LEFT JOIN apoderados apo ON aa.apoderado_id = apo.id
       LEFT JOIN usuarios ap ON apo.usuario_id = ap.id
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (matriculas.length === 0) {
      return sendError(res, 'Matrícula no encontrada', 404);
    }

    // Obtener documentos requeridos para la matrícula
    const [documentos] = await pool.query<RowDataPacket[]>(
      `SELECT d.* FROM documentos d
       WHERE d.alumno_id = ? AND d.categoria = 'Matrícula'
       ORDER BY d.created_at DESC`,
      [matriculas[0].alumno_id]
    );

    return sendSuccess(res, { ...matriculas[0], documentos });
  } catch (error) {
    return sendError(res, 'Error al obtener matrícula');
  }
}

export async function createMatricula(req: Request, res: Response) {
  // Las cadenas vacías de los campos opcionales se tratan como ausentes (null).
  if (req.body.grado_id === '') req.body.grado_id = null;
  if (req.body.curso_id === '') req.body.curso_id = null;
  if (!positiveId(req.body.alumno_id) || !positiveId(req.body.periodo_academico_id) ||
      (req.body.grado_id != null && !positiveId(req.body.grado_id)) || (req.body.curso_id != null && !positiveId(req.body.curso_id)) || (req.body.auto_cursos !== undefined && typeof req.body.auto_cursos !== 'boolean') || (req.body.observaciones != null && typeof req.body.observaciones !== 'string')) {
    return sendError(res, 'Seleccione alumno, periodo y grado válidos', 400);
  }
  let connection: PoolConnection | undefined;
  let transaction = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); transaction = true;

    const { alumno_id, curso_id, periodo_academico_id, grado_id, observaciones, auto_cursos } = req.body;

    // Verificar si el alumno existe
    const [alumno] = await connection.query<RowDataPacket[]>(
      'SELECT id, estado FROM alumnos WHERE id = ? FOR UPDATE', [alumno_id]
    );

    if (alumno.length === 0) {
      return sendError(res, 'Alumno no encontrado', 404);
    }

    const [periodos] = await connection.query<RowDataPacket[]>('SELECT id FROM periodos_academicos WHERE id = ?', [periodo_academico_id]);
    if (!periodos.length) {
      return sendError(res, 'Periodo académico no encontrado', 404);
    }

    // Si se asigna un curso, verificar que exista y usar su grado como respaldo
    let cursoGradoId: number | null = null;
    if (curso_id) {
      const [curso] = await connection.query<RowDataPacket[]>(
        'SELECT id, grado_id FROM cursos WHERE id = ?', [curso_id]
      );
      if (curso.length === 0) {
          return sendError(res, 'Curso no encontrado', 404);
      }
      cursoGradoId = curso[0].grado_id ?? null;
    }

    const gradoFinal = grado_id || cursoGradoId;
    if (!gradoFinal) {
      return sendError(res, 'El grado se debe establecer al registrar la matrícula', 400);
    }
    const [grados] = await connection.query<RowDataPacket[]>('SELECT id FROM grados WHERE id = ?', [gradoFinal]);
    if (!grados.length) {
      return sendError(res, 'Grado no encontrado', 404);
    }
    if (curso_id) {
      const [offer] = await connection.query<RowDataPacket[]>('SELECT id FROM periodo_grado_cursos WHERE periodo_academico_id = ? AND grado_id = ? AND curso_id = ?', [periodo_academico_id, gradoFinal, curso_id]);
      if (!offer.length) { return sendError(res, 'El curso no está configurado para ese grado y periodo', 400); }
    }

    // Inscripción automática: si no se indica un curso concreto, se inscriben
    // todos los cursos configurados para ese grado en el periodo académico.
    let cursosConfigurados: number[] = [];
    if (!curso_id && gradoFinal && auto_cursos !== false) {
      const [configurados] = await connection.query<RowDataPacket[]>(
        `SELECT curso_id FROM periodo_grado_cursos
         WHERE periodo_academico_id = ? AND grado_id = ?
         ORDER BY curso_id`,
        [periodo_academico_id, gradoFinal]
      );
      cursosConfigurados = configurados.map(fila => fila.curso_id);
    }

    const cursosAInscribir: (number | null)[] = cursosConfigurados.length > 0
      ? cursosConfigurados
      : [curso_id || null];

    const matriculas: number[] = [];
    const yaMatriculados: number[] = [];

    for (const cursoActual of cursosAInscribir) {
      const [existente] = await connection.query<RowDataPacket[]>(
        `SELECT id, estado, grado_id FROM matriculas
         WHERE alumno_id = ? AND periodo_academico_id = ? AND curso_id <=> ? LIMIT 1`,
        [alumno_id, periodo_academico_id, cursoActual]
      );

      if (existente.length > 0) {
        if (existente[0].estado === 'activa') {
          yaMatriculados.push(existente[0].id);
          continue;
        }

        if (existente[0].grado_id != null && Number(existente[0].grado_id) !== Number(gradoFinal)) return sendError(res, 'La inscripción existente corresponde a otro grado; revise su historial antes de modificarla', 409);

        // Reactivar la matrícula cancelada/completada en lugar de duplicarla
        await connection.query(
          `UPDATE matriculas SET estado = 'activa', grado_id = COALESCE(?, grado_id),
             fecha_matricula = CURDATE(), observaciones = COALESCE(?, observaciones)
           WHERE id = ?`,
          [gradoFinal || null, observaciones || null, existente[0].id]
        );
        matriculas.push(existente[0].id);
        continue;
      }

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO matriculas (alumno_id, curso_id, periodo_academico_id, grado_id,
         fecha_matricula, estado, observaciones)
         VALUES (?, ?, ?, ?, CURDATE(), 'activa', ?)`,
        [alumno_id, cursoActual, periodo_academico_id, gradoFinal || null, observaciones || null]
      );
      matriculas.push(result.insertId);
    }

    if (matriculas.length === 0) {
      const mensaje = cursosAInscribir.length > 1
        ? 'El alumno ya estaba matriculado en todos los cursos de este grado'
        : curso_id
          ? 'El alumno ya está asignado a este curso en el periodo seleccionado'
          : 'El alumno ya tiene una matrícula activa para este periodo';
      return sendError(res, mensaje, 409);
    }

    // Actualizar datos del alumno sin borrar los que ya tenía
    await connection.query(
      `UPDATE alumnos SET estado = 'matriculado',
         grado_id = COALESCE(?, grado_id),
         periodo_academico_id = COALESCE(?, periodo_academico_id)
       WHERE id = ?`,
      [gradoFinal || null, periodo_academico_id, alumno_id]
    );

    await connection.commit(); transaction = false;

    return sendSuccess(res, {
      id: matriculas[0],
      ids: matriculas,
      cursos_inscritos: matriculas.length,
      ya_matriculados: yaMatriculados.length
    },
      cursosConfigurados.length > 0
        ? `Matrícula registrada: ${matriculas.length} curso(s) del grado`
        : 'Matrícula registrada exitosamente',
      201);
  } catch (error: any) {
    logError('Error al crear matrícula:', error?.code || 'Error de operación');
    if (error?.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'El alumno ya está asignado a este curso en el periodo seleccionado', 409);
    }
    return sendError(res, 'Error al registrar matrícula');
  } finally {
    if (transaction && connection) { try { await connection.rollback(); } catch { connection.destroy(); connection = undefined; } }
    connection?.release();
  }
}

export async function updateMatricula(req: Request, res: Response) {
  if (req.body.grado_id === '') req.body.grado_id = null;
  if (req.body.curso_id === '') req.body.curso_id = null;
  const {estado, observaciones, grado_id, curso_id} = req.body;
  if (!positiveId(req.params.id) || (estado !== undefined && !['activa','pendiente','cancelada','completada'].includes(estado)) || (observaciones != null && typeof observaciones !== 'string') || (grado_id != null && !positiveId(grado_id)) || (curso_id != null && !positiveId(curso_id))) return sendError(res, 'Datos de matrícula inválidos', 400);
  let connection: PoolConnection | undefined;
  let transaction = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); transaction = true;
    const [initial] = await connection.query<RowDataPacket[]>('SELECT alumno_id FROM matriculas WHERE id = ?', [req.params.id]);
    if (!initial.length) return sendError(res, 'Matrícula no encontrada', 404);
    await connection.query('SELECT id FROM alumnos WHERE id = ? FOR UPDATE', [initial[0].alumno_id]);
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM matriculas WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) return sendError(res, 'Matrícula no encontrada', 404);
    const current = rows[0];
    const grade = grado_id == null ? current.grado_id : Number(grado_id), course = curso_id == null ? current.curso_id : Number(curso_id);
    if (grade !== current.grado_id || course !== current.curso_id) {
      const [grades] = await connection.query<RowDataPacket[]>('SELECT id FROM grados WHERE id = ?', [grade]);
      if (!grades.length) return sendError(res, 'Grado no encontrado',404);
      if (course !== null) {
        const [courses] = await connection.query<RowDataPacket[]>('SELECT id FROM cursos WHERE id = ?', [course]);
        if (!courses.length) return sendError(res, 'Curso no encontrado',404);
        const [offers] = await connection.query<RowDataPacket[]>('SELECT id FROM periodo_grado_cursos WHERE periodo_academico_id = ? AND grado_id = ? AND curso_id = ?', [current.periodo_academico_id, grade, course]);
        if (!offers.length) return sendError(res, 'El curso no está configurado para ese grado y periodo', 400);
      }
      const [history] = await connection.query<RowDataPacket[]>(`SELECT id FROM calificaciones WHERE alumno_id = ? AND periodo_academico_id = ? AND curso_id <=> ? LIMIT 1`, [current.alumno_id,current.periodo_academico_id,current.curso_id]);
      const [attendance] = await connection.query<RowDataPacket[]>(`SELECT id FROM asistencias WHERE alumno_id = ? AND curso_id <=> ? LIMIT 1`, [current.alumno_id,current.curso_id]);
      if (history.length || attendance.length) return sendError(res, 'La matrícula tiene historial académico; no se puede cambiar su grado o curso', 409);
    }
    await connection.query('UPDATE matriculas SET estado = ?, observaciones = ?, grado_id = ?, curso_id = ? WHERE id = ?', [estado ?? current.estado, observaciones === undefined ? current.observaciones : observaciones, grade, course, req.params.id]);
    if (estado === 'cancelada') await connection.query(`UPDATE alumnos SET estado = 'retirado' WHERE id = ? AND NOT EXISTS (SELECT 1 FROM matriculas WHERE alumno_id = ? AND estado = 'activa')`, [current.alumno_id,current.alumno_id]);
    if (estado === 'activa') await connection.query("UPDATE alumnos SET estado = 'matriculado' WHERE id = ?", [current.alumno_id]);
    await connection.commit(); transaction = false;
    return sendSuccess(res, null, 'Matrícula actualizada exitosamente');
  } catch (error: any) {
    return sendError(res, error?.code === 'ER_DUP_ENTRY' ? 'Ya existe esa matrícula' : 'Error al actualizar matrícula', error?.code === 'ER_DUP_ENTRY' ? 409 : 500);
  } finally {
    if (transaction && connection) { try { await connection.rollback(); } catch { connection.destroy(); connection = undefined; } }
    connection?.release();
  }
}

export async function deleteMatricula(req: Request, res: Response) {
  if (!positiveId(req.params.id)) return sendError(res, 'Matrícula inválida',400);
  if(process.env.NODE_ENV==='production')return sendError(res,'El borrado definitivo está suspendido hasta definir la política institucional. Puede cancelar la matrícula conservando el historial',409);
  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM matriculas WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Matrícula no encontrada',404);
    return sendSuccess(res, null, 'Matrícula eliminada');
  } catch (error) {
    return sendError(res, 'Error al eliminar matrícula');
  }
}

export async function getMatriculasByPeriodo(req: Request, res: Response) {
  try {
    const [matriculas] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido, a.codigo_alumno,
          g.nombre as grado
       FROM matriculas m
       JOIN alumnos a ON m.alumno_id = a.id
       LEFT JOIN cursos cu ON cu.id = m.curso_id
       JOIN usuarios u ON a.usuario_id = u.id
        LEFT JOIN grados g ON COALESCE(m.grado_id, cu.grado_id) = g.id
       WHERE m.periodo_academico_id = ?
        ORDER BY g.nombre, u.apellido`,
      [req.params.periodoId]
    );

    return sendSuccess(res, matriculas);
  } catch (error) {
    return sendError(res, 'Error al obtener matrículas del periodo');
  }
}

export async function getEstadisticasMatricula(req: Request, res: Response) {
  try {
    const periodoId = req.query.periodo_id as string;

    let whereClause = periodoId ? 'WHERE m.periodo_academico_id = ?' : '';
    const params: any[] = periodoId ? [periodoId] : [];

    const [estadisticas] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_matriculas,
        SUM(CASE WHEN m.estado = 'activa' THEN 1 ELSE 0 END) as activas,
        SUM(CASE WHEN m.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN m.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        COUNT(DISTINCT COALESCE(m.grado_id, cu.grado_id)) as grados_cubiertos
       FROM matriculas m
             LEFT JOIN alumnos a ON m.alumno_id = a.id
       LEFT JOIN cursos cu ON cu.id = m.curso_id
       ${whereClause}`,
      params
    );

    // Estadísticas por grado
    const [porGrado] = await pool.query<RowDataPacket[]>(
      `SELECT g.nombre as grado, COUNT(*) as total_matriculas,
              SUM(CASE WHEN m.estado = 'activa' THEN 1 ELSE 0 END) as activas
       FROM matriculas m
       JOIN alumnos a ON m.alumno_id = a.id
       LEFT JOIN cursos cu ON cu.id = m.curso_id
      JOIN grados g ON COALESCE(m.grado_id, cu.grado_id) = g.id
       ${whereClause}
       GROUP BY g.id, g.nombre
       ORDER BY g.orden`,
      params
    );

    return sendSuccess(res, {
      general: estadisticas[0],
      por_grado: porGrado
    });
  } catch (error) {
    return sendError(res, 'Error al obtener estadísticas de matrícula');
  }
}
