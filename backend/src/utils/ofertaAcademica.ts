import { periodoVigenteSql } from './periodoVigencia';
import type { PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';

export interface OfertaRow extends RowDataPacket {
  periodo_grado_curso_id: number;
  periodo_academico_id: number;
  grado_id: number;
  curso_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_activo: number;
}

export async function getOfertaAccessible(
  ofertaId: number,
  userId: number,
  role: string,
  executor: Pick<PoolConnection, 'query'> = pool,
  lock = false
): Promise<OfertaRow | null> {
  if (!Number.isSafeInteger(ofertaId) || ofertaId <= 0) return null;
  if (role !== 'administrador' && role !== 'profesor') return null;

  const params: number[] = [ofertaId];
  let teacherFilter = '';
  if (role === 'profesor') {
    teacherFilter = `AND (
      EXISTS (
        SELECT 1 FROM periodo_grado_curso_profesores pgcp
        JOIN profesores p ON p.id = pgcp.profesor_id
        WHERE pgcp.periodo_grado_curso_id = pgc.id AND p.usuario_id = ?
      )
    )`;
    params.push(userId);
  }

  const [rows] = await executor.query<OfertaRow[]>(
        `SELECT pgc.id AS periodo_grado_curso_id, pgc.periodo_academico_id,
          pgc.grado_id, pgc.curso_id, ${periodoVigenteSql('pa')} AS periodo_activo,
          DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
          DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin
     FROM periodo_grado_cursos pgc
     JOIN periodos_academicos pa ON pa.id = pgc.periodo_academico_id
     WHERE pgc.id = ? ${teacherFilter} ${lock ? 'FOR UPDATE' : ''}`,
    params
  );
  return rows[0] || null;
}

// Same period -> offer lock order as academic structure and timetable mutations.
export async function lockOfertaForWrite(connection: PoolConnection, ofertaId: number, userId: number, role: string) {
  if (!Number.isSafeInteger(ofertaId) || ofertaId <= 0) return null;
  const [context] = await connection.query<RowDataPacket[]>('SELECT periodo_academico_id FROM periodo_grado_cursos WHERE id = ?', [ofertaId]);
  if (!context.length) return null;
  await connection.query('SELECT id FROM periodos_academicos WHERE id = ? FOR UPDATE', [context[0].periodo_academico_id]);
  return getOfertaAccessible(ofertaId, userId, role, connection, true);
}
