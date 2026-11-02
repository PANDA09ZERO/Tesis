import { periodoVigenteSql } from '../utils/periodoVigencia';
import {PoolConnection} from 'mysql2/promise';
import {finishTransaction} from '../utils/transaction';
import {positiveId} from '../utils/academicValidation';
import { logError } from '../utils/logger';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { profesorOfertaScope } from '../utils/profesorAlcance';
import pool from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// La estructura es la única fuente de asignaciones docentes.
export async function getEstructuraPeriodo(req: AuthRequest, res: Response) {
  if(!positiveId(req.params.periodoId))return sendError(res,'Periodo inválido',400);
  try {
    const { periodoId } = req.params;

    let [grados] = await pool.query<RowDataPacket[]>(
      `SELECT pg.id AS periodo_grado_id, g.id AS grado_id, g.nombre AS grado,
              g.nivel, g.orden
       FROM periodo_grados pg
       JOIN grados g ON g.id = pg.grado_id
       WHERE pg.periodo_academico_id = ?
       ORDER BY FIELD(g.nivel, 'Inicial', 'Primaria', 'Secundaria'), g.orden, g.nombre`,
      [periodoId]
    );

    let [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT pgc.id, pgc.grado_id, pgc.curso_id, c.nombre AS curso, c.codigo
       FROM periodo_grado_cursos pgc
       JOIN cursos c ON c.id = pgc.curso_id
       WHERE pgc.periodo_academico_id = ?
       ORDER BY c.nombre`,
      [periodoId]
    );

    let [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT pgcp.id, pgcp.periodo_grado_curso_id, pgcp.profesor_id,
              u.nombre, u.apellido, u.activo, p.especialidad
       FROM periodo_grado_curso_profesores pgcp
       JOIN periodo_grado_cursos pgc ON pgc.id = pgcp.periodo_grado_curso_id
       JOIN profesores p ON p.id = pgcp.profesor_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE pgc.periodo_academico_id = ?
       ORDER BY u.apellido, u.nombre`,
      [periodoId]
    );

    if (req.user?.rol === 'profesor') {
      const scope = profesorOfertaScope('scope_pgc', req.user.userId);
      const [allowed] = await pool.query<RowDataPacket[]>(`SELECT scope_pgc.id FROM periodo_grado_cursos scope_pgc
        WHERE scope_pgc.periodo_academico_id = ? AND ${scope.sql}`, [periodoId, ...scope.params]);
      const ids = new Set(allowed.map(row=>row.id)); cursos = cursos.filter(row=>ids.has(row.id));
      profesores = profesores.filter(row=>ids.has(row.periodo_grado_curso_id));
      grados = grados.filter(row=>cursos.some(course=>course.grado_id === row.grado_id));
    }

    const estructura = grados.map(grado => ({
      ...grado,
      cursos: cursos
        .filter(curso => curso.grado_id === grado.grado_id)
        .map(curso => ({
          ...curso,
          profesores: profesores.filter(prof => prof.periodo_grado_curso_id === curso.id)
        }))
    }));

    return sendSuccess(res, {
      grados: estructura,
      resumen: {
        grados: grados.length,
        cursos: cursos.length,
        asignaciones: profesores.length
      }
    });
  } catch (error) {
    logError('Error al obtener estructura académica:', error);
    return sendError(res, 'Error al obtener la estructura académica del periodo');
  }
}

