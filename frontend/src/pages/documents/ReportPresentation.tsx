import { createPortal } from 'react-dom';
import { recordDate, recordNumber, type StudentRecord, type AcademicGroup, type ReportCourse, type CalculatedReport, type IssuedReport } from './academic-record';

export function ReportOutcomes({calculation}:{calculation:CalculatedReport}) {
 return <section className="space-y-3" aria-label="Resultados automáticos"><h3 className="font-semibold">Notas finales · {calculation.reglas.escala==='literal'?'Escala literal':`Escala 0–${calculation.reglas.maxima}`}</h3>{calculation.cursos.map(course=><article key={course.id} className="record-course"><div className="flex flex-wrap justify-between gap-3"><h4 className="font-semibold">{course.nombre}</h4><p className="text-sm"><strong>{course.valor ?? (course.condicion==='No aplica'?'—':'Pendiente')}</strong> · {course.condicion}</p></div>{course.pendientes.length>0&&<ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-500">{course.pendientes.map(item=><li key={item}>{item}</li>)}</ul>}</article>)}</section>;
}
export function CourseResults({ course }: { course: ReportCourse }) {
  return <section className="record-course"><header className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{course.nombre}</h3>{course.estado && <span className="text-xs text-gray-500">Matrícula {course.estado}</span>}</header>
    {!course.rows.length ? <p className="mt-3 text-sm text-gray-500">Sin evaluaciones registradas.</p> : <div className="mt-3 space-y-3">{course.rows.map(row => <div key={row.key} className="record-evaluation"><div className="min-w-0"><p className="break-words text-sm font-medium">{row.evaluacion}</p><p className="mt-1 text-xs text-gray-500">{recordDate(row.fecha)}</p>{row.observaciones && <p className="mt-1 break-words text-xs text-gray-500">{row.observaciones}</p>}</div><div className="record-score">{row.nota === null ? <span className="text-xs">Sin registrar</span> : <strong>{recordNumber(row.nota)}</strong>}<span className="text-xs font-normal">{row.maxima == null ? 'Escala no registrada' : `de ${recordNumber(row.maxima)}`}</span></div></div>)}</div>}
  </section>;
}
export function PrintableReport({ record, group, courses, calculation, edition }: { record: StudentRecord; group: AcademicGroup; courses: ReportCourse[]; calculation?: CalculatedReport; edition?: IssuedReport }) {
  return createPortal(<article className="student-report-print" aria-hidden="true">
    <header className="report-letterhead"><img src="/assets/logo.png" alt=""/><div><h1>Ciencias e Ingeniería</h1><h2>{edition ? `Libreta definitiva · Versión ${edition.version}` : 'Libreta preliminar'}</h2><p>Periodo académico: {group.periodo} · Grado: {group.grado || 'Sin atribución inequívoca'}</p></div></header>
    <section className="report-identity"><h2>{record.alumno.apellido}, {record.alumno.nombre}</h2><p>Código: {record.alumno.codigo_alumno}{record.alumno.dni ? ` · DNI: ${record.alumno.dni}` : ''}</p></section>
    <p className="report-note">Evaluaciones registradas y escalas originales. “Sin registrar” indica que no hay nota guardada; no equivale a cero. Las notas finales se muestran únicamente cuando las evaluaciones y reglas están completas.</p>
    {calculation && <p className="report-note">Ponderaciones: prácticas {calculation.reglas.pesos.practica} %, trabajos {calculation.reglas.pesos.trabajo} %, exámenes {calculation.reglas.pesos.examen} %. Mínimo aprobatorio: {calculation.reglas.minima}. Redondeo final: {calculation.reglas.decimales} {calculation.reglas.decimales===1?'decimal':'decimales'}.</p>}
    {calculation && <ReportOutcomes calculation={calculation}/>}
    {courses.map(course => <CourseResults key={course.id} course={course}/>)}
    <footer className="report-footer"><span>Emitido: {new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' }).format(edition ? new Date(edition.contenido.emitida_en) : new Date())}</span><p>Firma y sello de la institución: __________________________________</p></footer>
  </article>, document.body);
}
