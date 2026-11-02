import { logError } from '../utils/logger';
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendSuccess,sendError } from '../utils/response';
import { alumnoDeCuenta,periodosDelAlumno,periodoDelAlumno,horariosDelAlumno,idEstudiante,ErrorEstudiante } from '../utils/estudianteAlcance';
import { obtenerMatriculasAlumno } from '../utils/matriculasAlumno';

function errorEstudiante(res: Response,error: unknown) {
  if (error instanceof ErrorEstudiante) return sendError(res,error.message,error.status);
  logError('Error al consultar datos del estudiante:',error);
  return sendError(res,'No se pudo cargar tu información. Reintenta la consulta.');
}
export async function getContextoEstudiante(req: AuthRequest,res: Response) {
  try {
    const alumno = await alumnoDeCuenta(req.user!.userId);
    const [periodos,matriculas] = await Promise.all([periodosDelAlumno(alumno.id),obtenerMatriculasAlumno(alumno.id)]);
    return sendSuccess(res,{alumno,periodos,matriculas});
  } catch(error) { return errorEstudiante(res,error); }
}
async function datosPeriodo(alumnoId: number,periodoId: number) {
  const [cursos] = await pool.query<RowDataPacket[]>(`SELECT m.id matricula_id,m.estado estado_matricula,
    m.curso_id,cu.nombre curso,cu.codigo,COALESCE(m.grado_id,cu.grado_id) grado_id,g.nombre grado,
    pgc.id oferta_id FROM matriculas m LEFT JOIN cursos cu ON cu.id = m.curso_id
    LEFT JOIN grados g ON g.id = COALESCE(m.grado_id,cu.grado_id)
    LEFT JOIN periodo_grado_cursos pgc ON pgc.curso_id = m.curso_id AND pgc.periodo_academico_id = m.periodo_academico_id
      AND pgc.grado_id = COALESCE(m.grado_id,cu.grado_id)
    WHERE m.alumno_id = ? AND m.periodo_academico_id = ? ORDER BY g.nombre,cu.nombre,m.id`,[alumnoId,periodoId]);
  // Profesores ligados a cada inscripción; nunca se devuelve el roster de compañeros.
  for (const curso of cursos) {
    const [teachers] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT p.id,CONCAT(u.nombre,' ',u.apellido) nombre
      FROM profesores p JOIN usuarios u ON u.id = p.usuario_id WHERE
      EXISTS (SELECT 1 FROM periodo_grado_curso_profesores assigned WHERE assigned.profesor_id = p.id AND assigned.periodo_grado_curso_id = ?)
      ORDER BY nombre`,[curso.oferta_id ?? null]);
    curso.profesores = teachers;
  }
  const [calificaciones] = await pool.query<RowDataPacket[]>(`SELECT c.id,c.alumno_id,c.curso_id,c.periodo_grado_curso_id,c.evaluacion_id,
    c.nota,c.tipo_evaluacion,c.observaciones,DATE_FORMAT(c.fecha_evaluacion,'%Y-%m-%d') fecha_evaluacion,
    cu.nombre curso,ev.nombre evaluacion,ev.nota_maxima,pa.nombre periodo
    FROM calificaciones c JOIN cursos cu ON cu.id = c.curso_id JOIN periodos_academicos pa ON pa.id = c.periodo_academico_id
    LEFT JOIN evaluaciones ev ON ev.id = c.evaluacion_id
    WHERE c.alumno_id = ? AND c.periodo_academico_id = ? ORDER BY cu.nombre,c.fecha_evaluacion,c.id`,[alumnoId,periodoId]);
  const [evaluaciones] = await pool.query<RowDataPacket[]>(`SELECT e.id,e.nombre,e.tipo,
    DATE_FORMAT(e.fecha_evaluacion,'%Y-%m-%d') fecha_evaluacion,e.nota_maxima,e.estado,pgc.curso_id,cu.nombre curso,
    pgc.id oferta_id FROM evaluaciones e JOIN periodo_grado_cursos pgc ON pgc.id = e.periodo_grado_curso_id
    JOIN cursos cu ON cu.id = pgc.curso_id WHERE pgc.periodo_academico_id = ? AND EXISTS (
      SELECT 1 FROM matriculas m WHERE m.alumno_id = ? AND m.curso_id = pgc.curso_id
        AND m.periodo_academico_id = pgc.periodo_academico_id
        AND COALESCE(m.grado_id,cu.grado_id) = pgc.grado_id)
    ORDER BY e.fecha_evaluacion,e.id`,[periodoId,alumnoId]);
  const [asistencias] = await pool.query<RowDataPacket[]>(`SELECT attendance.id,attendance.curso_id,attendance.periodo_grado_curso_id,
    DATE_FORMAT(attendance.fecha,'%Y-%m-%d') fecha,attendance.estado,attendance.minutos_tardanza,attendance.observaciones,cu.nombre curso
    FROM asistencias attendance LEFT JOIN cursos cu ON cu.id = attendance.curso_id
    JOIN periodos_academicos pa ON pa.id = ? WHERE attendance.alumno_id = ? AND (
      EXISTS (SELECT 1 FROM periodo_grado_cursos pgc WHERE pgc.id = attendance.periodo_grado_curso_id AND pgc.periodo_academico_id = pa.id)
      OR (attendance.periodo_grado_curso_id IS NULL AND attendance.fecha BETWEEN pa.fecha_inicio AND pa.fecha_fin))
    ORDER BY attendance.fecha DESC,cu.nombre,attendance.id`,[periodoId,alumnoId]);
  const [matricula] = await pool.query<RowDataPacket[]>(`SELECT id,monto,estado,DATE_FORMAT(fecha_pago,'%Y-%m-%d') fecha_pago
    FROM pagos_matricula WHERE alumno_id = ? AND periodo_academico_id = ?`,[alumnoId,periodoId]);
  const [mensualidades] = await pool.query<RowDataPacket[]>(`SELECT id,monto,mes,año,estado,
    DATE_FORMAT(fecha_pago,'%Y-%m-%d') fecha_pago,observaciones FROM mensualidades
    WHERE alumno_id = ? AND periodo_academico_id = ? ORDER BY año,FIELD(mes,'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'),id`,[alumnoId,periodoId]);
  const horarios = await horariosDelAlumno(alumnoId,periodoId);
  return {cursos,calificaciones,evaluaciones,asistencias,horarios,pago_matricula:matricula[0] || null,mensualidades};
}
export async function getPeriodoEstudiante(req: AuthRequest,res: Response) {
  try {
    const alumno = await alumnoDeCuenta(req.user!.userId);
    const periodo = await periodoDelAlumno(alumno.id,req.query.periodo_id);
    if (!periodo) return sendSuccess(res,{periodo:null,cursos:[],calificaciones:[],evaluaciones:[],asistencias:[],horarios:[],pago_matricula:null,mensualidades:[]});
    return sendSuccess(res,{periodo,...await datosPeriodo(alumno.id,periodo.id)});
  } catch(error) { return errorEstudiante(res,error); }
}
export async function getCursoEstudiante(req: AuthRequest,res: Response) {
  try {
    const alumno = await alumnoDeCuenta(req.user!.userId);
    const id = idEstudiante(req.params.matriculaId,'Matrícula');
    const [rows] = await pool.query<RowDataPacket[]>('SELECT periodo_academico_id FROM matriculas WHERE id = ? AND alumno_id = ?',[id,alumno.id]);
    if (!rows.length) throw new ErrorEstudiante('Curso no encontrado en tus matrículas',404);
    const data = await datosPeriodo(alumno.id,rows[0].periodo_academico_id);
    const curso = data.cursos.find(c=>Number(c.matricula_id) === id)!;
    const periodo = await periodoDelAlumno(alumno.id,rows[0].periodo_academico_id);
    return sendSuccess(res,{periodo,curso,
      calificaciones:data.calificaciones.filter(c=>c.curso_id === curso.curso_id && (!c.periodo_grado_curso_id || c.periodo_grado_curso_id === curso.oferta_id)),
      evaluaciones:data.evaluaciones.filter(e=>e.oferta_id === curso.oferta_id),
      asistencias:data.asistencias.filter(a=>a.curso_id === curso.curso_id && (!a.periodo_grado_curso_id || a.periodo_grado_curso_id === curso.oferta_id)),
      horarios:data.horarios.filter(h=>h.curso_id === curso.curso_id && (!h.periodo_grado_curso_id || h.periodo_grado_curso_id === curso.oferta_id))});
  } catch(error) { return errorEstudiante(res,error); }
}