export async function getCursosDeGrado(req: AuthRequest, res: Response) {
  if(!positiveId(req.params.periodoId)||!positiveId(req.params.gradoId))return sendError(res,'Periodo o grado inválido',400);
  try {
    const { periodoId, gradoId } = req.params;

    let [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT pgc.id, pgc.curso_id, c.nombre AS curso, c.codigo
       FROM periodo_grado_cursos pgc
       JOIN cursos c ON c.id = pgc.curso_id
       WHERE pgc.periodo_academico_id = ? AND pgc.grado_id = ?
       ORDER BY c.nombre`,
      [periodoId, gradoId]
    );

    let [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT pgcp.periodo_grado_curso_id, pgcp.profesor_id, u.nombre, u.apellido, u.activo
       FROM periodo_grado_curso_profesores pgcp
       JOIN periodo_grado_cursos pgc ON pgc.id = pgcp.periodo_grado_curso_id
       JOIN profesores p ON p.id = pgcp.profesor_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE pgc.periodo_academico_id = ? AND pgc.grado_id = ?
       ORDER BY u.apellido, u.nombre`,
      [periodoId, gradoId]
    );

    if (req.user?.rol === 'profesor') {
      const scope = profesorOfertaScope('scope_pgc', req.user.userId);
      const [allowed] = await pool.query<RowDataPacket[]>(`SELECT scope_pgc.id FROM periodo_grado_cursos scope_pgc
        WHERE scope_pgc.periodo_academico_id = ? AND ${scope.sql}`, [periodoId, ...scope.params]);
      const ids = new Set(allowed.map(row=>row.id)); cursos = cursos.filter(row=>ids.has(row.id));
      profesores = profesores.filter(row=>ids.has(row.periodo_grado_curso_id));
      
    }

    const resultado = cursos.map(curso => ({
      ...curso,
      profesores: profesores.filter(prof => prof.periodo_grado_curso_id === curso.id)
    }));

    return sendSuccess(res, resultado);
  } catch (error) {
    logError('Error al obtener cursos del grado:', error);
    return sendError(res, 'Error al obtener los cursos del grado');
  }
}

class StructureError extends Error{constructor(message:string,public status=400){super(message);}}
const id=(value:unknown)=>{if(!positiveId(value))throw new StructureError('Identificador académico inválido');return Number(value);};
function ids(body:any,plural:string,singular:string){const values=body[plural]===undefined?[body[singular]]:body[plural];if(!Array.isArray(values)||!values.length)throw new StructureError('Selecciona al menos un registro');const result=values.map(id);if(new Set(result).size!==result.length)throw new StructureError('La selección contiene duplicados');return result;}
async function lockPeriod(db:PoolConnection,period:number){const [rows]=await db.query<RowDataPacket[]>('SELECT id FROM periodos_academicos WHERE id=? FOR UPDATE',[period]);if(!rows.length)throw new StructureError('Periodo no encontrado',404);}
async function lockOffer(db:PoolConnection,offerId:number){
 const [found]=await db.query<RowDataPacket[]>('SELECT periodo_academico_id FROM periodo_grado_cursos WHERE id=?',[offerId]);if(!found.length)throw new StructureError('Oferta no encontrada',404);
 await lockPeriod(db,found[0].periodo_academico_id);
 const [rows]=await db.query<RowDataPacket[]>('SELECT * FROM periodo_grado_cursos WHERE id=? FOR UPDATE',[offerId]);if(!rows.length)throw new StructureError('Oferta no encontrada',404);return rows[0];
}
async function mutate(req:Request,res:Response,work:(db:PoolConnection)=>Promise<{data?:any;message:string;status?:number}>){let db:PoolConnection|undefined,committed=false;
 try{db=await pool.getConnection();await db.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await db.beginTransaction();const result=await work(db);await db.commit();committed=true;return sendSuccess(res,result.data??null,result.message,result.status??200);}
 catch(error){if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes((error as any)?.code))return sendError(res,'Otra operación modificó la estructura. Actualiza y reintenta',409);if(error instanceof StructureError)return sendError(res,error.message,error.status);logError('Error al modificar estructura',error);return sendError(res,'No se pudo modificar la estructura. No se aplicaron cambios');}
 finally{await finishTransaction(db,committed);}
}
async function protectOffer(db:PoolConnection,offer:RowDataPacket){
 const [references]=await db.query<RowDataPacket[]>(`SELECT
 EXISTS(SELECT 1 FROM horarios WHERE periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND periodo_academico_id=? AND curso_id=?))
 OR EXISTS(SELECT 1 FROM evaluaciones WHERE periodo_grado_curso_id=?)
 OR EXISTS(SELECT 1 FROM calificaciones WHERE periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND periodo_academico_id=? AND curso_id=?))
 OR EXISTS(SELECT 1 FROM asistencias WHERE periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND curso_id=? AND fecha BETWEEN (SELECT fecha_inicio FROM periodos_academicos WHERE id=?) AND (SELECT fecha_fin FROM periodos_academicos WHERE id=?)))
 OR EXISTS(SELECT 1 FROM matriculas WHERE periodo_academico_id=? AND curso_id=? AND COALESCE(grado_id,(SELECT c.grado_id FROM cursos c WHERE c.id=matriculas.curso_id))=?) linked`,
 [offer.id,offer.periodo_academico_id,offer.curso_id,offer.id,offer.id,offer.periodo_academico_id,offer.curso_id,offer.id,offer.curso_id,offer.periodo_academico_id,offer.periodo_academico_id,offer.periodo_academico_id,offer.curso_id,offer.grado_id]);
 if(references[0].linked)throw new StructureError('La oferta tiene matrícula, horarios o historial académico vinculado. Conserva la oferta y revisa sus registros',409);
}
export async function addGradosPeriodo(req:Request,res:Response){return mutate(req,res,async db=>{const period=id(req.params.periodoId),selected=ids(req.body,'grado_ids','grado_id');await lockPeriod(db,period);
 const [available]=await db.query<RowDataPacket[]>('SELECT id FROM grados WHERE id IN (?)',[selected]);if(available.length!==selected.length)throw new StructureError('Hay grados que no existen');let agregados=0;
 for(const grado of selected){const [result]=await db.query<ResultSetHeader>('INSERT IGNORE INTO periodo_grados(periodo_academico_id,grado_id) VALUES(?,?)',[period,grado]);agregados+=result.affectedRows;}return {data:{agregados},message:'Grados habilitados',status:201};});}
