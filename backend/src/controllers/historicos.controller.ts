import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { logError } from '../utils/logger';
import { finishTransaction } from '../utils/transaction';
import { validDate } from '../utils/academicValidation';
import { createInstitutionalCredentials, generateStudentCode } from '../utils/credentials';
import { leerHojaCalculo, HojaInvalida } from '../utils/hojaCalculo';

// Alumnos anteriores al sistema: se registran solo con sus datos, sin matrícula
// y con la cuenta desactivada (no pueden iniciar sesión hasta que se reactiven).

export const ESTADOS_HISTORICOS = ['egresado', 'retirado', 'trasladado'] as const;
export const MAX_FILAS_IMPORTACION = 2000;

export interface FilaHistorica {
  dni: string | null; nombre: string; apellido: string; fecha_nacimiento: string | null; genero: 'M' | 'F' | 'Otro';
  telefono: string | null; direccion: string | null; estado: typeof ESTADOS_HISTORICOS[number];
  anio_ingreso: number | null; anio_ultimo_estudio: number | null; ultimo_grado_cursado: string | null; observaciones: string | null;
  apoderado: { dni: string; nombre: string | null; apellido: string | null; telefono: string | null; parentesco: string | null } | null;
}
export interface FilaRevisada { fila: number; datos: FilaHistorica; errores: string[]; advertencias: string[] }

const COLUMNAS: Record<string, keyof typeof ALIAS> = {};
const ALIAS = {
  dni: ['dni', 'documento', 'nro_documento', 'numero_documento', 'dni_alumno', 'documento_alumno'],
  nombre: ['nombre', 'nombres', 'nombre_alumno', 'nombres_alumno'],
  apellido: ['apellido', 'apellidos', 'apellidos_alumno', 'apellido_alumno'],
  fecha_nacimiento: ['fecha_nacimiento', 'fecha_de_nacimiento', 'nacimiento', 'f_nacimiento'],
  genero: ['genero', 'sexo'],
  telefono: ['telefono', 'celular', 'telefono_alumno'],
  direccion: ['direccion', 'domicilio'],
  estado: ['estado', 'situacion', 'condicion'],
  anio_ingreso: ['anio_ingreso', 'ano_ingreso', 'ingreso', 'anio_de_ingreso', 'ano_de_ingreso'],
  anio_ultimo_estudio: ['anio_ultimo_estudio', 'ano_ultimo_estudio', 'anio_egreso', 'ano_egreso', 'anio_salida', 'ano_salida', 'ultimo_anio', 'ultimo_ano', 'anio_ultimo', 'ano_ultimo'],
  ultimo_grado_cursado: ['ultimo_grado_cursado', 'ultimo_grado', 'grado', 'grado_cursado'],
  observaciones: ['observaciones', 'observacion', 'notas', 'comentarios'],
  apoderado_dni: ['apoderado_dni', 'dni_apoderado'],
  apoderado_nombre: ['apoderado_nombre', 'apoderado_nombres', 'nombre_apoderado', 'nombres_apoderado'],
  apoderado_apellido: ['apoderado_apellido', 'apoderado_apellidos', 'apellido_apoderado', 'apellidos_apoderado'],
  apoderado_telefono: ['apoderado_telefono', 'telefono_apoderado', 'celular_apoderado'],
  parentesco: ['parentesco', 'apoderado_parentesco']
};
for (const [campo, nombres] of Object.entries(ALIAS)) for (const n of nombres) COLUMNAS[n] = campo as keyof typeof ALIAS;

export const normalizarEncabezado = (valor: string) => valor.normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const texto = (valor: unknown) => typeof valor === 'string' ? valor.trim() : valor == null ? '' : String(valor).trim();

function normalizarDni(valor: string, advertencias: string[], etiqueta: string): string | null | false {
  const limpio = valor.replace(/[\s.-]/g, '');
  if (!limpio) return null;
  if (/^\d{1,7}$/.test(limpio)) { advertencias.push(`${etiqueta}: se completó con ceros a la izquierda (${limpio.padStart(8, '0')})`); return limpio.padStart(8, '0'); }
  return /^[A-Za-z0-9]{8,12}$/.test(limpio) ? limpio.toUpperCase() : false;
}

