import {positiveId} from '../utils/academicValidation';
import {finishTransaction} from '../utils/transaction';
import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { profesorHorarioScope } from '../utils/profesorAlcance';
import { sendError, sendSuccess } from '../utils/response';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DIA_POR_INDICE = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

interface HorarioPayload {
  periodo_grado_curso_id: number;
  profesor_id: number | null;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
}

interface OfertaHorarioRow extends RowDataPacket {
  id: number;
  periodo_academico_id: number;
  curso_id: number;
  docente_asignado: number;
}

interface HorarioExistenteRow extends RowDataPacket {
  id: number;
  periodo_grado_curso_id: number | null;
  profesor_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
}

function parseId(value:unknown):number|null{return positiveId(value)?Number(value):null;}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function timeValue(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requestedRange(req: Request): { start: string; end: string; periodId?: number } | null {
  const start = req.query.fecha_inicio;
  const end = req.query.fecha_fin;
  const periodId = req.query.periodo_id === undefined ? undefined : parseId(req.query.periodo_id);
  if (periodId === null || !validDate(start) || !validDate(end) || start > end) return null;

  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
  if (days > 62) return null;
  return periodId === undefined ? { start, end } : { start, end, periodId };
}

async function validateSchedule(
  connection: PoolConnection,
  input: HorarioPayload,
  excludeId?: number,
  identity?:Record<string,unknown>,
  original?:HorarioExistenteRow
): Promise<string | null> {
  if (!DIAS.includes(input.dia_semana)
    || !validTime(input.hora_inicio)
    || !validTime(input.hora_fin)
    || timeValue(input.hora_fin) <= timeValue(input.hora_inicio)
    || (input.aula !== null && input.aula.length > 50)) {
    return 'Los datos del horario no son válidos';
  }

  const [context]=await connection.query<RowDataPacket[]>('SELECT periodo_academico_id FROM periodo_grado_cursos WHERE id=?',[input.periodo_grado_curso_id]);
  if(!context.length)return 'La oferta académica seleccionada no existe';
  await connection.query('SELECT id FROM periodos_academicos WHERE id=? FOR UPDATE',[context[0].periodo_academico_id]);
  const [offers]=await connection.query<RowDataPacket[]>('SELECT id,periodo_academico_id,curso_id,grado_id FROM periodo_grado_cursos WHERE id=? FOR UPDATE',[input.periodo_grado_curso_id]);
  const offer=offers[0];if(!offer)return 'La oferta académica seleccionada no existe';
  for(const field of ['curso_id','grado_id','periodo_academico_id'])if(identity?.[field]!==undefined&&(!positiveId(identity[field])||Number(identity[field])!==Number(offer[field])))return 'Periodo, grado o curso no corresponden a la oferta seleccionada';
  const [teachers]=await connection.query<RowDataPacket[]>(`SELECT p.id,u.activo FROM periodo_grado_curso_profesores assigned
  JOIN profesores p ON p.id=assigned.profesor_id JOIN usuarios u ON u.id=p.usuario_id
  WHERE assigned.periodo_grado_curso_id=? ORDER BY p.id FOR UPDATE`,[input.periodo_grado_curso_id]);
  const enabled=teachers.filter(t=>Number(t.activo)===1);
  if(input.profesor_id===null){
    if(!enabled.length)return 'La oferta no tiene docentes activos asignados. Configúrala en Estructura académica';
    if(enabled.length>1)return 'La oferta tiene varios docentes. Selecciona quién dicta este horario';
    input.profesor_id=enabled[0].id;
  }
  const preserving=original&&original.periodo_grado_curso_id===input.periodo_grado_curso_id&&original.profesor_id===input.profesor_id&&teachers.some(t=>t.id===input.profesor_id);
  if(!preserving&&!enabled.some(t=>t.id===input.profesor_id))return 'El profesor debe estar activo y asignado a esta oferta académica';
  await connection.query('SELECT id FROM profesores WHERE id=? FOR UPDATE',[input.profesor_id]);
  const [conflicts] = await connection.query<RowDataPacket[]>(
    `SELECT id,
       CASE
         WHEN profesor_id = ? THEN 'profesor'
         WHEN periodo_grado_curso_id = ? THEN 'oferta'
         ELSE 'aula'
       END AS tipo_conflicto
     FROM horarios
     WHERE periodo_academico_id = ?
       AND dia_semana = ?
       AND id <> ?
       AND hora_inicio < ?
       AND hora_fin > ?
       AND (
         profesor_id = ?
         OR periodo_grado_curso_id = ?
         OR (? IS NOT NULL AND aula = ?)
       )
     ORDER BY CASE
       WHEN profesor_id = ? THEN 1
       WHEN periodo_grado_curso_id = ? THEN 2
       ELSE 3
     END
     LIMIT 1 FOR UPDATE`,
    [
      input.profesor_id, input.periodo_grado_curso_id,
      offer.periodo_academico_id, input.dia_semana, excludeId || 0,
      timeValue(input.hora_fin), timeValue(input.hora_inicio),
      input.profesor_id, input.periodo_grado_curso_id,
      input.aula, input.aula,
      input.profesor_id, input.periodo_grado_curso_id
    ]
  );
  const conflictType = conflicts[0]?.tipo_conflicto;
  if (conflictType === 'profesor') return 'El profesor ya tiene un horario en ese rango de tiempo';
  if (conflictType === 'oferta') return 'La oferta académica ya tiene un horario en ese rango de tiempo';
  if (conflictType === 'aula') return 'El aula ya está ocupada en ese rango de tiempo';
  return null;
}

function readPayload(body: Record<string, unknown>, existing?: HorarioExistenteRow): HorarioPayload | null {
  const offerId = parseId(body.periodo_grado_curso_id ?? existing?.periodo_grado_curso_id);
  const teacherValue=body.profesor_id===undefined?(offerId===existing?.periodo_grado_curso_id?existing.profesor_id:undefined):body.profesor_id;
  const teacherId=teacherValue===undefined?null:parseId(teacherValue);
  if(teacherValue!==undefined&&teacherId===null)return null;
  const day = body.dia_semana ?? existing?.dia_semana;
  const start = body.hora_inicio ?? existing?.hora_inicio;
  const end = body.hora_fin ?? existing?.hora_fin;
  const roomValue = body.aula === undefined ? existing?.aula ?? null : body.aula;
  if (roomValue !== null && typeof roomValue !== 'string') return null;
  const room = typeof roomValue === 'string' ? roomValue.trim() || null : null;

  if (!offerId || typeof day !== 'string' || typeof start !== 'string'
    || typeof end !== 'string' || (room !== null && typeof room !== 'string')) return null;
  return {
    periodo_grado_curso_id: offerId,
    profesor_id: teacherId,
    dia_semana: day,
    hora_inicio: start,
    hora_fin: end,
    aula: room
  };
}

export async function getAllHorarios(req: AuthRequest, res: Response) {
  try {
    const periodId = req.query.periodo_id === undefined ? undefined : parseId(req.query.periodo_id);
    const offerId = req.query.periodo_grado_curso_id === undefined
      ? undefined
      : parseId(req.query.periodo_grado_curso_id);
    if ((req.query.periodo_id !== undefined && !periodId)
      || (req.query.periodo_grado_curso_id !== undefined && !offerId)) {
      return sendError(res, 'Filtros de horario no válidos', 400);
    }

    const conditions: string[] = [];
    const params: (number | string)[] = [];
    if (periodId) {
      conditions.push('h.periodo_academico_id = ?');
      params.push(periodId);
    }
    if (offerId) {
      conditions.push('h.periodo_grado_curso_id = ?');
      params.push(offerId);
    }

    if (req.user?.rol === 'profesor') {
      const scope = profesorHorarioScope('h',req.user.userId);
      conditions.push(scope.sql); params.push(...scope.params);
    } else if (req.user?.rol !== 'administrador') {
      return sendError(res, 'No tiene permisos para consultar horarios', 403);
    }

    const [horarios] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, cu.nombre AS curso_nombre, cu.codigo AS curso_codigo,
              CONCAT(ub.nombre, ' ', ub.apellido) AS profesor_nombre,
              g.nombre AS grado, g.nivel, pa.nombre AS periodo,
              pgc.id AS oferta_academica_id
       FROM horarios h
       JOIN cursos cu ON h.curso_id = cu.id
       JOIN profesores p ON h.profesor_id = p.id
       JOIN usuarios ub ON p.usuario_id = ub.id
       JOIN periodos_academicos pa ON h.periodo_academico_id = pa.id
       LEFT JOIN periodo_grado_cursos pgc
         ON pgc.id = h.periodo_grado_curso_id
       LEFT JOIN grados g ON g.id = COALESCE(pgc.grado_id,cu.grado_id)
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'),
         h.hora_inicio`,
      params
    );
    return sendSuccess(res, horarios);
  } catch (error) {
    logError('Error al obtener horarios:', error);
    return sendError(res, 'Error al obtener horarios');
  }
}

export async function getCalendarEvents(req: AuthRequest, res: Response) {
  const range = requestedRange(req);
  if (!range) return sendError(res, 'Indique un rango de fechas válido de hasta 62 días', 400);
  const userId = req.user!.userId;
  const role = req.user!.rol;
  if (!['administrador', 'profesor', 'alumno', 'apoderado'].includes(role)) {
    return sendError(res, 'No tiene permisos para consultar el calendario', 403);
  }

  try {
    const scheduleConditions = [
      'pa.fecha_inicio <= ?',
      'pa.fecha_fin >= ?'
    ];
    const scheduleParams: (number | string)[] = [range.end, range.start];
    const eventConditions = [
      'e.fecha_evaluacion BETWEEN ? AND ?'
    ];
    const eventParams: (number | string)[] = [range.start, range.end];
    if (range.periodId) {
      scheduleConditions.push('pa.id = ?');
      scheduleParams.push(range.periodId);
      eventConditions.push('pgc.periodo_academico_id = ?');
      eventParams.push(range.periodId);
    }

    if (role === 'profesor') {
      const accessSql = `(
        EXISTS (
          SELECT 1 FROM periodo_grado_curso_profesores pgcp
          JOIN profesores assigned ON assigned.id = pgcp.profesor_id
          WHERE pgcp.periodo_grado_curso_id = pgc.id AND assigned.usuario_id = ?
        )
      )`;
      const scheduleScope = profesorHorarioScope('h',userId);
      scheduleConditions.push(scheduleScope.sql); scheduleParams.push(...scheduleScope.params);
      eventConditions.push(accessSql);
      eventParams.push(userId);
    } else if (role === 'alumno' || role === 'apoderado') {
      scheduleConditions.push('pgc.id IS NOT NULL AND pgc.curso_id=h.curso_id AND pgc.periodo_academico_id=h.periodo_academico_id');
      const enrollmentSql = `EXISTS (
        SELECT 1 FROM matriculas m
        JOIN alumnos a ON a.id = m.alumno_id
        ${role === 'apoderado' ? `JOIN apoderado_alumno aa ON aa.alumno_id = a.id
          JOIN apoderados ap ON ap.id = aa.apoderado_id` : ''}
        WHERE m.estado = 'activa'
          AND m.periodo_academico_id = pgc.periodo_academico_id
          AND m.curso_id = pgc.curso_id
          AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = pgc.grado_id
          ${role === 'alumno' ? 'AND a.usuario_id = ?' : 'AND ap.usuario_id = ?'}
      )`;
      scheduleConditions.push(enrollmentSql.replace(/pgc\.periodo_academico_id/g,'h.periodo_academico_id').replace(/pgc\.curso_id/g,'h.curso_id').replace(/pgc\.grado_id/g,'COALESCE(pgc.grado_id,c.grado_id)'));
      scheduleParams.push(userId);
      eventConditions.push(enrollmentSql);
      eventParams.push(userId);
    }

    const [schedules] = await pool.query<RowDataPacket[]>(
      `SELECT h.id, h.dia_semana, TIME_FORMAT(h.hora_inicio, '%H:%i') AS hora_inicio,
              TIME_FORMAT(h.hora_fin, '%H:%i') AS hora_fin, h.aula,
              pa.id AS periodo_academico_id, pa.nombre AS periodo,
              DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin,
              pgc.id AS periodo_grado_curso_id, g.nombre AS grado,
              c.nombre AS curso, c.codigo AS curso_codigo
       FROM horarios h
       JOIN periodos_academicos pa ON pa.id = h.periodo_academico_id
       LEFT JOIN periodo_grado_cursos pgc ON pgc.id = h.periodo_grado_curso_id
       JOIN cursos c ON c.id = h.curso_id
       LEFT JOIN grados g ON g.id = COALESCE(pgc.grado_id,c.grado_id)
       WHERE ${scheduleConditions.join(' AND ')}`,
      scheduleParams
    );
    const [evaluations] = await pool.query<RowDataPacket[]>(
      `SELECT e.id, e.nombre, e.tipo, DATE_FORMAT(e.fecha_evaluacion, '%Y-%m-%d') AS fecha,
              pa.id AS periodo_academico_id, pa.nombre AS periodo,
              pgc.id AS periodo_grado_curso_id, g.nombre AS grado,
              c.nombre AS curso, c.codigo AS curso_codigo
       FROM evaluaciones e
       JOIN periodo_grado_cursos pgc ON pgc.id = e.periodo_grado_curso_id
       JOIN periodos_academicos pa ON pa.id = pgc.periodo_academico_id
       JOIN grados g ON g.id = pgc.grado_id
       JOIN cursos c ON c.id = pgc.curso_id
       WHERE ${eventConditions.join(' AND ')}`,
      eventParams
    );

    const eventConditionsSql = ['fecha BETWEEN ? AND ?'];
    const eventParamsSql: (number | string)[] = [range.start, range.end];
    if (range.periodId) {
      eventConditionsSql.push('(periodo_academico_id = ? OR periodo_academico_id IS NULL)');
      eventParamsSql.push(range.periodId);
    }
    const [customEvents] = await pool.query<RowDataPacket[]>(
      `SELECT ec.id, ec.titulo, ec.descripcion, DATE_FORMAT(ec.fecha, '%Y-%m-%d') AS fecha,
              TIME_FORMAT(ec.hora_inicio, '%H:%i') AS hora_inicio,
              TIME_FORMAT(ec.hora_fin, '%H:%i') AS hora_fin, ec.tipo,
              pa.id AS periodo_academico_id, pa.nombre AS periodonombre
       FROM eventos_calendario ec
       LEFT JOIN periodos_academicos pa ON pa.id = ec.periodo_academico_id
       WHERE ${eventConditionsSql.join(' AND ')}`,
      eventParamsSql
    );

    const events: Array<Record<string, number | string | null>> = [];
    for (const schedule of schedules) {
      const firstDay = schedule.fecha_inicio > range.start ? schedule.fecha_inicio : range.start;
      const lastDay = schedule.fecha_fin < range.end ? schedule.fecha_fin : range.end;
      const date = new Date(`${firstDay}T00:00:00.000Z`);
      const lastDate = new Date(`${lastDay}T00:00:00.000Z`);
      for (; date <= lastDate; date.setUTCDate(date.getUTCDate() + 1)) {
        if (DIA_POR_INDICE[date.getUTCDay()] !== schedule.dia_semana) continue;
        const day = date.toISOString().slice(0, 10);
        events.push({
          id: `clase-${schedule.id}-${day}`,
          tipo: 'clase',
          titulo: schedule.curso,
          fecha: day,
          hora_inicio: schedule.hora_inicio,
          hora_fin: schedule.hora_fin,
          aula: schedule.aula,
          curso: schedule.curso,
          curso_codigo: schedule.curso_codigo,
          grado: schedule.grado,
          periodo: schedule.periodo,
          periodo_academico_id: schedule.periodo_academico_id,
          periodo_grado_curso_id: schedule.periodo_grado_curso_id
        });
      }
    }
    for (const evaluation of evaluations) {
      events.push({
        id: `evaluacion-${evaluation.id}`,
        tipo: 'evaluacion',
        titulo: evaluation.nombre,
        fecha: evaluation.fecha,
        hora_inicio: null,
        hora_fin: null,
        aula: null,
        curso: evaluation.curso,
        curso_codigo: evaluation.curso_codigo,
        grado: evaluation.grado,
        periodo: evaluation.periodo,
        periodo_academico_id: evaluation.periodo_academico_id,
        periodo_grado_curso_id: evaluation.periodo_grado_curso_id
      });
    }
    for (const ev of customEvents) {
      events.push({
        id: `custom-${ev.id}`,
        tipo: ev.tipo,
        titulo: ev.titulo,
        descripcion: ev.descripcion,
        fecha: ev.fecha,
        hora_inicio: ev.hora_inicio,
        hora_fin: ev.hora_fin,
        aula: null,
        curso: ev.tipo.toUpperCase(),
        curso_codigo: null,
        grado: 'General',
        periodo: ev.periodonombre || 'Institucional',
        periodo_academico_id: ev.periodo_academico_id,
        periodo_grado_curso_id: null
      });
    }
    events.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))
      || String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''))
      || String(a.titulo).localeCompare(String(b.titulo)));
    return sendSuccess(res, events);
  } catch (error) {
    logError('Error al obtener eventos del calendario:', error);
    return sendError(res, 'Error al obtener eventos del calendario');
  }
}

export async function createHorario(req: AuthRequest, res: Response) {
  const input = readPayload(req.body);
  if (!input) return sendError(res, 'Datos del horario no válidos', 400);
  let connection:PoolConnection|undefined,committed=false;
  try {
    connection=await pool.getConnection();
    await connection.beginTransaction();
    const validationError = await validateSchedule(connection, input,undefined,req.body);
    if (validationError) {
    const conflict = validationError === 'El profesor ya tiene un horario en ese rango de tiempo'
      || validationError === 'La oferta académica ya tiene un horario en ese rango de tiempo'
      || validationError === 'El aula ya está ocupada en ese rango de tiempo';
    return sendError(res, validationError, conflict ? 409 : 400);
    }
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO horarios
        (curso_id, profesor_id, periodo_academico_id, periodo_grado_curso_id,
         dia_semana, hora_inicio, hora_fin, aula)
       SELECT curso_id, ?, periodo_academico_id, id, ?, ?, ?, ?
       FROM periodo_grado_cursos WHERE id = ?`,
      [input.profesor_id, input.dia_semana, timeValue(input.hora_inicio),
        timeValue(input.hora_fin), input.aula, input.periodo_grado_curso_id]
    );
    await connection.commit();committed=true;
    return sendSuccess(res, { id: result.insertId }, 'Horario creado exitosamente', 201);
  } catch (error) {
    if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes((error as any)?.code))return sendError(res,'Otra operación modificó la programación. Reintenta la consulta antes de guardar',409);
    logError('Error al crear horario:', error);
    return sendError(res, 'Error al crear horario');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function updateHorario(req: AuthRequest, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de horario no válido', 400);
  let connection:PoolConnection|undefined,committed=false;
  try {
    connection=await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query<HorarioExistenteRow[]>(
      `SELECT id, periodo_grado_curso_id, profesor_id, dia_semana, hora_inicio,
              hora_fin, aula
       FROM horarios WHERE id = ? FOR UPDATE`,
      [id]
    );
    const existing = rows[0];
    if (!existing) {
      return sendError(res, 'Horario no encontrado', 404);
    }
    const input = readPayload(req.body, existing);
    if (!input) {
      return sendError(res, 'Datos del horario no válidos', 400);
    }
    const validationError = await validateSchedule(connection, input, id,req.body,existing);
    if (validationError) {
      const conflict = validationError === 'El profesor ya tiene un horario en ese rango de tiempo'
        || validationError === 'La oferta académica ya tiene un horario en ese rango de tiempo'
        || validationError === 'El aula ya está ocupada en ese rango de tiempo';
      return sendError(res, validationError, conflict ? 409 : 400);
    }
    await connection.query(
      `UPDATE horarios
       SET curso_id = (SELECT curso_id FROM periodo_grado_cursos WHERE id = ?),
           periodo_academico_id = (
             SELECT periodo_academico_id FROM periodo_grado_cursos WHERE id = ?
           ),
           periodo_grado_curso_id = ?, profesor_id = ?, dia_semana = ?,
           hora_inicio = ?, hora_fin = ?, aula = ?
       WHERE id = ?`,
      [input.periodo_grado_curso_id, input.periodo_grado_curso_id,
        input.periodo_grado_curso_id, input.profesor_id, input.dia_semana,
        timeValue(input.hora_inicio), timeValue(input.hora_fin), input.aula, id]
    );
    await connection.commit();committed=true;
    return sendSuccess(res, null, 'Horario actualizado');
  } catch (error) {
    if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes((error as any)?.code))return sendError(res,'Otra operación modificó la programación. Reintenta la consulta antes de guardar',409);
    logError('Error al actualizar horario:', error);
    return sendError(res, 'Error al actualizar horario');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function deleteHorario(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'Identificador de horario no válido', 400);
  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM horarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 'Horario no encontrado', 404);
    return sendSuccess(res, null, 'Horario eliminado');
  } catch (error) {
    logError('Error al eliminar horario:', error);
    return sendError(res, 'Error al eliminar horario');
  }
}