export async function addCursosGrado(req:Request,res:Response){return mutate(req,res,async db=>{const period=id(req.params.periodoId),grade=id(req.params.gradoId),selected=ids(req.body,'curso_ids','curso_id');await lockPeriod(db,period);
 const [grades]=await db.query<RowDataPacket[]>('SELECT id FROM grados WHERE id=?',[grade]);if(!grades.length)throw new StructureError('Grado no encontrado',404);
 const [available]=await db.query<RowDataPacket[]>('SELECT id FROM cursos WHERE id IN (?)',[selected]);if(available.length!==selected.length)throw new StructureError('Hay cursos que no existen');
 await db.query('INSERT IGNORE INTO periodo_grados(periodo_academico_id,grado_id) VALUES(?,?)',[period,grade]);let agregados=0;
 for(const course of selected){const [result]=await db.query<ResultSetHeader>('INSERT IGNORE INTO periodo_grado_cursos(periodo_academico_id,grado_id,curso_id) VALUES(?,?,?)',[period,grade,course]);agregados+=result.affectedRows;}return {data:{agregados},message:'Cursos habilitados',status:201};});}
export async function addProfesoresCurso(req:Request,res:Response){return mutate(req,res,async db=>{const offer=await lockOffer(db,id(req.params.pgcId)),selected=ids(req.body,'profesor_ids','profesor_id');
 const [available]=await db.query<RowDataPacket[]>('SELECT p.id FROM profesores p JOIN usuarios u ON u.id=p.usuario_id WHERE p.id IN (?) AND u.activo=1 FOR UPDATE',[selected]);if(available.length!==selected.length)throw new StructureError('Selecciona profesores existentes y activos');let agregados=0;
 for(const teacher of selected){const [result]=await db.query<ResultSetHeader>('INSERT IGNORE INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(?,?)',[offer.id,teacher]);agregados+=result.affectedRows;}return {data:{agregados},message:'Docentes asignados a la oferta',status:201};});}
export async function removeProfesorCurso(req:Request,res:Response){return mutate(req,res,async db=>{const offer=await lockOffer(db,id(req.params.pgcId)),teacher=id(req.params.profesorId);
 const [refs]=await db.query<RowDataPacket[]>(`SELECT EXISTS(SELECT 1 FROM horarios WHERE profesor_id=? AND (periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND periodo_academico_id=? AND curso_id=?)))
 OR EXISTS(SELECT 1 FROM evaluaciones WHERE periodo_grado_curso_id=? AND creado_por_usuario_id=(SELECT usuario_id FROM profesores WHERE id=?))
 OR EXISTS(SELECT 1 FROM calificaciones WHERE registrado_por=? AND (periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND periodo_academico_id=? AND curso_id=?)))
 OR EXISTS(SELECT 1 FROM asistencias WHERE registrado_por=? AND (periodo_grado_curso_id=? OR (periodo_grado_curso_id IS NULL AND curso_id=?))) linked`,[teacher,offer.id,offer.periodo_academico_id,offer.curso_id,offer.id,teacher,teacher,offer.id,offer.periodo_academico_id,offer.curso_id,teacher,offer.id,offer.curso_id]);
 if(refs[0].linked)throw new StructureError('El docente tiene horarios o registros vinculados. Resuelve las sesiones pendientes y conserva el historial antes de retirar la asignación',409);
 const [result]=await db.query<ResultSetHeader>('DELETE FROM periodo_grado_curso_profesores WHERE periodo_grado_curso_id=? AND profesor_id=?',[offer.id,teacher]);if(!result.affectedRows)throw new StructureError('Asignación no encontrada',404);return {message:'Asignación retirada'};});}