function normalizarFecha(valor: string): string | null | false {
  if (!valor) return null;
  if (/^\d{4,5}(\.\d+)?$/.test(valor)) { // número de serie de Excel
    const serie = Math.floor(Number(valor));
    if (serie < 1 || serie > 80000) return false;
    return new Date(Date.UTC(1899, 11, 30) + serie * 86400000).toISOString().slice(0, 10);
  }
  let m = valor.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  let iso = m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
  if (!m) { m = valor.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return iso && validDate(iso) ? iso : false;
}

function normalizarGenero(valor: string): 'M' | 'F' | 'Otro' | false {
  const v = normalizarEncabezado(valor);
  if (!v) return 'Otro';
  if (['m', 'masculino', 'hombre', 'varon', 'h'].includes(v)) return 'M';
  if (['f', 'femenino', 'mujer'].includes(v)) return 'F';
  if (['otro', 'o', 'x'].includes(v)) return 'Otro';
  return false;
}

function normalizarEstado(valor: string): FilaHistorica['estado'] | false {
  const v = normalizarEncabezado(valor);
  if (!v || v.startsWith('egres') || v === 'concluyo' || v === 'termino') return 'egresado';
  if (v.startsWith('retir')) return 'retirado';
  if (v.startsWith('trasl') || v.startsWith('transf')) return 'trasladado';
  return false;
}

function normalizarAnio(valor: string): number | null | false {
  if (!valor) return null;
  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= 1950 && anio <= new Date().getFullYear() ? anio : false;
}

/** Valida y normaliza una fila (venga del Excel o del formulario). */
export function revisarFila(origen: Record<string, unknown>, fila: number): FilaRevisada {
  const errores: string[] = [], advertencias: string[] = [];
  const v = (campo: keyof typeof ALIAS) => texto(origen[campo]);
  const limitar = (campo: keyof typeof ALIAS, max: number, etiqueta: string) => {
    const valor = v(campo); if (valor.length > max) errores.push(`${etiqueta}: máximo ${max} caracteres`); return valor || null;
  };

  const nombre = v('nombre'), apellido = v('apellido');
  if (!nombre) errores.push('Falta el nombre');
  if (!apellido) errores.push('Falta el apellido');
  if (nombre.length > 100 || apellido.length > 100) errores.push('Nombre o apellido demasiado largo');

  const dni = normalizarDni(v('dni'), advertencias, 'DNI');
  if (dni === false) errores.push('DNI inválido: usa 8 dígitos (o 8 a 12 caracteres si es carné de extranjería)');
  else if (dni === null) advertencias.push('Sin DNI: será más difícil ubicarlo cuando pida sus papeles');

  const fecha = normalizarFecha(v('fecha_nacimiento'));
  if (fecha === false) errores.push('Fecha de nacimiento inválida: usa DD/MM/AAAA');
  const genero = normalizarGenero(v('genero'));
  if (genero === false) errores.push('Género inválido: usa M o F');
  const estado = normalizarEstado(v('estado'));
  if (estado === false) errores.push('Estado inválido: usa egresado, retirado o trasladado');
  const ingreso = normalizarAnio(v('anio_ingreso'));
  if (ingreso === false) errores.push('Año de ingreso inválido');
  const ultimo = normalizarAnio(v('anio_ultimo_estudio'));
  if (ultimo === false) errores.push('Último año de estudio inválido');
  else if (ultimo === null) advertencias.push('Sin último año de estudio');
  if (typeof ingreso === 'number' && typeof ultimo === 'number' && ingreso > ultimo) errores.push('El año de ingreso es posterior al último año de estudio');

  const telefono = limitar('telefono', 20, 'Teléfono');
  const direccion = limitar('direccion', 500, 'Dirección');
  const grado = limitar('ultimo_grado_cursado', 80, 'Último grado');
  const observaciones = limitar('observaciones', 2000, 'Observaciones');

  let apoderado: FilaHistorica['apoderado'] = null;
  const apoderadoDni = normalizarDni(v('apoderado_dni'), advertencias, 'DNI del apoderado');
  if (apoderadoDni === false) errores.push('DNI del apoderado inválido');
  else if (apoderadoDni) {
    if (apoderadoDni === dni) errores.push('El DNI del apoderado es igual al del alumno');
    apoderado = { dni: apoderadoDni, nombre: limitar('apoderado_nombre', 100, 'Nombre del apoderado'), apellido: limitar('apoderado_apellido', 100, 'Apellido del apoderado'),
      telefono: limitar('apoderado_telefono', 20, 'Teléfono del apoderado'), parentesco: limitar('parentesco', 50, 'Parentesco') };
  } else if (v('apoderado_nombre') || v('apoderado_apellido')) advertencias.push('Apoderado sin DNI: no se registrará');

  return { fila, errores, advertencias, datos: {
    dni: dni || null, nombre, apellido, fecha_nacimiento: fecha || null, genero: genero || 'Otro', telefono, direccion,
    estado: estado || 'egresado', anio_ingreso: ingreso || null, anio_ultimo_estudio: ultimo || null,
    ultimo_grado_cursado: grado, observaciones, apoderado
  } };
}

/** Comprueba DNIs repetidos en el archivo y ya registrados en la base. */
async function revisarContraBase(filas: FilaRevisada[], db: Pick<typeof pool, 'query'>) {
  const vistos = new Map<string, number>();
  for (const f of filas) {
    if (!f.datos.dni) continue;
    const previa = vistos.get(f.datos.dni);
    if (previa) f.errores.push(`DNI repetido en el archivo (fila ${previa})`); else vistos.set(f.datos.dni, f.fila);
  }
  const dnis = [...new Set(filas.flatMap(f => [f.datos.dni, f.datos.apoderado?.dni]).filter(Boolean))] as string[];
  const registrados = new Map<string, { rol: string; nombre: string }>();
  for (let i = 0; i < dnis.length; i += 500) {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT u.dni, r.nombre rol, CONCAT(u.nombre,' ',u.apellido) nombre
      FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.dni IN (?)`, [dnis.slice(i, i + 500)]);
    for (const r of rows) registrados.set(String(r.dni).toUpperCase(), { rol: r.rol, nombre: r.nombre });
  }
  const apoderadosNuevos = new Map<string, FilaHistorica['apoderado']>();
  for (const f of filas) {
    const existente = f.datos.dni ? registrados.get(f.datos.dni) : undefined;
    if (existente) f.errores.push(`El DNI ya está registrado (${existente.rol}: ${existente.nombre})`);
    const ap = f.datos.apoderado;
    if (!ap) continue;
    const usuarioAp = registrados.get(ap.dni);
    if (usuarioAp && usuarioAp.rol !== 'apoderado') f.errores.push(`El DNI del apoderado pertenece a un ${usuarioAp.rol} (${usuarioAp.nombre})`);
    else if (usuarioAp) f.advertencias.push(`Se vinculará con el apoderado ya registrado ${usuarioAp.nombre}`);
    else if (vistos.has(ap.dni)) f.errores.push('El DNI del apoderado coincide con el de un alumno del archivo');
    else if (!apoderadosNuevos.has(ap.dni) && (!ap.nombre || !ap.apellido)) f.errores.push('Apoderado nuevo: faltan sus nombres y apellidos');
    else if (!apoderadosNuevos.has(ap.dni)) apoderadosNuevos.set(ap.dni, ap);
  }
}

async function rolId(db: PoolConnection, nombre: string) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM roles WHERE nombre = ?', [nombre]);
  if (!rows.length) throw new Error(`Falta el rol ${nombre}`);
  return rows[0].id as number;
}

/** Inserta las filas ya validadas dentro de la transacción recibida. */
async function insertarHistoricos(connection: PoolConnection, filas: FilaHistorica[]) {
  // Cuenta desactivada: la contraseña es aleatoria y nadie la conoce. Al reactivar la
  // cuenta se debe restablecer la contraseña. Un solo hash evita minutos de bcrypt.
  const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), 12);
  const [rolAlumno, rolApoderado] = [await rolId(connection, 'alumno'), await rolId(connection, 'apoderado')];
  const apoderados = new Map<string, number>();
  const creados: { id: number; codigo_alumno: string; nombre: string; apellido: string; dni: string | null }[] = [];
  let apoderadosCreados = 0;

  for (const d of filas) {
    const { email } = await createInstitutionalCredentials(connection, 'alumno', d.nombre, d.apellido);
    const [usuario] = await connection.query<ResultSetHeader>(`INSERT INTO usuarios (email, password_hash, debe_cambiar_password,
      nombre, apellido, dni, telefono, direccion, fecha_nacimiento, genero, rol_id, activo) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [email, passwordHash, d.nombre, d.apellido, d.dni, d.telefono, d.direccion, d.fecha_nacimiento, d.genero, rolAlumno]);
    const codigo = generateStudentCode();
    const [alumno] = await connection.query<ResultSetHeader>(`INSERT INTO alumnos (usuario_id, codigo_alumno, estado, es_historico,
      anio_ingreso, anio_ultimo_estudio, ultimo_grado_cursado, observaciones_historicas) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [usuario.insertId, codigo, d.estado, d.anio_ingreso, d.anio_ultimo_estudio, d.ultimo_grado_cursado, d.observaciones]);
    creados.push({ id: alumno.insertId, codigo_alumno: codigo, nombre: d.nombre, apellido: d.apellido, dni: d.dni });

    if (!d.apoderado) continue;
    let apoderadoId = apoderados.get(d.apoderado.dni);
    if (!apoderadoId) {
      const [existente] = await connection.query<RowDataPacket[]>(`SELECT ap.id FROM apoderados ap JOIN usuarios u ON u.id = ap.usuario_id WHERE u.dni = ?`, [d.apoderado.dni]);
      if (existente.length) apoderadoId = existente[0].id as number;
      else {
        const ap = d.apoderado;
        const { email: emailAp } = await createInstitutionalCredentials(connection, 'apoderado', ap.nombre!, ap.apellido!);
        const [usuarioAp] = await connection.query<ResultSetHeader>(`INSERT INTO usuarios (email, password_hash, debe_cambiar_password,
          nombre, apellido, dni, telefono, rol_id, activo) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 0)`,
          [emailAp, passwordHash, ap.nombre, ap.apellido, ap.dni, ap.telefono, rolApoderado]);
        const [nuevo] = await connection.query<ResultSetHeader>('INSERT INTO apoderados (usuario_id) VALUES (?)', [usuarioAp.insertId]);
        apoderadoId = nuevo.insertId; apoderadosCreados++;
      }
      apoderados.set(d.apoderado.dni, apoderadoId);
    }
    await connection.query('INSERT IGNORE INTO apoderado_alumno (apoderado_id, alumno_id, parentesco) VALUES (?, ?, ?)',
      [apoderadoId, alumno.insertId, d.apoderado.parentesco]);
  }
  return { creados, apoderadosCreados };
}

function filasDesdeHoja(hoja: string[][]): { filas: FilaRevisada[]; columnasIgnoradas: string[] } {
  if (hoja.length < 2) throw new HojaInvalida('El archivo no tiene filas de alumnos debajo de los encabezados');
  const encabezados = hoja[0].map(h => COLUMNAS[normalizarEncabezado(h)]);
  const reconocidas = new Set(encabezados.filter(Boolean));
  if (!reconocidas.has('nombre') || !reconocidas.has('apellido')) throw new HojaInvalida('La primera fila debe tener los encabezados; como mínimo "nombres" y "apellidos". Descarga la plantilla.');
  if (hoja.length - 1 > MAX_FILAS_IMPORTACION) throw new HojaInvalida(`Máximo ${MAX_FILAS_IMPORTACION} alumnos por archivo; divídelo en partes`);
  const columnasIgnoradas = hoja[0].filter((h, i) => h && !encabezados[i]);
  const filas = hoja.slice(1).map((celdas, i) => {
    const origen: Record<string, string> = {};
    encabezados.forEach((campo, j) => { if (campo && !origen[campo]) origen[campo] = celdas[j] || ''; });
    return revisarFila(origen, i + 2);
  });
  return { filas, columnasIgnoradas };
}

/** POST /alumnos/historicos/importar?modo=vista_previa|confirmar (archivo .xlsx o .csv) */
export async function importarHistoricos(req: AuthRequest, res: Response) {
  if (!req.file) return sendError(res, 'Adjunta el archivo Excel (.xlsx) o CSV', 400);
  const confirmar = req.query.modo === 'confirmar';
  let filas: FilaRevisada[], columnasIgnoradas: string[];
  try {
    ({ filas, columnasIgnoradas } = filasDesdeHoja(await leerHojaCalculo(req.file.buffer, req.file.originalname)));
    await revisarContraBase(filas, pool);
  } catch (error) {
    if (error instanceof HojaInvalida) return sendError(res, error.message, 400);
    logError('Error al leer importación de históricos:', error);
    return sendError(res, 'No se pudo leer el archivo');
  }
  const conErrores = filas.filter(f => f.errores.length).length;
  const resumen = { total: filas.length, validas: filas.length - conErrores, con_errores: conErrores, columnas_ignoradas: columnasIgnoradas, filas };
  if (!confirmar) return sendSuccess(res, resumen, 'Vista previa generada');
  if (conErrores) return res.status(400).json({ success: false, message: `Corrige las ${conErrores} filas con errores antes de importar`, data: resumen });

  let connection: PoolConnection | undefined, committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await revisarContraBase(filas, connection); // vuelve a comprobar dentro de la transacción
    if (filas.some(f => f.errores.length)) return res.status(409).json({ success: false, message: 'Los datos cambiaron mientras revisabas; genera de nuevo la vista previa', data: resumen });
    const resultado = await insertarHistoricos(connection, filas.map(f => f.datos));
    await connection.query(`INSERT INTO registro_actividades (usuario_id, accion, entidad, detalles, ip_address) VALUES (?, 'importar_historicos', 'alumnos', ?, ?)`,
      [req.user!.userId, JSON.stringify({ alumnos: resultado.creados.length, apoderados: resultado.apoderadosCreados, archivo: req.file.originalname.slice(0, 200) }), req.ip || null]);
    await connection.commit(); committed = true;
    return sendSuccess(res, { importados: resultado.creados.length, apoderados_creados: resultado.apoderadosCreados, alumnos: resultado.creados },
      `${resultado.creados.length} exalumnos importados`, 201);
  } catch (error: any) {
    logError('Error al importar históricos:', error);
    if (error?.code === 'ER_DUP_ENTRY') return sendError(res, 'Un DNI ya fue registrado mientras se importaba; genera de nuevo la vista previa', 409);
    return sendError(res, 'No se importó ningún alumno: ocurrió un error al guardar');
  } finally { await finishTransaction(connection, committed); }
}

/** POST /alumnos/historicos (un exalumno desde el formulario) */
export async function crearHistorico(req: AuthRequest, res: Response) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return sendError(res, 'Datos inválidos', 400);
  const revisada = revisarFila(req.body, 1);
  let connection: PoolConnection | undefined, committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await revisarContraBase([revisada], connection);
    if (revisada.errores.length) return sendError(res, revisada.errores.join('. '), 400);
    const { creados } = await insertarHistoricos(connection, [revisada.datos]);
    await connection.commit(); committed = true;
    return sendSuccess(res, creados[0], 'Exalumno registrado', 201);
  } catch (error: any) {
    logError('Error al registrar exalumno:', error);
    if (error?.code === 'ER_DUP_ENTRY') return sendError(res, 'El DNI ya está registrado', 409);
    return sendError(res, 'No se pudo registrar el exalumno');
  } finally { await finishTransaction(connection, committed); }
}

/** PUT /alumnos/:id/historico — datos del historial previo al sistema. */
export async function actualizarHistorico(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || !req.body || typeof req.body !== 'object') return sendError(res, 'Datos inválidos', 400);
  const errores: string[] = [];
  const anio = (campo: string) => { const v = normalizarAnio(texto(req.body[campo])); if (v === false) errores.push('Año inválido'); return v || null; };
  const ingreso = anio('anio_ingreso'), ultimo = anio('anio_ultimo_estudio');
  if (ingreso && ultimo && ingreso > ultimo) errores.push('El año de ingreso es posterior al último año de estudio');
  const grado = texto(req.body.ultimo_grado_cursado), obs = texto(req.body.observaciones_historicas);
  if (grado.length > 80 || obs.length > 2000) errores.push('Texto demasiado largo');
  if (errores.length) return sendError(res, errores[0], 400);
  try {
    const [r] = await pool.query<ResultSetHeader>(`UPDATE alumnos SET anio_ingreso = ?, anio_ultimo_estudio = ?, ultimo_grado_cursado = ?, observaciones_historicas = ? WHERE id = ?`,
      [ingreso, ultimo, grado || null, obs || null, id]);
    if (!r.affectedRows) return sendError(res, 'Alumno no encontrado', 404);
    return sendSuccess(res, null, 'Historial actualizado');
  } catch (error) {
    logError('Error al actualizar historial:', error);
    return sendError(res, 'No se pudo actualizar el historial');
  }
}
