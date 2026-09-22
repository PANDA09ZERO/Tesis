import { Request, Response } from 'express';
import pool from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { AuthRequest } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllMensualidades(req: Request, res: Response) {
  try {
    const { page, limit, offset } = getPagination(req.query as any);
    const { search, alumno_id, curso_id, estado, mes, año } = req.query as any;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) { whereClause += ' AND (a.codigo_alumno LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (alumno_id) { whereClause += ' AND m.alumno_id = ?'; params.push(alumno_id); }
    if (curso_id) { whereClause += ' AND m.curso_id = ?'; params.push(curso_id); }
    if (estado) { whereClause += ' AND m.estado = ?'; params.push(estado); }
    if (mes) { whereClause += ' AND m.mes = ?'; params.push(mes); }
    if (año) { whereClause += ' AND m.año = ?'; params.push(año); }

    const [countResult] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM mensualidades m JOIN alumnos a ON m.alumno_id = a.id JOIN usuarios u ON a.usuario_id = u.id ${whereClause}`, params);
    const [mensualidades] = await pool.query<RowDataPacket[]>(`SELECT m.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido, a.codigo_alumno, cu.nombre as curso_nombre, pa.nombre as periodo FROM mensualidades m JOIN alumnos a ON m.alumno_id = a.id JOIN usuarios u ON a.usuario_id = u.id JOIN cursos cu ON m.curso_id = cu.id JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id ${whereClause} ORDER BY m.año DESC, m.mes DESC, m.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return sendPaginated(res, mensualidades, countResult[0].total, page, limit);
  } catch (error) {
    console.error('Error al obtener mensualidades:', error);
    return sendError(res, 'Error al obtener mensualidades');
  }
}

export async function createMensualidad(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { alumno_id, curso_id, periodo_academico_id, monto, mes, año, estado } = req.body;
    const [result] = await connection.query<ResultSetHeader>('INSERT INTO mensualidades (alumno_id, curso_id, periodo_academico_id, monto, mes, año, estado) VALUES (?, ?, ?, ?, ?, ?, ?)', [alumno_id, curso_id || null, periodo_academico_id || null, monto, mes, año, estado || 'pendiente']);
    await connection.commit();
    return sendSuccess(res, { id: result.insertId }, 'Mensualidad registrada', 201);
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear mensualidad:', error);
    return sendError(res, 'Error al registrar mensualidad');
  } finally {
    connection.release();
  }
}

export async function updateMensualidad(req: Request, res: Response) {
  try {
    const { monto, estado, fecha_pago, observaciones } = req.body;
    await pool.query('UPDATE mensualidades SET monto = COALESCE(?, monto), estado = COALESCE(?, estado), fecha_pago = COALESCE(?, fecha_pago), observaciones = COALESCE(?, observaciones) WHERE id = ?', [monto, estado, fecha_pago, observaciones, req.params.id]);
    return sendSuccess(res, null, 'Mensualidad actualizada');
  } catch (error) {
    return sendError(res, 'Error al actualizar mensualidad');
  }
}

export async function getMensualidadById(req: Request, res: Response) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT m.*, u.nombre as alumno_nombre, u.apellido as alumno_apellido, a.codigo_alumno, cu.nombre as curso_nombre, pa.nombre as periodo FROM mensualidades m JOIN alumnos a ON m.alumno_id = a.id JOIN usuarios u ON a.usuario_id = u.id JOIN cursos cu ON m.curso_id = cu.id JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id WHERE m.id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'Mensualidad no encontrada', 404);
    return sendSuccess(res, rows[0]);
  } catch (error) {
    return sendError(res, 'Error al obtener mensualidad');
  }
}

export async function deleteMensualidad(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM mensualidades WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Mensualidad eliminada');
  } catch (error) {
    return sendError(res, 'Error al eliminar mensualidad');
  }
}

export async function getResumenMensualidades(req: Request, res: Response) {
  try {
    const { año } = req.query;
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT m.mes, SUM(m.monto) as total_mes, COUNT(*) as total, SUM(CASE WHEN m.estado = 'pagado' THEN 1 ELSE 0 END) as pagados, SUM(CASE WHEN m.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes FROM mensualidades m WHERE m.año = ? GROUP BY m.mes ORDER BY FIELD(m.mes, 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre')`, [año || '2026']);
    return sendSuccess(res, rows);
  } catch (error) {
    return sendError(res, 'Error al obtener resumen');
  }
}

export async function getAlumnosConDeuda(req: Request, res: Response) {
  try {
    const { mes, año } = req.query;
    let whereClause = 'WHERE m.estado = "pendiente"';
    const params: any[] = [];
    
    if (mes) { whereClause += ' AND m.mes = ?'; params.push(mes); }
    if (año) { whereClause += ' AND m.año = ?'; params.push(año); }
    
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT DISTINCT 
        a.id as alumno_id,
        a.codigo_alumno,
        u.nombre as alumno_nombre,
        u.apellido as alumno_apellido,
        u.email as alumno_email,
        u.telefono as alumno_telefono,
        g.nombre as grado,
        s.nombre as seccion,
        COUNT(m.id) as mensualidades_pendientes,
        SUM(m.monto) as total_deuda
      FROM mensualidades m
      JOIN alumnos a ON m.alumno_id = a.id
      JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN grados g ON a.grado_id = g.id
      LEFT JOIN secciones s ON a.seccion_id = s.id
      ${whereClause}
      GROUP BY a.id, a.codigo_alumno, u.nombre, u.apellido, u.email, u.telefono, g.nombre, s.nombre
      ORDER BY total_deuda DESC
    `, params);
    
    return sendSuccess(res, rows);
  } catch (error) {
    console.error('Error al obtener alumnos con deuda:', error);
    return sendError(res, 'Error al obtener alumnos con deuda');
  }
}