export async function createEventoCalendario(req: AuthRequest, res: Response) {
  const role = req.user!.rol;
  if (role !== 'administrador' && role !== 'profesor') {
    return sendError(res, 'No tiene permisos para crear eventos en el calendario', 403);
  }
  const { titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, periodo_academico_id } = req.body || {};
  // Validación: tipos, longitudes y valores permitidos según el esquema (VARCHAR(150), ENUM tipo).
  const tituloLimpio = typeof titulo === 'string' ? titulo.trim() : '';
  if (!tituloLimpio || !validDate(fecha)) {
    return sendError(res, 'Título y fecha válida (AAAA-MM-DD) son obligatorios', 400);
  }
  if (tituloLimpio.length > 150) return sendError(res, 'El título admite como máximo 150 caracteres', 400);
  if (descripcion !== undefined && descripcion !== null && (typeof descripcion !== 'string' || descripcion.length > 5000)) {
    return sendError(res, 'Descripción inválida (máximo 5000 caracteres)', 400);
  }
  const tipoEvento = tipo === undefined || tipo === null || tipo === '' ? 'institucional' : tipo;
  if (!['institucional', 'feriado', 'reunion', 'otro'].includes(tipoEvento)) return sendError(res, 'Tipo de evento inválido', 400);
  const periodoId = periodo_academico_id === undefined || periodo_academico_id === null || periodo_academico_id === '' ? null : parseId(periodo_academico_id);
  if (periodo_academico_id !== undefined && periodo_academico_id !== null && periodo_academico_id !== '' && !periodoId) {
    return sendError(res, 'Periodo académico inválido', 400);
  }
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const inicio = hora_inicio ? String(hora_inicio).slice(0, 5) : null;
  const fin = hora_fin ? String(hora_fin).slice(0, 5) : null;
  if ((inicio && !timePattern.test(inicio)) || (fin && !timePattern.test(fin))) {
    return sendError(res, 'Indique una hora válida en formato HH:MM', 400);
  }
  if (fin && !inicio) return sendError(res, 'Indique primero la hora de inicio', 400);
  if (inicio && fin && fin <= inicio) {
    return sendError(res, 'La hora de fin debe ser posterior a la hora de inicio', 400);
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO eventos_calendario(titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, periodo_academico_id, creado_por_usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tituloLimpio, typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null, fecha,
        inicio ? `${inicio}:00` : null, fin ? `${fin}:00` : null,
        tipoEvento, periodoId, req.user!.userId]
    );
    return sendSuccess(res, { id: result.insertId }, 'Evento creado con éxito', 201);
  } catch (error) {
    if ((error as any)?.code === 'ER_NO_REFERENCED_ROW_2') return sendError(res, 'El periodo académico no existe', 400);
    logError('Error al crear evento de calendario:', error);
    return sendError(res, 'No se pudo crear el evento');
  }
}

export async function deleteEventoCalendario(req: AuthRequest, res: Response) {
  const role = req.user!.rol;
  if (role !== 'administrador' && role !== 'profesor') {
    return sendError(res, 'No tiene permisos para eliminar eventos', 403);
  }
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 'ID de evento inválido', 400);
  try {
    // Seguridad (IDOR): antes cualquier profesor podía borrar cualquier evento, incluidos los
    // institucionales creados por administración. Ahora un profesor solo elimina los eventos que creó.
    const [result] = role === 'administrador'
      ? await pool.query<ResultSetHeader>('DELETE FROM eventos_calendario WHERE id = ?', [id])
      : await pool.query<ResultSetHeader>('DELETE FROM eventos_calendario WHERE id = ? AND creado_por_usuario_id = ?', [id, req.user!.userId]);
    if (result.affectedRows === 0) return sendError(res, role === 'administrador' ? 'Evento no encontrado' : 'Evento no encontrado o creado por otro usuario', 404);
    return sendSuccess(res, null, 'Evento eliminado');
  } catch (error) {
    logError('Error al eliminar evento de calendario:', error);
    return sendError(res, 'No se pudo eliminar el evento');
  }
}