export async function removeCursoGrado(req:Request,res:Response){return mutate(req,res,async db=>{const offer=await lockOffer(db,id(req.params.pgcId));await protectOffer(db,offer);await db.query('DELETE FROM periodo_grado_cursos WHERE id=?',[offer.id]);return {message:'Curso retirado del grado'};});}
export async function removeGradoPeriodo(req:Request,res:Response){return mutate(req,res,async db=>{const period=id(req.params.periodoId),grade=id(req.params.gradoId);await lockPeriod(db,period);
 const [enabled]=await db.query<RowDataPacket[]>('SELECT id FROM periodo_grados WHERE periodo_academico_id=? AND grado_id=? FOR UPDATE',[period,grade]);if(!enabled.length)throw new StructureError('Grado no habilitado',404);
 const [enrollments]=await db.query<RowDataPacket[]>('SELECT id FROM matriculas WHERE periodo_academico_id=? AND grado_id=? LIMIT 1',[period,grade]);if(enrollments.length)throw new StructureError('El grado tiene matrículas vinculadas; conserva su historial',409);
 const [offers]=await db.query<RowDataPacket[]>('SELECT * FROM periodo_grado_cursos WHERE periodo_academico_id=? AND grado_id=? FOR UPDATE',[period,grade]);for(const offer of offers)await protectOffer(db,offer);
 await db.query('DELETE FROM periodo_grado_cursos WHERE periodo_academico_id=? AND grado_id=?',[period,grade]);await db.query('DELETE FROM periodo_grados WHERE periodo_academico_id=? AND grado_id=?',[period,grade]);return {message:'Grado retirado del periodo'};});}

