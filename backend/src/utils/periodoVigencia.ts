import type { RequestHandler } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { logError } from './logger';
import { sendError } from './response';

export const academicToday = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'}).format(date);
// Lima has a fixed UTC-05 offset; this does not require MySQL timezone tables.
export const academicTodaySql = 'DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR)';
export const periodoVigenteSql = (alias: string) => `(${alias}.activo = 1 AND ${academicTodaySql} BETWEEN ${alias}.fecha_inicio AND ${alias}.fecha_fin)`;
export function withinPeriod(start: string, end: string, today = academicToday()) {
  return today >= start && today <= end;
}

type PeriodDatabase = Pick<typeof pool, 'query'>;
export async function expirePeriods(db: PeriodDatabase = pool, today = academicToday()) {
  const [result] = await db.query<ResultSetHeader>('UPDATE periodos_academicos SET activo = 0 WHERE activo = 1 AND fecha_fin < ?', [today]);
  return result.affectedRows;
}

// One synchronization per Lima day and pool; failed attempts never mark the day complete.
const synchronized = new WeakMap<object, {day: string; promise: Promise<void>}>();
export async function ensurePeriodsCurrent(db: PeriodDatabase = pool, today = academicToday()) {
  let entry = synchronized.get(db);
  if (!entry || entry.day !== today) {
    entry = {day:today, promise:Promise.resolve()};
    const current = entry;
    entry.promise = expirePeriods(db, today).then(() => undefined).catch(error => {
      if (synchronized.get(db) === current) synchronized.delete(db);
      throw error;
    });
    synchronized.set(db, entry);
  }
  await entry.promise;
}

export const synchronizePeriodLifecycle: RequestHandler = (req, res, next) => {
  if (!(req as AuthRequest).user) return next();
  ensurePeriodsCurrent().then(() => next()).catch(error => {
    logError('No se pudo actualizar la vigencia de los periodos:', error);
    sendError(res, 'No se pudo verificar la vigencia del periodo académico. Intente nuevamente', 503);
  });
};
