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
export function PrintableReport({ record, group, courses, calculation, edition, institucion }: { record: StudentRecord; group: AcademicGroup; courses: ReportCourse[]; calculation?: CalculatedReport; edition?: IssuedReport; institucion?: import('./academic-record').LibretaInstitucion }) {
  const inst = institucion || { dre: 'DRE LIMA METROPOLITANA', ugel: 'UGEL 01', nivel: 'Educación Básica', codigoModular: '00000000', institucion: 'Ciencias e Ingeniería', seccion: 'A', docente: 'Docente del grado' };
  const competencias = (course: ReportCourse) => course.rows.length ? course.rows.map(row => row.evaluacion).join('; ') : '—';
  const nivel = (course: ReportCourse) => {
    const calculado = calculation?.cursos.find(item => item.id === course.id);
    if (calculado?.valor) return calculado.valor;
    if (course.rows.length && course.rows.every(row => row.nota !== null)) return 'Registrado';
    return 'Pendiente';
  };
  const conclusion = (course: ReportCourse) => {
    const calculado = calculation?.cursos.find(item => item.id === course.id);
    if (calculado?.condicion) return calculado.condicion;
    const observaciones = course.rows.map(row => row.observaciones).filter(Boolean).join(' ');
    return observaciones || '—';
  };
  return createPortal(<article className="student-report-print" aria-hidden="true">
    <header className="report-header">
      <div className="report-republic">República del Perú</div>
      <div className="report-minedu">Ministerio de Educación</div>
      <h1>INFORME DE PROGRESO DEL ESTUDIANTE</h1>
      <p className="report-subtitle">Periodo académico: {group.periodo} · Grado: {group.grado || 'Sin atribución inequívoca'}</p>
    </header>
    <section className="report-info">
      <table className="report-info-table">
        <tbody>
          <tr><th>DRE</th><td>{inst.dre}</td><th>UGEL</th><td>{inst.ugel}</td></tr>
          <tr><th>Nivel</th><td>{inst.nivel}</td><th>Código Modular</th><td>{inst.codigoModular}</td></tr>
          <tr><th>Institución educativa</th><td colSpan={3}>{inst.institucion}</td></tr>
          <tr><th>Grado</th><td>{group.grado || '—'}</td><th>Sección</th><td>{inst.seccion}</td></tr>
        </tbody>
      </table>
    </section>
    <section className="report-identity">
      <table className="report-info-table">
        <tbody>
          <tr><th>Apellidos y nombres del estudiante</th><td colSpan={3}>{record.alumno.apellido}, {record.alumno.nombre}</td></tr>
          <tr><th>Código del estudiante</th><td>{record.alumno.codigo_alumno}</td><th>DNI</th><td>{record.alumno.dni || '—'}</td></tr>
          <tr><th>Apellidos y nombres del docente o tutor</th><td colSpan={3}>{inst.docente}</td></tr>
        </tbody>
      </table>
    </section>
    <table className="report-progress-table">
      <thead>
        <tr>
          <th>Área curricular</th>
          <th>Competencias</th>
          <th>Nivel de logro alcanzado</th>
          <th>Conclusión descriptiva</th>
        </tr>
      </thead>
      <tbody>
        {courses.map(course => (
          <tr key={course.id}>
            <td className="report-area">{course.nombre}</td>
            <td>{competencias(course)}</td>
            <td className="report-level">{nivel(course)}</td>
            <td>{conclusion(course)}</td>
          </tr>
        ))}
        {!courses.length && (
          <tr><td colSpan={4}>Sin cursos ni evaluaciones registradas para esta selección.</td></tr>
        )}
      </tbody>
    </table>
    {calculation && <p className="report-note">Ponderaciones: prácticas {calculation.reglas.pesos.practica} %, trabajos {calculation.reglas.pesos.trabajo} %, exámenes {calculation.reglas.pesos.examen} %. Mínimo aprobatorio: {calculation.reglas.minima}. Redondeo final: {calculation.reglas.decimales} {calculation.reglas.decimales===1?'decimal':'decimales'}.</p>}
    <footer className="report-footer">
      <span>MINEDU - Informe de Progreso del Estudiante 2020</span>
      <span>Página 1 de 1</span>
      <p>Emitido: {new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' }).format(edition ? new Date(edition.contenido.emitida_en) : new Date())} · {edition ? `Versión definitiva ${edition.version}` : 'Libreta preliminar'}</p>
      <p>Firma y sello de la institución: __________________________________</p>
    </footer>
  </article>, document.body);
}