export async function clonarConfiguracionPeriodo(req: Request, res: Response) {
  const connection = await pool.getConnection();
  let committed=false;
  try {
    await connection.beginTransaction();

    const { destinoId } = req.params;
    const { periodo_origen_id } = req.body;

    if (!positiveId(periodo_origen_id)||!positiveId(destinoId)) {
      return sendError(res, 'Debe especificar el periodo origen', 400);
    }

    if (parseInt(periodo_origen_id) === parseInt(destinoId)) {
      return sendError(res, 'El periodo origen y destino deben ser diferentes', 400);
    }

    for(const period of [Number(destinoId),Number(periodo_origen_id)].sort((a,b)=>a-b))await lockPeriod(connection,period);
    const [destino] = await connection.query<RowDataPacket[]>(
      'SELECT id, nombre FROM periodos_academicos WHERE id = ?',
      [destinoId]
    );

    if (destino.length === 0) {
      return sendError(res, 'Periodo destino no encontrado', 404);
    }

    const [origen] = await connection.query<RowDataPacket[]>(
      'SELECT id, nombre FROM periodos_academicos WHERE id = ?',
      [periodo_origen_id]
    );

    if (origen.length === 0) {
      return sendError(res, 'Periodo origen no encontrado', 404);
    }

    const [gradosResult] = await connection.query<ResultSetHeader>(
      `INSERT IGNORE INTO periodo_grados (periodo_academico_id, grado_id)
       SELECT ?, grado_id FROM periodo_grados WHERE periodo_academico_id = ?`,
      [destinoId, periodo_origen_id]
    );

    const [cursosResult] = await connection.query<ResultSetHeader>(
      `INSERT IGNORE INTO periodo_grado_cursos (periodo_academico_id, grado_id, curso_id)
       SELECT ?, grado_id, curso_id FROM periodo_grado_cursos WHERE periodo_academico_id = ?`,
      [destinoId, periodo_origen_id]
    );

    const [originalesPgcp] = await connection.query<RowDataPacket[]>(
      `SELECT pgcp.id as original_id, pgcp.periodo_grado_curso_id, pgcp.profesor_id
       FROM periodo_grado_curso_profesores pgcp
       JOIN periodo_grado_cursos pgc ON pgc.id = pgcp.periodo_grado_curso_id
       WHERE pgc.periodo_academico_id = ?`,
      [periodo_origen_id]
    );

    let profesoresAsignados = 0;
    const profesoresOmitidos: number[] = [];

    for (const original of originalesPgcp) {
      const [profesorCheck] = await connection.query<RowDataPacket[]>(
        'SELECT p.id FROM profesores p JOIN usuarios u ON u.id=p.usuario_id WHERE p.id=? AND u.activo=1',
        [original.profesor_id]
      );

      if (profesorCheck.length > 0) {
        const [nuevoPgcp] = await connection.query<RowDataPacket[]>(
          `SELECT pgc.id as nuevo_pgc_id
           FROM periodo_grado_cursos pgc
           JOIN periodo_grados pg ON pgc.grado_id = pg.grado_id AND pg.periodo_academico_id=pgc.periodo_academico_id
           WHERE pgc.periodo_academico_id = ? 
             AND pgc.grado_id = (SELECT grado_id FROM periodo_grado_cursos WHERE id = ?)
             AND pgc.curso_id = (SELECT curso_id FROM periodo_grado_cursos WHERE id = ?)`,
          [destinoId, original.periodo_grado_curso_id, original.periodo_grado_curso_id]
        );

        if (nuevoPgcp.length > 0) {
          const [result] = await connection.query<ResultSetHeader>(
            `INSERT IGNORE INTO periodo_grado_curso_profesores (periodo_grado_curso_id, profesor_id)
             VALUES (?, ?)`,
            [nuevoPgcp[0].nuevo_pgc_id, original.profesor_id]
          );
          profesoresAsignados += result.affectedRows;
        }
      } else {
        profesoresOmitidos.push(original.profesor_id);
      }
    }

    await connection.commit();committed=true;

    return sendSuccess(res, {
      grados: gradosResult.affectedRows,
      cursos: cursosResult.affectedRows,
      profesores_asignados: profesoresAsignados,
      profesores_omitidos: profesoresOmitidos
    }, `Configuración clonada de ${origen[0].nombre} a ${destino[0].nombre}`);
  } catch (error) {
    if(error instanceof StructureError)return sendError(res,error.message,error.status);
    if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes((error as any)?.code))return sendError(res,'Otra operación modificó la estructura. Actualiza y reintenta',409);
    logError('Error al clonar configuración:', error);
    return sendError(res, 'Error al clonar configuración del periodo');
  } finally {
    await finishTransaction(connection,committed);
  }
}

