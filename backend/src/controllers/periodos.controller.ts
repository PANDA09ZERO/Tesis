import { ensurePeriodsCurrent, withinPeriod } from '../utils/periodoVigencia';
import { PoolConnection } from 'mysql2/promise';
import { positiveId, validDate } from '../utils/academicValidation';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { profesorOfertaScope } from '../utils/profesorAlcance';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAllPeriodos(req: AuthRequest, res: Response) {
  try {
    await ensurePeriodsCurrent();
    const scope = req.user?.rol === 'profesor' ? profesorOfertaScope('scope_pgc', req.user.userId) : null;
    const [periodos] = await pool.query<RowDataPacket[]>(
      `SELECT pa.* FROM periodos_academicos pa ${scope ? 'WHERE EXISTS (SELECT 1 FROM periodo_grado_cursos scope_pgc WHERE scope_pgc.periodo_academico_id = pa.id AND ' + scope.sql + ')' : ''} ORDER BY pa.fecha_inicio DESC`, scope?.params || []
    );
    return sendSuccess(res, periodos);
  } catch (error) {
    return sendError(res, 'Error al obtener periodos');
  }
}

// El bloqueo se comparte entre procesos y se libera antes de devolver la conexión al pool.
async function writePeriodo(req: Request, res: Response, operation: 'create' | 'update' | 'delete') {
  let connection: PoolConnection | undefined;
  let locked = false;
  let transaction = false;
  try {
    if (operation !== 'create' && !positiveId(req.params.id)) return sendError(res, 'Periodo inválido', 400);
    connection = await pool.getConnection();
    const [lock] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK(CONCAT(LEFT(DATABASE(), 40), ':periodos'), 10) AS acquired");
    if (Number(lock[0].acquired) !== 1) return sendError(res, 'Hay otra operación de periodos en curso. Intente nuevamente', 409);
    locked = true;
    await connection.beginTransaction(); transaction = true;
    let previous: any = {};
    if (operation !== 'create') {
      const [rows] = await connection.query<RowDataPacket[]>("SELECT *, DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS inicio, DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fin FROM periodos_academicos WHERE id = ? FOR UPDATE", [req.params.id]);
      if (!rows.length) return sendError(res, 'Periodo no encontrado', 404);
      previous = {...rows[0], fecha_inicio: rows[0].inicio, fecha_fin: rows[0].fin, activo: rows[0].activo ?? 0};
    }
    if (operation === 'delete') {
      // Incluye referencias con CASCADE: nunca dejar que eliminar el periodo borre su historia.
      const [references] = await connection.query<RowDataPacket[]>(`SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'periodo_academico_id'`);
      for (const ref of references) {
        if (!/^[a-zA-Z0-9_]+$/.test(ref.tabla)) throw new Error('Nombre de tabla no válido');
        const [rows] = await connection.query<RowDataPacket[]>('SELECT 1 FROM `'+ref.tabla+'` WHERE periodo_academico_id = ? LIMIT 1', [req.params.id]);
        if (rows.length) return sendError(res, 'El periodo tiene registros vinculados y no puede eliminarse', 409);
      }
      await connection.query('DELETE FROM periodos_academicos WHERE id = ?', [req.params.id]);
    } else {
      const values = {...previous, ...req.body};
      const {nombre, fecha_inicio, fecha_fin} = values;
      const activo = values.activo === undefined ? 0 : values.activo;
      if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 100 || !validDate(fecha_inicio) || !validDate(fecha_fin) || fecha_inicio > fecha_fin || ![true,false,0,1].includes(activo)) return sendError(res, 'Ingrese nombre, fechas válidas en orden y un estado válido', 400);
      if (activo && !withinPeriod(fecha_inicio, fecha_fin)) return sendError(res, 'Solo se puede activar un periodo dentro de sus fechas de inicio y fin (hora de Lima)', 400);
      if (activo) await connection.query('UPDATE periodos_academicos SET activo = 0 WHERE activo = 1');
      if (operation === 'create') {
        const [result] = await connection.query<ResultSetHeader>('INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, ?)', [nombre.trim(), fecha_inicio, fecha_fin, Number(activo)]);
        previous.id = result.insertId;
      } else await connection.query('UPDATE periodos_academicos SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, activo = ? WHERE id = ?', [nombre.trim(), fecha_inicio, fecha_fin, Number(activo), req.params.id]);
    }
    await connection.commit(); transaction = false;
    return sendSuccess(res, operation === 'create' ? {id: previous.id} : null, operation === 'delete' ? 'Periodo eliminado' : 'Periodo guardado', operation === 'create' ? 201 : 200);
  } catch (error: any) {
    if (error?.code === 'ER_ROW_IS_REFERENCED_2') return sendError(res, 'El periodo tiene registros vinculados y no puede eliminarse', 409);
    return sendError(res, 'No se pudo guardar el cambio del periodo');
  } finally {
    if (connection) {
      if (transaction) { try { await connection.rollback(); } catch { connection.destroy(); connection = undefined; } }
      if (locked && connection) { try { await connection.query("SELECT RELEASE_LOCK(CONCAT(LEFT(DATABASE(), 40), ':periodos'))"); } catch { connection.destroy(); connection = undefined; } }
      connection?.release();
    }
  }
}
export const createPeriodo = (req: Request, res: Response) => writePeriodo(req,res,'create');
export const updatePeriodo = (req: Request, res: Response) => writePeriodo(req,res,'update');
export const deletePeriodo = (req: Request, res: Response) => writePeriodo(req,res,'delete');
