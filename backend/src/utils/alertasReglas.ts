import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool } from 'mysql2/promise';
import { academicToday, periodoVigenteSql } from './periodoVigencia';

/**
 * Alertas académicas por reglas (sin IA). Revisa a los alumnos con matrícula activa
 * en el periodo vigente y genera, actualiza o da por superada una alerta por alumno.
 */
export type Riesgo = 'bajo' | 'medio' | 'alto';
export const CRITERIOS = {
  ventanaDias: 30,
  notaAprobatoria: 11,
  faltas: { medio: 3, alto: 5 },
  tardanzas: { bajo: 3, medio: 5 },
  cursosDesaprobados: { medio: 1, alto: 2 },
  incidencias: { bajo: 1, medio: 2 },
  diasRespetoResuelta: 14,
} as const;

const ORDEN: Record<Riesgo, number> = { bajo: 1, medio: 2, alto: 3 };
const PUNTOS: Record<Riesgo, number> = { bajo: 15, medio: 35, alto: 60 };

export interface MetricasAlumno {
  faltas: number;
  tardanzas: number;
  cursosDesaprobados: { curso: string; promedio: number }[];
  incidencias: number;
  incidenciasGraves: number;
}
export interface Indicador { tipo: 'faltas' | 'tardanzas' | 'notas' | 'conducta'; riesgo: Riesgo; valor: number; detalle: string }
export interface Evaluacion { tipo_riesgo: Riesgo; nivel_riesgo: number; indicadores: Indicador[]; descripcion: string; recomendacion: string }

export function evaluarAlumno(m: MetricasAlumno): Evaluacion | null {
  const c = CRITERIOS, dias = c.ventanaDias, ind: Indicador[] = [];
  if (m.faltas >= c.faltas.medio) ind.push({ tipo: 'faltas', riesgo: m.faltas >= c.faltas.alto ? 'alto' : 'medio', valor: m.faltas, detalle: `${m.faltas} días con faltas sin justificar en los últimos ${dias} días` });
  if (m.tardanzas >= c.tardanzas.bajo) ind.push({ tipo: 'tardanzas', riesgo: m.tardanzas >= c.tardanzas.medio ? 'medio' : 'bajo', valor: m.tardanzas, detalle: `${m.tardanzas} días con tardanza en los últimos ${dias} días` });
  const des = m.cursosDesaprobados.length;
  if (des >= c.cursosDesaprobados.medio) ind.push({ tipo: 'notas', riesgo: des >= c.cursosDesaprobados.alto ? 'alto' : 'medio', valor: des,
    detalle: `Promedio desaprobatorio en ${m.cursosDesaprobados.map(x => `${x.curso} (${x.promedio.toFixed(1)})`).join(', ')}` });
  if (m.incidencias >= c.incidencias.bajo) ind.push({ tipo: 'conducta', riesgo: m.incidenciasGraves > 0 ? 'alto' : m.incidencias >= c.incidencias.medio ? 'medio' : 'bajo', valor: m.incidencias,
    detalle: `${m.incidencias} incidencia${m.incidencias > 1 ? 's' : ''} de conducta en los últimos ${dias} días${m.incidenciasGraves ? ` (${m.incidenciasGraves} grave${m.incidenciasGraves > 1 ? 's' : ''})` : ''}` });
  if (!ind.length) return null;

  const tipo = ind.reduce<Riesgo>((max, i) => ORDEN[i.riesgo] > ORDEN[max] ? i.riesgo : max, 'bajo');
  const nivel = Math.min(100, ind.reduce((s, i) => s + PUNTOS[i.riesgo], 0));
  const pasos: string[] = [];
  if (ind.some(i => i.tipo === 'faltas' || i.tipo === 'tardanzas')) pasos.push('verificar con el apoderado el motivo de las faltas o tardanzas');
  if (ind.some(i => i.tipo === 'notas')) pasos.push('coordinar reforzamiento con los docentes de los cursos desaprobados');
  if (ind.some(i => i.tipo === 'conducta')) pasos.push('revisar las incidencias registradas con tutoría');
  if (tipo === 'alto') pasos.unshift('citar al apoderado a una reunión');
  const recomendacion = pasos.join('; ').replace(/^./, s => s.toUpperCase()) + '.';
  return { tipo_riesgo: tipo, nivel_riesgo: nivel, indicadores: ind, descripcion: ind.map(i => i.detalle).join('. ') + '.', recomendacion };
}

