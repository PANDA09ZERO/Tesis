import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { logError } from './logger';
import { profesorAlumnoScope } from './profesorAlcance';

type Db = Pool | PoolConnection;
type Aviso = { titulo: string; mensaje: string; tipo?: 'info' | 'warning' | 'alerta'; prioridad?: 'normal' | 'alta'; linkAlumno?: string; linkApoderado?: string };

const recortar = (texto: string, max: number) => texto.length > max ? texto.slice(0, max - 1).trimEnd() + '…' : texto;

/**
 * Notifica a la familia de un alumno (su cuenta y/o sus apoderados activos). Cada aviso es una
 * notificación normal: suena, cuenta como no leída y admite respuesta. Un fallo al avisar no
 * debe deshacer la operación que lo originó, así que se registra y se ignora.
 */
export async function avisarFamilia(db: Db, alumnoId: number, aviso: Aviso, destinos: { alumno?: boolean; apoderados?: boolean }) {
  try {
    const filas: Array<[number, string | null]> = [];
    if (destinos.alumno) {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT u.id FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = ? AND u.activo = 1', [alumnoId]);
      rows.forEach(r => filas.push([Number(r.id), aviso.linkAlumno ?? null]));
    }
    if (destinos.apoderados) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id FROM apoderado_alumno aa JOIN apoderados ap ON ap.id = aa.apoderado_id
         JOIN usuarios u ON u.id = ap.usuario_id WHERE aa.alumno_id = ? AND u.activo = 1`, [alumnoId]);
      rows.forEach(r => filas.push([Number(r.id), aviso.linkApoderado ?? null]));
    }
    if (!filas.length) return 0;
    // "{alumno}" se reemplaza por el nombre: un apoderado con varios hijos sabe de quién se trata.
    const [nombre] = await db.query<RowDataPacket[]>(
      "SELECT CONCAT(u.nombre, ' ', u.apellido) nombre FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = ?", [alumnoId]);
    const alumno = String(nombre[0]?.nombre || 'el alumno');
    const titulo = recortar(aviso.titulo.split('{alumno}').join(alumno), 255), mensaje = recortar(aviso.mensaje.split('{alumno}').join(alumno), 1000);
    await db.query('INSERT INTO notificaciones (titulo, mensaje, tipo, usuario_id, link, prioridad, leida) VALUES ?',
      [filas.map(([usuarioId, link]) => [titulo, mensaje, aviso.tipo ?? 'alerta', usuarioId, link, aviso.prioridad ?? 'normal', 0])]);
    return filas.length;
  } catch (error) {
    logError('No se pudo avisar a la familia del alumno:', error);
    return 0;
  }
}

export type SeccionesPendientes = { alertas: number; incidencias: number; tramites: number };

/**
 * Lo que espera atención en cada sección, según el rol: alertas activas, incidencias abiertas y
 * trámites solicitados. El profesor solo cuenta a sus alumnos (mismo alcance que sus páginas).
 */
export async function seccionesPendientes(db: Db, userId: number, rol?: string): Promise<SeccionesPendientes> {
  const vacio = { alertas: 0, incidencias: 0, tramites: 0 };
  if (rol !== 'administrador' && rol !== 'profesor') return vacio;
  const contar = async (sql: string, params: unknown[] = []) => {
    try { const [rows] = await db.query<RowDataPacket[]>(sql, params); return Number(rows[0]?.total) || 0; }
    catch (error: any) { if (error?.code === 'ER_NO_SUCH_TABLE') return 0; throw error; }
  };
  if (rol === 'administrador') {
    return {
      alertas: await contar("SELECT COUNT(*) total FROM alertas_academicas WHERE estado = 'activa'"),
      incidencias: await contar("SELECT COUNT(*) total FROM incidencias WHERE estado = 'abierta'"),
      tramites: await contar("SELECT COUNT(*) total FROM tramites_documentales WHERE estado = 'solicitado'"),
    };
  }
  const scope = profesorAlumnoScope('a_scope', userId);
  return {
    alertas: await contar(`SELECT COUNT(*) total FROM alertas_academicas aa WHERE aa.estado = 'activa'
      AND EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = aa.alumno_id AND ${scope.sql})`, scope.params),
    incidencias: await contar(`SELECT COUNT(*) total FROM incidencias i WHERE i.estado = 'abierta'
      AND EXISTS (SELECT 1 FROM alumnos a_scope WHERE a_scope.id = i.alumno_id AND ${scope.sql})`, scope.params),
    tramites: 0,
  };
}
