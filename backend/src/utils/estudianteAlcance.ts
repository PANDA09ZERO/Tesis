import { RowDataPacket } from 'mysql2';
import pool from '../config/database';

export class ErrorEstudiante extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function idEstudiante(value: unknown, nombre: string) {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new ErrorEstudiante(`${nombre} inválido`);
  return Number(value);
}
export async function alumnoDeCuenta(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT a.id, a.codigo_alumno, a.estado,
    u.nombre, u.apellido, u.email, u.dni, u.telefono, u.direccion,
    DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') fecha_nacimiento, u.genero, u.foto_url
    FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id JOIN roles r ON r.id = u.rol_id
    WHERE a.usuario_id = ? AND u.activo = 1 AND r.nombre = 'alumno'`, [userId]);
  if (!rows.length) throw new ErrorEstudiante('La cuenta no tiene un perfil de alumno disponible. Contacta con administración.', 404);
  return rows[0];
}
export async function periodosDelAlumno(alumnoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT pa.id,pa.nombre,pa.activo,
    DATE_FORMAT(pa.fecha_inicio,'%Y-%m-%d') fecha_inicio, DATE_FORMAT(pa.fecha_fin,'%Y-%m-%d') fecha_fin
    FROM periodos_academicos pa WHERE pa.id IN (
      SELECT periodo_academico_id FROM matriculas WHERE alumno_id = ?
      UNION SELECT periodo_academico_id FROM pagos_matricula WHERE alumno_id = ?
      UNION SELECT periodo_academico_id FROM mensualidades WHERE alumno_id = ?
      UNION SELECT periodo_academico_id FROM calificaciones WHERE alumno_id = ?
      UNION SELECT pgc.periodo_academico_id FROM asistencias attendance
        JOIN periodo_grado_cursos pgc ON pgc.id = attendance.periodo_grado_curso_id WHERE attendance.alumno_id = ?)
    ORDER BY pa.activo DESC,fecha_inicio DESC,pa.id DESC`, [alumnoId,alumnoId,alumnoId,alumnoId,alumnoId]);
  return rows;
}
export async function periodoDelAlumno(alumnoId: number, valor: unknown) {
  const periods = await periodosDelAlumno(alumnoId);
  if (valor === undefined) return periods[0] || null;
  const id = idEstudiante(valor, 'Periodo');
  const selected = periods.find(p => Number(p.id) === id);
  if (!selected) throw new ErrorEstudiante('Periodo no encontrado en tus matrículas', 404);
  return selected;
}
export async function horariosDelAlumno(alumnoId: number, periodoId?: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT h.id,h.curso_id,h.dia_semana,h.hora_inicio,h.hora_fin,h.aula,
    h.periodo_academico_id, h.periodo_grado_curso_id, pa.nombre periodo,cu.nombre curso,
    cu.codigo, g.nombre grado, CONCAT(u.nombre,' ',u.apellido) profesor
    FROM horarios h JOIN cursos cu ON cu.id = h.curso_id JOIN profesores p ON p.id = h.profesor_id
    JOIN usuarios u ON u.id = p.usuario_id JOIN periodos_academicos pa ON pa.id = h.periodo_academico_id
    LEFT JOIN periodo_grado_cursos pgc ON pgc.id = h.periodo_grado_curso_id
    LEFT JOIN grados g ON g.id = COALESCE(pgc.grado_id,cu.grado_id)
    WHERE pgc.id IS NOT NULL AND pgc.curso_id=h.curso_id AND pgc.periodo_academico_id=h.periodo_academico_id AND ${periodoId ? 'pa.id = ? AND' : ''} EXISTS (SELECT 1 FROM matriculas m
      WHERE m.alumno_id = ? AND m.estado = 'activa' AND m.curso_id = h.curso_id
        AND m.periodo_academico_id = h.periodo_academico_id
        AND COALESCE(m.grado_id,cu.grado_id) = COALESCE(pgc.grado_id,cu.grado_id))
    ORDER BY FIELD(h.dia_semana,'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'),h.hora_inicio,h.id`,
    [...(periodoId ? [periodoId] : []),alumnoId]);
  return rows;
}