const restarDias = (fecha: string, dias: number) => { const d = new Date(fecha + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - dias); return d.toISOString().slice(0, 10); };

export interface ResultadoEvaluacion { periodo: string | null; evaluados: number; creadas: number; actualizadas: number; superadas: number; omitidas: number }

/** Recorre el periodo vigente. Usa GET_LOCK para que dos ejecuciones no se crucen. */
export async function evaluarAlertas(pool: Pool, hoy = academicToday()): Promise<ResultadoEvaluacion> {
  const vacio = { periodo: null, evaluados: 0, creadas: 0, actualizadas: 0, superadas: 0, omitidas: 0 };
  const db = await pool.getConnection();
  try {
    const [lock] = await db.query<RowDataPacket[]>("SELECT GET_LOCK('evaluacion_alertas', 0) ok");
    if (!lock[0]?.ok) throw Object.assign(new Error('Ya hay una evaluación de alertas en curso'), { status: 409 });
    try {
      const [periodos] = await db.query<RowDataPacket[]>(`SELECT id, nombre, DATE_FORMAT(fecha_inicio,'%Y-%m-%d') inicio FROM periodos_academicos pa WHERE ${periodoVigenteSql('pa')} ORDER BY id DESC LIMIT 1`);
      if (!periodos.length) return vacio;
      const periodo = periodos[0];
      const desde = [restarDias(hoy, CRITERIOS.ventanaDias - 1), periodo.inicio].sort().pop()!;

      const [alumnos] = await db.query<RowDataPacket[]>("SELECT DISTINCT alumno_id FROM matriculas WHERE periodo_academico_id = ? AND estado = 'activa'", [periodo.id]);
      const [asis] = await db.query<RowDataPacket[]>(`SELECT alumno_id, COUNT(DISTINCT CASE WHEN estado='ausente' THEN fecha END) faltas,
          COUNT(DISTINCT CASE WHEN estado='tardanza' THEN fecha END) tardanzas
        FROM asistencias WHERE fecha BETWEEN ? AND ? GROUP BY alumno_id`, [desde, hoy]);
      const [notas] = await db.query<RowDataPacket[]>(`SELECT c.alumno_id, cu.nombre curso, AVG(c.nota * 20 / e.nota_maxima) promedio
        FROM calificaciones c JOIN evaluaciones e ON e.id = c.evaluacion_id JOIN cursos cu ON cu.id = c.curso_id
        WHERE c.periodo_academico_id = ? GROUP BY c.alumno_id, c.curso_id, cu.nombre HAVING promedio < ?`, [periodo.id, CRITERIOS.notaAprobatoria]);
      let inc: RowDataPacket[] = [];
      try {
        [inc] = await db.query<RowDataPacket[]>(`SELECT alumno_id, COUNT(*) total, SUM(gravedad='grave') graves FROM incidencias WHERE fecha BETWEEN ? AND ? GROUP BY alumno_id`, [desde, hoy]);
      } catch (e: any) { if (e?.code !== 'ER_NO_SUCH_TABLE') throw e; } // la tabla puede no existir aún
      const [abiertas] = await db.query<RowDataPacket[]>("SELECT id, alumno_id, tipo_riesgo, nivel_riesgo, estado FROM alertas_academicas WHERE generada_por_ia = 0 AND estado IN ('activa','atendida')");
      const [resueltas] = await db.query<RowDataPacket[]>(`SELECT alumno_id, MAX(nivel_riesgo) nivel FROM alertas_academicas
        WHERE generada_por_ia = 0 AND estado = 'resuelta' AND updated_at >= ? GROUP BY alumno_id`, [restarDias(hoy, CRITERIOS.diasRespetoResuelta)]);

      const porAlumno = <T>(rows: RowDataPacket[], f: (r: RowDataPacket) => T) => new Map(rows.map(r => [Number(r.alumno_id), f(r)]));
      const mAsis = porAlumno(asis, r => r), mInc = porAlumno(inc, r => r), mAbierta = porAlumno(abiertas, r => r), mResuelta = porAlumno(resueltas, r => Number(r.nivel));
      const mNotas = new Map<number, { curso: string; promedio: number }[]>();
      for (const n of notas) { const k = Number(n.alumno_id); mNotas.set(k, [...(mNotas.get(k) || []), { curso: n.curso, promedio: Number(n.promedio) }]); }

      const r: ResultadoEvaluacion = { ...vacio, periodo: periodo.nombre };
      const activos = new Set<number>();
      for (const { alumno_id } of alumnos) {
        const id = Number(alumno_id); activos.add(id); r.evaluados++;
        const ev = evaluarAlumno({
          faltas: Number(mAsis.get(id)?.faltas || 0), tardanzas: Number(mAsis.get(id)?.tardanzas || 0),
          cursosDesaprobados: mNotas.get(id) || [], incidencias: Number(mInc.get(id)?.total || 0), incidenciasGraves: Number(mInc.get(id)?.graves || 0),
        });
        const abierta = mAbierta.get(id);
        const indicadores = ev && JSON.stringify({ periodo_id: periodo.id, ventana: { desde, hasta: hoy }, items: ev.indicadores });
        if (ev && abierta) {
          // Si la situación empeora, una alerta "atendida" vuelve a "activa".
          const empeora = ORDEN[ev.tipo_riesgo] > ORDEN[abierta.tipo_riesgo as Riesgo];
          await db.query(`UPDATE alertas_academicas SET tipo_riesgo=?, nivel_riesgo=?, indicadores=?, descripcion=?, recomendacion=?${empeora ? ", estado='activa'" : ''} WHERE id=?`,
            [ev.tipo_riesgo, ev.nivel_riesgo, indicadores, ev.descripcion, ev.recomendacion, abierta.id]);
          r.actualizadas++;
        } else if (ev) {
          const resuelta = mResuelta.get(id);
          if (resuelta !== undefined && ev.nivel_riesgo <= resuelta) { r.omitidas++; continue; } // respeta lo que se resolvió hace poco
          await db.query<ResultSetHeader>(`INSERT INTO alertas_academicas (alumno_id, tipo_riesgo, nivel_riesgo, indicadores, descripcion, recomendacion, estado, generada_por_ia)
            VALUES (?, ?, ?, ?, ?, ?, 'activa', 0)`, [id, ev.tipo_riesgo, ev.nivel_riesgo, indicadores, ev.descripcion, ev.recomendacion]);
          r.creadas++;
        } else if (abierta) {
          await db.query("UPDATE alertas_academicas SET estado='expirada', recomendacion=CONCAT(COALESCE(recomendacion,''), ' Situación superada según la última revisión automática.') WHERE id=?", [abierta.id]);
          r.superadas++;
        }
      }
      // Alumnos que ya no tienen matrícula activa: sus alertas automáticas abiertas se dan por superadas.
      for (const [id, a] of mAbierta) if (!activos.has(id)) { await db.query("UPDATE alertas_academicas SET estado='expirada' WHERE id=?", [a.id]); r.superadas++; }
      return r;
    } finally {
      await db.query("SELECT RELEASE_LOCK('evaluacion_alertas')");
    }
  } finally {
    db.release();
  }
}
