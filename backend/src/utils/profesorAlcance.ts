import {academicTodaySql, withinPeriod} from './periodoVigencia';
import {RowDataPacket} from 'mysql2';
import {Pool} from 'mysql2/promise';
// La autorización procede exclusivamente de periodo + grado + curso + docente.
export function profesorCursoScope(options:{cursoAlias:string;gradoAlias:string;periodoAlias?:string;userIdParam:number;periodoIdParam?:number}){
 const {cursoAlias,gradoAlias,periodoAlias,userIdParam,periodoIdParam}=options;
 const period=periodoIdParam!==undefined?'?':periodoAlias?`${periodoAlias}.id`:`(SELECT id FROM periodos_academicos WHERE activo=1 AND ${academicTodaySql} BETWEEN fecha_inicio AND fecha_fin LIMIT 1)`;
 return {sql:`EXISTS(SELECT 1 FROM periodo_grado_cursos pgc JOIN periodo_grado_curso_profesores assigned ON assigned.periodo_grado_curso_id=pgc.id
 JOIN profesores p ON p.id=assigned.profesor_id WHERE pgc.curso_id=${cursoAlias}.id AND pgc.grado_id=${gradoAlias}.id
 AND pgc.periodo_academico_id=${period} AND p.usuario_id=?)`,params:[...(periodoIdParam!==undefined?[periodoIdParam]:[]),userIdParam]};
}
export function profesorOfertaScope(alias:string,userId:number){
 return {sql:`EXISTS(SELECT 1 FROM periodo_grado_curso_profesores scope_assigned JOIN profesores scope_teacher ON scope_teacher.id=scope_assigned.profesor_id
 WHERE scope_assigned.periodo_grado_curso_id=${alias}.id AND scope_teacher.usuario_id=?)`,params:[userId]};
}
export function profesorHorarioScope(alias:string,userId:number){
 return {sql:`${alias}.profesor_id=(SELECT id FROM profesores WHERE usuario_id=?) AND EXISTS(
 SELECT 1 FROM periodo_grado_cursos scope_schedule_offer JOIN periodo_grado_curso_profesores scope_schedule_assignment
 ON scope_schedule_assignment.periodo_grado_curso_id=scope_schedule_offer.id
 WHERE scope_schedule_offer.id=${alias}.periodo_grado_curso_id AND scope_schedule_offer.curso_id=${alias}.curso_id
 AND scope_schedule_offer.periodo_academico_id=${alias}.periodo_academico_id AND scope_schedule_assignment.profesor_id=${alias}.profesor_id)`,params:[userId]};
}
export function profesorMatriculaScope(alias:string,userId:number){
 return {sql:`EXISTS(SELECT 1 FROM periodo_grado_cursos scope_pgc JOIN periodo_grado_curso_profesores scope_assignment ON scope_assignment.periodo_grado_curso_id=scope_pgc.id
 JOIN profesores scope_teacher ON scope_teacher.id=scope_assignment.profesor_id
 WHERE scope_pgc.periodo_academico_id=${alias}.periodo_academico_id AND scope_pgc.curso_id=${alias}.curso_id
 AND scope_pgc.grado_id=COALESCE(${alias}.grado_id,(SELECT grado_id FROM cursos WHERE id=${alias}.curso_id)) AND scope_teacher.usuario_id=?)`,params:[userId]};
}
export function profesorAlumnoScope(alias: string, userId: number, periodoId?: number) {
  const scope = profesorMatriculaScope('scope_m', userId);
  return { sql: `EXISTS (SELECT 1 FROM matriculas scope_m
    JOIN periodos_academicos scope_pa ON scope_pa.id = scope_m.periodo_academico_id
    WHERE scope_m.alumno_id = ${alias}.id AND scope_m.estado = 'activa'
      AND ${periodoId ? 'scope_pa.id = ?' : `scope_pa.activo = 1 AND ${academicTodaySql} BETWEEN scope_pa.fecha_inicio AND scope_pa.fecha_fin`} AND ${scope.sql})`,
    params: [...(periodoId ? [periodoId] : []), ...scope.params] };
}
export function profesorRegistroScope(alias: string, userId: number, tipo: 'nota' | 'asistencia', periodoId?: number | 'activo') {
  const scope = profesorMatriculaScope('scope_m', userId);
  return { sql: `EXISTS (SELECT 1 FROM matriculas scope_m
    JOIN periodos_academicos scope_pa ON scope_pa.id = scope_m.periodo_academico_id
    WHERE scope_m.alumno_id = ${alias}.alumno_id AND scope_m.curso_id = ${alias}.curso_id
      AND scope_m.estado = 'activa'
      ${periodoId === 'activo' ? `AND scope_pa.activo = 1 AND ${academicTodaySql} BETWEEN scope_pa.fecha_inicio AND scope_pa.fecha_fin` : periodoId ? 'AND scope_pa.id = ?' : ''}
      AND ${tipo === 'nota' ? 'scope_m.periodo_academico_id = ' + alias + '.periodo_academico_id' : alias + '.fecha BETWEEN scope_pa.fecha_inicio AND scope_pa.fecha_fin'}
      AND (${alias}.periodo_grado_curso_id IS NULL OR EXISTS (
        SELECT 1 FROM periodo_grado_cursos scope_offer WHERE scope_offer.id = ${alias}.periodo_grado_curso_id
          AND scope_offer.periodo_academico_id = scope_m.periodo_academico_id
          AND scope_offer.curso_id = scope_m.curso_id
          AND scope_offer.grado_id = COALESCE(scope_m.grado_id, (SELECT grado_id FROM cursos WHERE id = scope_m.curso_id))))
      AND ${scope.sql})`, params: [...(typeof periodoId === 'number' ? [periodoId] : []), ...scope.params] };
}
export async function profesorTieneAccesoAlumno(db: Pool, userId: number, alumnoId: number, periodoId?: number) {
  const scope = profesorAlumnoScope('a', userId, periodoId);
  const [rows] = await db.query<RowDataPacket[]>(`SELECT 1 FROM alumnos a WHERE a.id = ? AND ${scope.sql} LIMIT 1`, [alumnoId, ...scope.params]);
  return rows.length > 0;
}
export async function profesorTieneAccesoCurso(db: Pool,userId:number,cursoId:number,periodoId?:number){
 const [rows]=await db.query<RowDataPacket[]>(`SELECT 1 FROM periodo_grado_cursos pgc
 JOIN periodos_academicos pa ON pa.id=pgc.periodo_academico_id
 JOIN periodo_grado_curso_profesores assigned ON assigned.periodo_grado_curso_id=pgc.id
 JOIN profesores p ON p.id=assigned.profesor_id
 WHERE pgc.curso_id=? AND p.usuario_id=? AND ${periodoId?'pa.id=?':`pa.activo=1 AND ${academicTodaySql} BETWEEN pa.fecha_inicio AND pa.fecha_fin`} LIMIT 1`,[cursoId,userId,...(periodoId?[periodoId]:[])]);
 return rows.length>0;
}
export async function profesorTieneAccesoMatricula(db: Pool, userId: number, alumnoId: number, cursoId: number, periodoId?: number) {
  const scope = profesorMatriculaScope('m', userId);
  const [rows] = await db.query<RowDataPacket[]>(`SELECT 1 FROM matriculas m
    JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
    WHERE m.alumno_id = ? AND m.curso_id = ? AND m.estado = 'activa'
      AND ${periodoId ? 'pa.id = ?' : `pa.activo = 1 AND ${academicTodaySql} BETWEEN pa.fecha_inicio AND pa.fecha_fin`} AND ${scope.sql} LIMIT 1`,
    [alumnoId, cursoId, ...(periodoId ? [periodoId] : []), ...scope.params]);
  return rows.length > 0;
}
export async function validarRegistroProfesor(db: Pool, userId: number, alumnoId: unknown, cursoId: unknown, periodoId: unknown, fecha?: unknown) {
  const ids = [alumnoId, cursoId, periodoId].map(Number);
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) return { status: 400, message: 'Indique alumno, curso y periodo académico válidos' };
  const scope = profesorMatriculaScope('m', userId);
  const [rows] = await db.query<RowDataPacket[]>(`SELECT pa.activo,
    DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') fecha_inicio, DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') fecha_fin
    FROM matriculas m JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
    WHERE m.alumno_id = ? AND m.curso_id = ? AND m.periodo_academico_id = ? AND m.estado = 'activa'
      AND ${scope.sql} LIMIT 1`, [...ids, ...scope.params]);
  if (!rows.length) return { status: 403, message: 'Curso o alumno fuera de su asignación' };
  if (!rows[0].activo || !withinPeriod(rows[0].fecha_inicio, rows[0].fecha_fin)) return { status: 409, message: 'El periodo histórico es de solo consulta para profesores' };
  if (fecha !== undefined && (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    || isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0,10) !== fecha
    || fecha < rows[0].fecha_inicio || fecha > rows[0].fecha_fin)) {
    return { status: 400, message: 'La fecha debe ser válida y estar dentro del periodo académico' };
  }
  return null;
}