export async function getOfertas(req: AuthRequest, res: Response) {
  if(['periodo_id','grado_id','curso_id'].some(key=>req.query[key]!==undefined&&!positiveId(req.query[key])))return sendError(res,'Filtros académicos inválidos',400);
  try {
    const conditions = ['1 = 1'];
    const params: (string | number)[] = [];
    const periodoId = req.query.periodo_id;
    const gradoId = req.query.grado_id;
    const cursoId = req.query.curso_id;
    const nivel = req.query.nivel;
    const search = req.query.search;

    if (periodoId) {
      conditions.push('pgc.periodo_academico_id = ?');
      params.push(String(periodoId));
    } else {
      conditions.push('pa.activo = 1');
    }
    if (gradoId) {
      conditions.push('pgc.grado_id = ?');
      params.push(String(gradoId));
    }
    if (cursoId) {
      conditions.push('pgc.curso_id = ?');
      params.push(String(cursoId));
    }
    if (nivel) {
      conditions.push('g.nivel = ?');
      params.push(String(nivel));
    }
    if (search) {
      conditions.push('(c.nombre LIKE ? OR c.codigo LIKE ?)');
      params.push(`%${String(search)}%`, `%${String(search)}%`);
    }
    if (req.user?.rol === 'profesor') {
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM periodo_grado_curso_profesores pgcp
          JOIN profesores p ON p.id = pgcp.profesor_id
          WHERE pgcp.periodo_grado_curso_id = pgc.id AND p.usuario_id = ?
        )
      )`);
      params.push(req.user.userId);
    }

    const [ofertas] = await pool.query<RowDataPacket[]>(
            `SELECT pgc.id AS periodo_grado_curso_id, pgc.periodo_academico_id,
              pa.nombre AS periodo, ${periodoVigenteSql('pa')} AS periodo_activo,
              DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin,
              pgc.grado_id, g.nombre AS grado, g.nivel,
              pgc.curso_id, c.nombre AS curso, c.codigo, c.descripcion,
              (SELECT COUNT(*)
               FROM matriculas m
               JOIN alumnos a ON a.id = m.alumno_id
               WHERE m.periodo_academico_id = pgc.periodo_academico_id
                 AND m.curso_id = pgc.curso_id
                 AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = pgc.grado_id
                 AND m.estado = 'activa') AS alumnos_count
       FROM periodo_grado_cursos pgc
       JOIN periodos_academicos pa ON pa.id = pgc.periodo_academico_id
       JOIN grados g ON g.id = pgc.grado_id
       JOIN cursos c ON c.id = pgc.curso_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY FIELD(g.nivel, 'Inicial', 'Primaria', 'Secundaria'), g.orden, c.nombre`,
      params
    );

    return sendSuccess(res, ofertas);
  } catch (error) {
    logError('Error al obtener ofertas académicas:', error);
    return sendError(res, 'Error al obtener ofertas académicas');
  }
}

export async function getOfertaById(req: AuthRequest, res: Response) {
  if(!positiveId(req.params.ofertaId))return sendError(res,'Oferta inválida',400);
  try {
    const params: (string | number)[] = [req.params.ofertaId];
    const teacherFilter = req.user?.rol === 'profesor'
      ? `AND (
          EXISTS (
            SELECT 1 FROM periodo_grado_curso_profesores pgcp
            JOIN profesores p ON p.id = pgcp.profesor_id
            WHERE pgcp.periodo_grado_curso_id = pgc.id AND p.usuario_id = ?
          )
        )`
      : '';
    if (req.user?.rol === 'profesor') params.push(req.user.userId);

    const [ofertas] = await pool.query<RowDataPacket[]>(
      `SELECT pgc.id AS periodo_grado_curso_id, pgc.periodo_academico_id,
              pa.nombre AS periodo, ${periodoVigenteSql('pa')} AS periodo_activo,
              DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin,
              pgc.grado_id, g.nombre AS grado, g.nivel,
              pgc.curso_id, c.nombre AS curso, c.codigo, c.descripcion
       FROM periodo_grado_cursos pgc
       JOIN periodos_academicos pa ON pa.id = pgc.periodo_academico_id
       JOIN grados g ON g.id = pgc.grado_id
       JOIN cursos c ON c.id = pgc.curso_id
       WHERE pgc.id = ? ${teacherFilter}`,
      params
    );
    if (ofertas.length === 0) return sendError(res, 'Oferta académica no encontrada', 404);

    const oferta = ofertas[0];
    const [profesores] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT p.id, u.nombre, u.apellido, u.email, u.activo, p.especialidad
       FROM profesores p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE EXISTS (
         SELECT 1 FROM periodo_grado_curso_profesores pgcp
         WHERE pgcp.periodo_grado_curso_id = ? AND pgcp.profesor_id = p.id
       )
       ORDER BY u.apellido, u.nombre`,
      [oferta.periodo_grado_curso_id]
    );
    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT m.id AS matricula_id, a.id AS alumno_id, a.codigo_alumno,
              u.nombre, u.apellido, m.estado AS estado_matricula,
              m.periodo_academico_id, COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) AS grado_id
       FROM matriculas m
       JOIN alumnos a ON a.id = m.alumno_id
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE m.periodo_academico_id = ? AND m.curso_id = ?
         AND COALESCE(m.grado_id, (SELECT grado_id FROM cursos WHERE id = m.curso_id)) = ? AND m.estado = 'activa'
       ORDER BY u.apellido, u.nombre`,
      [oferta.periodo_academico_id, oferta.curso_id, oferta.grado_id]
    );

    return sendSuccess(res, { ...oferta, profesores, alumnos, alumnos_count: alumnos.length });
  } catch (error) {
    logError('Error al obtener oferta académica:', error);
    return sendError(res, 'Error al obtener oferta académica');
  }
}
