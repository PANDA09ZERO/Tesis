import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { profesorCursoScope } from './profesorAlcance';

// Cada fila académica conserva su curso. El pago se une una sola vez por alumno/periodo.
export async function obtenerMatriculasAlumno(alumnoId: number, profesorUsuarioId?: number, periodoId?: number, incluirPago = true, db: Pick<typeof pool, 'query'> = pool) {
  const conPago = incluirPago && !profesorUsuarioId;
  const scope = profesorUsuarioId ? profesorCursoScope({ cursoAlias: 'cu', gradoAlias: 'g',
    periodoAlias: 'pa', userIdParam: profesorUsuarioId }) : null;
  const teacherFilter = scope ? `AND ${scope.sql}` : '';
  const [rows] = await db.query<RowDataPacket[]>(`SELECT m.id, m.periodo_academico_id,
    pa.nombre periodo, pa.activo periodo_activo, COALESCE(m.grado_id, cu.grado_id) grado_id, g.nombre grado,
    m.curso_id, cu.nombre curso, cu.codigo curso_codigo, m.estado, m.fecha_matricula
    ${!conPago ? '' : ', pm.id pago_id, pm.estado pago_estado, pm.monto pago_monto, pm.fecha_pago'}
    FROM matriculas m
    JOIN periodos_academicos pa ON pa.id = m.periodo_academico_id
    LEFT JOIN cursos cu ON cu.id = m.curso_id
    LEFT JOIN grados g ON g.id = COALESCE(m.grado_id, cu.grado_id)
    ${!conPago ? '' : 'LEFT JOIN pagos_matricula pm ON pm.alumno_id = m.alumno_id AND pm.periodo_academico_id = m.periodo_academico_id'}
    WHERE m.alumno_id = ? ${periodoId ? 'AND m.periodo_academico_id = ?' : ''} ${teacherFilter}
    ORDER BY pa.fecha_inicio DESC, m.periodo_academico_id DESC, g.nombre, cu.nombre, m.id`,
    [alumnoId, ...(periodoId ? [periodoId] : []), ...(scope?.params || [])]);
  return agruparMatriculasAlumno(rows, conPago);
}

export function agruparMatriculasAlumno(rows: any[], incluirPago = true, db: Pick<typeof pool, 'query'> = pool) {
  const grupos = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.periodo_academico_id}-${row.grado_id ?? 'sin-grado'}`;
    if (!grupos.has(key)) grupos.set(key, {
      id: row.id, periodo_academico_id: row.periodo_academico_id, periodo: row.periodo, periodo_activo: row.periodo_activo,
      grado_id: row.grado_id, grado: row.grado, inscripciones: [],
      ...(incluirPago ? { pago: row.pago_id ? { id: row.pago_id, estado: row.pago_estado, monto: row.pago_monto, fecha_pago: row.fecha_pago } : null } : {}),
    });
    const grupo = grupos.get(key);
    grupo.id = Math.min(grupo.id, row.id);
    grupo.inscripciones.push({ id: row.id, curso_id: row.curso_id, curso: row.curso,
      codigo: row.curso_codigo, estado: row.estado, fecha_matricula: row.fecha_matricula });
  }
  return [...grupos.values()];
}
