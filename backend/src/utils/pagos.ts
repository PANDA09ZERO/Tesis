import { logError } from './logger';
import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { getPagination } from './pagination';
import { sendSuccess, sendError, sendPaginated } from './response';

export const mesesPago = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
type TipoPago = 'mensualidad' | 'matricula' | 'sueldo';
const configuraciones = {
  mensualidad: { tabla: 'mensualidades', persona: 'alumno_id', entidad: 'alumnos', monto: 'monto', estados: ['pendiente', 'pagado', 'vencido', 'descuento'] },
  matricula: { tabla: 'pagos_matricula', persona: 'alumno_id', entidad: 'alumnos', monto: 'monto', estados: ['pendiente', 'pagado'] },
  sueldo: { tabla: 'sueldos', persona: 'profesor_id', entidad: 'profesores', monto: 'monto_total', estados: ['pendiente', 'pagado', 'rechazado'] },
} as const;

class ErrorPago extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function entero(value: unknown, label: string, min = 1, max = 2147483647): number {
  if (!/^[0-9]+$/.test(String(value))) throw new ErrorPago(`${label} inválido`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new ErrorPago(`${label} inválido`);
  return number;
}
function importe(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw new ErrorPago('El monto debe ser un número con hasta dos decimales');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 99999999.99) throw new ErrorPago('Monto fuera del rango permitido');
  return number;
}
function fecha(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ErrorPago('Fecha de pago inválida');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || Number(value.slice(0, 4)) < 1000) throw new ErrorPago('Fecha de pago inválida');
  return value;
}
export function validarPago(tipo: TipoPago, body: any) {
  const config = configuraciones[tipo];
  const persona = entero(body[config.persona], tipo === 'sueldo' ? 'Profesor' : 'Alumno');
  const periodo = tipo === 'sueldo' ? null : entero(body.periodo_academico_id, 'Periodo académico');
  const monto = importe(body.monto ?? (tipo === 'sueldo' ? body.monto_total : undefined));
  const estado = body.estado ?? 'pendiente';
  if (!(config.estados as readonly string[]).includes(estado)) throw new ErrorPago('Estado de pago inválido');
  let mes: string | null = null, año: number | null = null;
  if (tipo !== 'matricula') {
    if (!mesesPago.includes(body.mes)) throw new ErrorPago('Mes de pago inválido');
    mes = body.mes;
    año = entero(body.año, 'Año', 1901, 2155);
  }
  const fechaPago = fecha(body.fecha_pago);
  if (estado === 'pagado' && !fechaPago) throw new ErrorPago('Indique la fecha del pago realizado');
  if (estado !== 'pagado' && fechaPago) throw new ErrorPago('La fecha de pago solo corresponde a un pago realizado');
  return { persona, periodo, monto, estado, mes, año, fechaPago };
}
function responderError(res: Response, error: any, operation: string) {
  if (error instanceof ErrorPago) return sendError(res, error.message, error.status);
  if (error?.code === 'ER_DUP_ENTRY') return sendError(res, 'Ya existe un pago para esta persona, concepto y periodo', 409);
  if (error?.code === 'ER_NO_REFERENCED_ROW_2') return sendError(res, 'La persona o el periodo seleccionado no existe', 400);
  logError(`Error al ${operation} pago:`, error);
  return sendError(res, `No se pudo ${operation} el pago`);
}
export function filtrosPago(tipo: TipoPago, query: any) {
  const config = configuraciones[tipo];
  const clauses: string[] = [], params: any[] = [];
  if (query.search) {
    clauses.push(tipo === 'sueldo' ? '(u.nombre LIKE ? OR u.apellido LIKE ?)' : '(u.nombre LIKE ? OR u.apellido LIKE ? OR p.codigo_alumno LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`);
    if (tipo !== 'sueldo') params.push(`%${query.search}%`);
  }
  if (query[config.persona]) { clauses.push(`m.${config.persona} = ?`); params.push(entero(query[config.persona], 'Persona')); }
  if (query.periodo_academico_id && tipo !== 'sueldo') { clauses.push('m.periodo_academico_id = ?'); params.push(entero(query.periodo_academico_id, 'Periodo académico')); }
  if (query.estado) {
    if (!(config.estados as readonly string[]).includes(query.estado)) throw new ErrorPago('Estado inválido');
    clauses.push('m.estado = ?'); params.push(query.estado);
  }
  if (tipo !== 'matricula') {
    if (query.mes) {
      if (!mesesPago.includes(query.mes)) throw new ErrorPago('Mes inválido');
      clauses.push('m.mes = ?'); params.push(query.mes);
    }
    if (query.año) { clauses.push('m.año = ?'); params.push(entero(query.año, 'Año', 1901, 2155)); }
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}
export function controladoresPago(tipo: TipoPago) {
  const config = configuraciones[tipo];
  const from = `FROM ${config.tabla} m JOIN ${config.entidad} p ON m.${config.persona} = p.id JOIN usuarios u ON p.usuario_id = u.id`;
  const joins = tipo === 'matricula' ? 'LEFT JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id' : 'LEFT JOIN cursos cu ON m.curso_id = cu.id LEFT JOIN periodos_academicos pa ON m.periodo_academico_id = pa.id';
  const fields = `m.*, u.nombre as ${tipo === 'sueldo' ? 'profesor' : 'alumno'}_nombre, u.apellido as ${tipo === 'sueldo' ? 'profesor' : 'alumno'}_apellido, pa.nombre as periodo${tipo === 'sueldo' ? '' : ', p.codigo_alumno'}${tipo === 'matricula' ? ', (SELECT MIN(ma.id) FROM matriculas ma WHERE ma.alumno_id = m.alumno_id AND ma.periodo_academico_id = m.periodo_academico_id) matricula_id' : ', cu.nombre as curso_nombre'}`;
  const list = async (req: Request, res: Response) => {
    try {
      const { page, limit, offset } = getPagination(req.query as any);
      const { where, params } = filtrosPago(tipo, req.query);
      const [count] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total ${from} ${where}`, params);
      const order = tipo === 'matricula' ? 'm.created_at DESC, m.id DESC' : `m.año DESC, FIELD(m.mes, ${mesesPago.map(m => `'${m}'`).join(',')}) DESC, m.id DESC`;
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${fields} ${from} ${joins} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return sendPaginated(res, rows, count[0].total, page, limit);
    } catch (error) { return responderError(res, error, 'consultar'); }
  };
  const get = async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${fields} ${from} ${joins} WHERE m.id = ?`, [entero(req.params.id, 'Identificador')]);
      if (!rows.length) return sendError(res, 'Pago no encontrado', 404);
      return sendSuccess(res, rows[0]);
    } catch (error) { return responderError(res, error, 'consultar'); }
  };
  const save = (update: boolean) => async (req: Request, res: Response) => {
    let connection;
    try {
      const id = update ? entero(req.params.id, 'Identificador') : null;
      // Validar altas antes de abrir una conexión; las modificaciones se validan con el registro persistido.
      const input = { ...req.body };
      if (!update && tipo === 'sueldo' && input.estado === undefined) {
        input.estado = 'pagado';
        input.fecha_pago ??= new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
      }
      if (!update) {
        if (tipo === 'matricula') entero(input.matricula_id, 'Matrícula académica');
        // El periodo de matrícula se obtiene después desde la inscripción, nunca del cliente.
        validarPago(tipo, tipo === 'matricula' ? { ...input, periodo_academico_id: 1 } : input);
      }
      connection = await pool.getConnection();
      await connection.beginTransaction();
      let old: any = {};
      if (update) {
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${config.tabla} WHERE id = ? FOR UPDATE`, [id]);
        if (!rows.length) throw new ErrorPago('Pago no encontrado', 404);
        old = rows[0];
      }
      const storedDate = old.fecha_pago instanceof Date ? `${old.fecha_pago.getFullYear()}-${String(old.fecha_pago.getMonth() + 1).padStart(2, '0')}-${String(old.fecha_pago.getDate()).padStart(2, '0')}` : old.fecha_pago;
      const body = { ...old, monto: old[config.monto], fecha_pago: storedDate, ...input };
      if (input.estado !== undefined && input.estado !== 'pagado' && input.fecha_pago === undefined) body.fecha_pago = null;
      if (tipo === 'matricula') {
        const alumnoId = entero(body.alumno_id, 'Alumno');
        if (update && alumnoId !== Number(old.alumno_id)) throw new ErrorPago('No se puede cambiar el alumno de un pago de matrícula');
        const [matriculas] = input.matricula_id !== undefined
          ? await connection.query<RowDataPacket[]>('SELECT id, alumno_id, periodo_academico_id FROM matriculas WHERE id = ? FOR UPDATE', [entero(input.matricula_id, 'Matrícula académica')])
          : await connection.query<RowDataPacket[]>('SELECT id, alumno_id, periodo_academico_id FROM matriculas WHERE alumno_id = ? AND periodo_academico_id = ? ORDER BY id LIMIT 1 FOR UPDATE', [alumnoId, old.periodo_academico_id]);
        if (!matriculas.length) throw new ErrorPago('El pago requiere una matrícula académica existente', 400);
        const matricula = matriculas[0];
        if (Number(matricula.alumno_id) !== alumnoId) throw new ErrorPago('La matrícula seleccionada no pertenece al alumno', 400);
        if (update && Number(matricula.periodo_academico_id) !== Number(old.periodo_academico_id)) throw new ErrorPago('No se puede cambiar la matrícula de un pago registrado');
        body.periodo_academico_id = matricula.periodo_academico_id;
      }
      const pago = validarPago(tipo, body);
      // Serializar altas por persona, también antes de instalar los índices únicos.
      const [personas] = await connection.query<RowDataPacket[]>(`SELECT id FROM ${config.entidad} WHERE id = ? FOR UPDATE`, [pago.persona]);
      if (!personas.length) throw new ErrorPago(tipo === 'sueldo' ? 'Profesor no encontrado' : 'Alumno no encontrado', 404);
      if (pago.periodo) {
        const [periodos] = await connection.query<RowDataPacket[]>('SELECT id FROM periodos_academicos WHERE id = ?', [pago.periodo]);
        if (!periodos.length) throw new ErrorPago('Periodo académico no encontrado', 404);
      }
      const unique = tipo === 'sueldo' ? 'profesor_id = ? AND mes = ? AND año = ?' : `alumno_id = ? AND periodo_academico_id = ?${tipo === 'mensualidad' ? ' AND mes = ? AND año = ?' : ''}`;
      const uniqueParams = tipo === 'sueldo' ? [pago.persona, pago.mes, pago.año] : [pago.persona, pago.periodo, ...(tipo === 'mensualidad' ? [pago.mes, pago.año] : [])];
      const [duplicates] = await connection.query<RowDataPacket[]>(`SELECT id FROM ${config.tabla} WHERE ${unique} AND id <> ? LIMIT 1`, [...uniqueParams, id ?? 0]);
      const conservaSueldoHistorico = update && tipo === 'sueldo' &&
        Number(old.profesor_id) === pago.persona && old.mes === pago.mes && Number(old.año) === pago.año;
      if (duplicates.length && !conservaSueldoHistorico) throw new ErrorPago('Ya existe un pago para esta persona, concepto y periodo', 409);
      const columns: string[] = [config.persona, config.monto, 'estado', 'fecha_pago'];
      const values: any[] = [pago.persona, pago.monto, pago.estado, pago.fechaPago];
      if (tipo !== 'sueldo') { columns.push('periodo_academico_id'); values.push(pago.periodo); }
      if (tipo !== 'matricula') { columns.push('mes', 'año'); values.push(pago.mes, pago.año); }
      if (tipo === 'sueldo' && !update) { columns.push('salario_base', 'horas_clase', 'monto_extra'); values.push(pago.monto, 0, 0); }
      // Los campos históricos de curso y desglose salarial se conservan al editar.
      const [result] = update
        ? await connection.query<ResultSetHeader>(`UPDATE ${config.tabla} SET ${columns.map(c => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [...values, id])
        : await connection.query<ResultSetHeader>(`INSERT INTO ${config.tabla} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
      await connection.commit();
      return sendSuccess(res, { id: id ?? result.insertId }, update ? 'Pago actualizado' : 'Pago registrado', update ? 200 : 201);
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch (rollbackError) { logError('No se pudo revertir la transacción de pago:', rollbackError); }
      }
      return responderError(res, error, update ? 'actualizar' : 'registrar');
    } finally { connection?.release(); }
  };
  const remove = async (req: Request, res: Response) => {
    try {
      const [result] = await pool.query<ResultSetHeader>(`DELETE FROM ${config.tabla} WHERE id = ?`, [entero(req.params.id, 'Identificador')]);
      if (!result.affectedRows) return sendError(res, 'Pago no encontrado', 404);
      return sendSuccess(res, null, 'Pago eliminado');
    } catch (error) { return responderError(res, error, 'eliminar'); }
  };
  const summary = async (req: Request, res: Response) => {
    try {
      const { where, params } = filtrosPago(tipo, req.query);
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${tipo === 'matricula' ? '' : 'm.mes,'}
        COUNT(*) total, COALESCE(SUM(m.${config.monto}), 0) total_mes,
        COALESCE(SUM(CASE WHEN m.estado = 'pagado' THEN m.${config.monto} ELSE 0 END), 0) total_pagado,
        COALESCE(SUM(CASE WHEN m.estado IN ('pendiente','vencido') THEN m.${config.monto} ELSE 0 END), 0) total_pendiente,
        COALESCE(SUM(m.estado = 'pagado'), 0) pagados,
        COALESCE(SUM(m.estado IN ('pendiente','vencido')), 0) pendientes
        ${from} ${where} ${tipo === 'matricula' ? '' : 'GROUP BY m.mes'}`, params);
      return sendSuccess(res, rows);
    } catch (error) { return responderError(res, error, 'consultar el resumen de'); }
  };
  return { list, get, create: save(false), update: save(true), remove, summary };
}
