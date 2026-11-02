import { validGrade } from '../utils/academicValidation';
import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendError, sendSuccess } from '../utils/response';
import { getOfertaAccessible, lockOfertaForWrite } from '../utils/ofertaAcademica';

export async function getEvaluacionesOferta(req: AuthRequest, res: Response) {
  try {
    const oferta = await getOfertaAccessible(Number(req.params.ofertaId), req.user!.userId, req.user!.rol);
    if (!oferta) return sendError(res, 'Oferta académica no encontrada', 404);
    const [evaluaciones] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM evaluaciones
       WHERE periodo_grado_curso_id = ?
       ORDER BY fecha_evaluacion DESC, id DESC`,
      [oferta.periodo_grado_curso_id]
    );
    return sendSuccess(res, evaluaciones);
  } catch (error) {
    logError('Error al obtener evaluaciones:', error);
    return sendError(res, 'Error al obtener evaluaciones');
  }
}

export async function createEvaluacionOferta(req: AuthRequest, res: Response) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;
  try {
    connection = await pool.getConnection();
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const oferta = await lockOfertaForWrite(connection, Number(req.params.ofertaId), req.user!.userId, req.user!.rol);
    if (!oferta) return sendError(res, 'Oferta académica no encontrada', 404);
    if (req.user?.rol === 'profesor' && !oferta.periodo_activo) return sendError(res, 'El periodo histórico es de solo consulta para profesores', 409);

    if (typeof req.body.nombre !== 'string' || (req.body.tipo !== undefined && typeof req.body.tipo !== 'string') || typeof req.body.fecha_evaluacion !== 'string'
      || (req.body.nota_maxima !== undefined && (typeof req.body.nota_maxima !== 'number' && (typeof req.body.nota_maxima !== 'string' || !req.body.nota_maxima.trim())))) return sendError(res,'Datos de evaluación no válidos',400);
    const nombre = req.body.nombre.trim();
    const tipo = String(req.body.tipo || 'practica').trim();
    const fecha = String(req.body.fecha_evaluacion || '');
    const notaMaxima = Number(req.body.nota_maxima ?? 20);
    const parsedDate = new Date(`${fecha}T00:00:00.000Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === fecha;

    if (!nombre || nombre.length > 150 || !tipo || tipo.length > 50 || !validDate
      || fecha < oferta.fecha_inicio || fecha > oferta.fecha_fin
      || !validGrade(notaMaxima) || notaMaxima <= 0) {
      return sendError(res, 'Datos de evaluación no válidos', 400);
    }

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO evaluaciones
        (periodo_grado_curso_id, nombre, tipo, fecha_evaluacion, nota_maxima, creado_por_usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [oferta.periodo_grado_curso_id, nombre, tipo, fecha, notaMaxima, req.user!.userId]
    );
    await connection.commit();
    return sendSuccess(res, { id: result.insertId }, 'Evaluación creada', 201);
  } catch (error) {
    logError('Error al crear evaluación:', error);
    return sendError(res, 'Error al crear evaluación');
  } finally {
    if (connection) {
      await connection.rollback().catch(error => logError('Error al cerrar la transacción:', error));
      connection.release();
    }
  }
}