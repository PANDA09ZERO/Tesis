export interface AcademicGroup { periodo_id: number; grado_id: number | null; periodo: string; grado: string | null }
export interface RecordGrade extends AcademicGroup {
  id: number; curso_id: number; curso: string; evaluacion_id: number | null; evaluacion: string | null;
  nota: number | string; escala_maxima: number | string | null; fecha: string | null; observaciones: string | null;
}
export interface RecordEvaluation extends AcademicGroup {
  id: number; curso_id: number; curso: string; nombre: string; fecha: string; nota_maxima: number | string; estado: string;
}
export interface Enrollment {
  periodo_academico_id: number; periodo_activo: number; periodo: string; grado_id: number | null; grado: string | null;
  inscripciones: { id: number; curso_id: number | null; curso: string | null; codigo: string | null; estado: string; fecha_matricula: string }[];
}
export interface StudentRecord {
  alumno: { id: number; nombre: string; apellido: string; codigo_alumno: string; estado: string; dni: string | null; email: string; telefono: string | null; direccion: string | null; fecha_nacimiento: string | null };
  matriculas: Enrollment[];
  calificaciones: RecordGrade[];
  evaluaciones: RecordEvaluation[];
  asistencia: { periodo_id: number | null; grado_id: number | null; periodo: string | null; grado: string | null; estado: string; total: number | string }[];
  apoderados: { id: number; nombre: string; apellido: string; email: string; telefono: string | null; parentesco: string | null }[];
  documentos: { id: number; titulo: string; tipo_archivo: string; estado: string }[];
}
export const groupKey = (group: Pick<AcademicGroup, 'periodo_id' | 'grado_id'>) => `${group.periodo_id}:${group.grado_id ?? 'sin-grado'}`;
export function academicGroups(record: StudentRecord): AcademicGroup[] {
  const groups = new Map<string, AcademicGroup>();
  const add = (group: AcademicGroup) => { groups.set(groupKey(group), group); };
  record.matriculas.forEach(m => add({ periodo_id: m.periodo_academico_id, periodo: m.periodo, grado_id: m.grado_id, grado: m.grado }));
  [...record.calificaciones, ...record.evaluaciones].forEach(g => add({ periodo_id: g.periodo_id, periodo: g.periodo, grado_id: g.grado_id, grado: g.grado }));
  record.asistencia.forEach(g => { if (g.periodo_id) add({ periodo_id: g.periodo_id, periodo: g.periodo || 'Periodo sin nombre', grado_id: g.grado_id, grado: g.grado }); });
  return [...groups.values()];
}
export interface ReportCourse {
  id: number; nombre: string; estado: string | null;
  rows: { key: string; evaluacion: string; fecha: string | null; nota: number | string | null; maxima: number | string | null; observaciones?: string | null }[];
}
export function reportCourses(record: StudentRecord, group: AcademicGroup): ReportCourse[] {
  const key = groupKey(group);
  const courses = new Map<number, ReportCourse>();
  const get = (id: number, nombre: string) => {
    let course = courses.get(id);
    if (!course) { course = { id, nombre, estado: null, rows: [] }; courses.set(id, course); }
    return course;
  };
  record.matriculas.filter(m => groupKey({ periodo_id: m.periodo_academico_id, grado_id: m.grado_id }) === key).forEach(m => {
    m.inscripciones.forEach(c => { if (c.curso_id) get(c.curso_id, c.curso || 'Curso sin nombre').estado = c.estado; });
  });
  const grades = record.calificaciones.filter(g => groupKey(g) === key);
  record.evaluaciones.filter(e => groupKey(e) === key).forEach(e => {
    if (!grades.some(g => g.evaluacion_id === e.id)) get(e.curso_id, e.curso).rows.push({ key: `e${e.id}`, evaluacion: e.nombre, fecha: e.fecha, nota: null, maxima: e.nota_maxima });
  });
  grades.forEach(g => get(g.curso_id, g.curso).rows.push({ key: `g${g.id}`, evaluacion: g.evaluacion || 'Registro histórico sin evaluación vinculada', fecha: g.fecha, nota: g.nota, maxima: g.escala_maxima, observaciones: g.observaciones }));
  return [...courses.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(c => ({ ...c, rows: c.rows.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || a.key.localeCompare(b.key)) }));
}
export const recordDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10).split('-').reverse().join('/') : 'Sin fecha';
export const recordNumber = (value: string | number) => Number(value).toLocaleString('es-PE', { maximumFractionDigits: 2 });
export interface LibretaPolicy {
 escala:'numerica'|'literal'; maxima:number; minima:number; decimales:number;
 pesos:{practica:number;trabajo:number;examen:number}; normalizar:boolean; excluir_historicas:boolean;
 recuperacion:'mayor'|'reemplazar'|'promediar'; categorias:Record<string,'practica'|'trabajo'|'examen'>;
 recuperaciones:Record<string,number>; niveles:{AD:number;A:number;B:number};
}
export interface CalculatedReport {
 alumno:StudentRecord['alumno']; periodo_id:number;grado_id:number;periodo:string;grado:string;
 listo:boolean; reglas:LibretaPolicy;
 cursos:{id:number;nombre:string;estado:string|null;final:number|null;valor:string|null;condicion:string;pendientes:string[];categorias:{categoria:string;peso:number;promedio:number|null}[]}[];
}
export interface CalculatedResponse { detalle:StudentRecord; huella:string; configuracion:LibretaPolicy; revision:number; cerrado:boolean; guardado:boolean; calculo:CalculatedReport; emisiones:{id:number;version:number;created_at:string}[] }
export interface IssuedReport { id:number;version:number;created_at:string;contenido:{calculo:CalculatedReport;detalle:StudentRecord;revision:number;emitida_en:string} }

export interface LibretaInstitucion {
  dre: string;
  ugel: string;
  nivel: string;
  codigoModular: string;
  institucion: string;
  seccion: string;
  docente: string;
}

export const DEFAULT_LIBRETA_INSTITUCION: LibretaInstitucion = {
  dre: 'DRE LIMA METROPOLITANA',
  ugel: 'UGEL 01',
  nivel: 'Educación Básica',
  codigoModular: '00000000',
  institucion: 'Ciencias e Ingeniería',
  seccion: 'A',
  docente: 'Docente del grado',
};

export const LIBRETA_INSTITUCION_KEY = 'libreta_institucion';

export function loadLibretaInstitucion(): LibretaInstitucion {
  try {
    const raw = localStorage.getItem(LIBRETA_INSTITUCION_KEY);
    if (raw) return { ...DEFAULT_LIBRETA_INSTITUCION, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return { ...DEFAULT_LIBRETA_INSTITUCION };
}
export interface RulesResponse { configuracion:LibretaPolicy;revision:number;cerrado:boolean;guardado:boolean;grado:string;periodo:string;evaluaciones:{id:number;nombre:string;curso:string;curso_id:number;tipo:string;nota_maxima:number|string}[] }
