import { CourseResults } from './ReportPresentation';
import AutomaticReportPanel from './AutomaticReportPanel';
import { useEffect, useState } from 'react';
import { Printer, Search, GraduationCap, ChevronRight, FileText, Download } from 'lucide-react';
import { alumnosApi, documentosApi } from '../../api/endpoints';
import { useDebounce } from '../../hooks/useDebounce';
import type { Alumno } from '../../types';
import { academicGroups, groupKey, reportCourses, recordDate, recordNumber, type StudentRecord, type AcademicGroup, type ReportCourse } from './academic-record';
import './student-record.css';

type View = 'libreta' | 'historial' | 'asistencia' | 'ficha' | 'documentos';
const sections: [View, string][] = [['libreta', 'Libreta de notas'], ['historial', 'Historial académico'], ['asistencia', 'Asistencia'], ['ficha', 'Ficha y apoderados'], ['documentos', 'Documentos vinculados']];
const failure = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo cargar la información. Intenta nuevamente.';
export default function StudentRecordsPanel({ onUploadDocument, version }: { onUploadDocument: (id: number, name: string) => void; version: number }) {
  const [search, setSearch] = useState('');
  const query = useDebounce(search);
  const [students, setStudents] = useState<Alumno[]>([]);
  const [page, setPage] = useState(1), [pages, setPages] = useState(1);
  const [listLoading, setListLoading] = useState(true), [listError, setListError] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);
  const [record, setRecord] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [reload, setReload] = useState(0), [selectedGroup, setSelectedGroup] = useState('');
  const [view, setView] = useState<View>('libreta');
  const [downloading, setDownloading] = useState<number | null>(null), [downloadError, setDownloadError] = useState('');
  useEffect(() => {
    let active = true;
    setListLoading(true); setListError('');
    alumnosApi.getAll({ search: query, page, limit: 8 }).then(response => {
      if (active) { setStudents(response.data.data || []); setPages(response.data.totalPages || 1); }
    }).catch(error => { if (active) { setStudents([]); setListError(failure(error)); } }).finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [query, page, reload]);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setLoading(true); setError(''); setRecord(null); setDownloadError('');
    alumnosApi.getExpediente(studentId).then(response => {
      if (!active) return;
      const data = response.data.data;
      if (!data) throw new Error('Expediente no disponible');
      setRecord(data);
      const available = academicGroups(data);
      const activeEnrollment = data.matriculas.find(m => m.periodo_activo);
      const preferred = activeEnrollment ? available.find(g => g.periodo_id === activeEnrollment.periodo_academico_id && g.grado_id === activeEnrollment.grado_id) : available[0];
      setSelectedGroup(current => available.some(g => groupKey(g) === current) ? current : preferred ? groupKey(preferred) : '');
    }).catch(error => { if (active) setError(failure(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, reload, version]);
  const groups = record ? academicGroups(record) : [];
  const periods = [...new Map(groups.map(g => [g.periodo_id, g.periodo])).entries()];
  const group = groups.find(g => groupKey(g) === selectedGroup);
  const courses = record && group ? reportCourses(record, group) : [];
  const attendance = record?.asistencia.filter(a => group && a.periodo_id === group.periodo_id && a.grado_id === group.grado_id) || [];
  const unattributed = record?.asistencia.filter(a => !a.periodo_id).reduce((sum, a) => sum + Number(a.total), 0) || 0;
  async function download(id: number, title: string) {
    setDownloading(id); setDownloadError('');
    try {
      const response = await documentosApi.download(id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = title; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDownloadError(failure(error)); } finally { setDownloading(null); }
  }
  return <section className="student-records space-y-4" aria-label="Expediente estudiantil">
    <header><h2 className="text-xl font-bold">Expediente estudiantil</h2><p className="mt-1 text-sm text-gray-500">Consulta la trayectoria del alumno y elige la libreta que deseas imprimir.</p></header>
    <details className="card" open={!studentId}>
      <summary className="cursor-pointer py-2 font-semibold">{studentId ? 'Cambiar alumno' : 'Seleccionar alumno'}</summary>
      <label className="mt-3 block text-sm font-medium">Buscar alumno<div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-gray-400"/><input type="search" className="input-field pl-10" value={search} placeholder="Nombre, apellido o código" onChange={event => { setSearch(event.target.value); setPage(1); }}/></div></label>
      {listLoading ? <p role="status" className="py-5 text-sm text-gray-500">Buscando alumnos…</p> : listError ? <div role="alert" className="py-4 text-sm text-red-600">{listError}<button className="btn-secondary ml-2" onClick={() => setReload(n => n + 1)}>Reintentar</button></div> : !students.length ? <p className="py-5 text-sm text-gray-500">No hay alumnos para esta búsqueda.</p> : <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{students.map(student => <button type="button" key={student.id} onClick={() => { if (studentId === student.id) setReload(n => n + 1); setStudentId(student.id); setRecord(null); setSelectedGroup(''); setError(''); setView('libreta'); }} className="record-student-choice" aria-pressed={studentId === student.id}><GraduationCap aria-hidden="true" className="h-5 w-5 shrink-0"/><span className="min-w-0 flex-1 text-left"><strong className="block break-words text-sm">{student.nombre} {student.apellido}</strong><span className="text-xs text-gray-500">{student.codigo_alumno}</span></span><ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0"/></button>)}</div>}
      {pages > 1 && <div className="mt-4 flex items-center justify-between gap-2"><button className="btn-secondary" disabled={listLoading || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span className="text-xs">{page} / {pages}</span><button className="btn-secondary" disabled={listLoading || page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>}
    </details>
    {!studentId && <div className="record-intro-grid">{sections.map(([key, title]) => <div className="card" key={key}><FileText aria-hidden="true" className="mb-3 h-5 w-5 text-gray-500"/><h3 className="text-sm font-semibold">{title}</h3></div>)}</div>}
    {loading && <p role="status" className="card py-8">Cargando expediente…</p>}
    {error && <div role="alert" className="card text-red-600">{error}<button className="btn-secondary ml-3" onClick={() => setReload(n => n + 1)}>Reintentar</button></div>}
    {record && !loading && <>
      <header className="card flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-bold">{record.alumno.nombre} {record.alumno.apellido}</h2><p className="mt-1 text-sm text-gray-500">{record.alumno.codigo_alumno} · {record.alumno.estado}</p></div><button className="btn-secondary" onClick={() => setReload(n => n + 1)}>Actualizar expediente</button></header>
      <nav className="record-tabs" aria-label="Secciones del expediente">{sections.map(([key, title]) => <button key={key} type="button" aria-pressed={view === key} className={view === key ? 'btn-primary' : 'btn-secondary'} onClick={() => { setView(key); setDownloadError(''); }}>{title}</button>)}</nav>
      {(view === 'libreta' || view === 'asistencia') && <section className="card space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Periodo de la libreta<select className="input-field mt-2" value={group?.periodo_id || ''} onChange={event => { const next = groups.find(g => g.periodo_id === Number(event.target.value)); setSelectedGroup(next ? groupKey(next) : ''); }}><option value="" disabled>Selecciona un periodo</option>{periods.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="text-sm font-medium">Grado de la libreta<select className="input-field mt-2" value={selectedGroup} disabled={!group} onChange={event => setSelectedGroup(event.target.value)}><option value="" disabled>Selecciona un grado</option>{groups.filter(g => g.periodo_id === group?.periodo_id).map(g => <option key={groupKey(g)} value={groupKey(g)}>{g.grado || 'Sin grado atribuible'}</option>)}</select></label></div>{!groups.length && <p className="text-sm text-gray-500">Este alumno todavía no tiene registros académicos.</p>}</section>}
      {view === 'libreta' && <section className="space-y-4" aria-label="Libreta seleccionada"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{group ? `${group.periodo} · ${group.grado || 'Sin grado atribuible'}` : 'Libreta de notas'}</h2><p className="mt-1 text-xs text-gray-500">Notas y reglas de este grado y periodo.</p></div></div>{group && !courses.length && <p className="card text-sm text-gray-500">No hay cursos ni notas para esta selección.</p>}{!group && <button type="button" disabled className="btn-primary">Imprimir libreta seleccionada</button>}{group && <AutomaticReportPanel key={`${record.alumno.id}:${group.periodo_id}:${group.grado_id}`} record={record} group={group} courses={courses}/>}<p className="text-xs text-gray-500">“Sin registrar” no equivale a cero. Las notas históricas sin escala se identifican por separado. En la ventana de impresión puedes elegir guardar como PDF.</p></section>}
      {view === 'historial' && <section className="space-y-3" aria-label="Historial académico">{!record.matriculas.length ? <p className="card text-sm text-gray-500">Sin matrículas registradas.</p> : record.matriculas.map(m => <details key={`${m.periodo_academico_id}:${m.grado_id}`} className="card"><summary className="cursor-pointer py-2"><strong>{m.periodo} · {m.grado || 'Sin grado registrado'}</strong><span className="mt-1 block text-xs text-gray-500">{m.inscripciones.length} inscripciones · Toca para consultar</span></summary><div className="mt-3 space-y-2">{m.inscripciones.map(c => <div key={c.id} className="record-evaluation"><div><p className="text-sm font-medium">{c.curso || 'Sin curso'}</p><p className="text-xs text-gray-500">{recordDate(c.fecha_matricula)}</p></div><span className="text-xs">{c.estado}</span></div>)}<button className="btn-secondary mt-2 w-full" onClick={() => { setSelectedGroup(groupKey({ periodo_id: m.periodo_academico_id, grado_id: m.grado_id })); setView('libreta'); }}>Ver libreta de este grado y periodo</button></div></details>)}</section>}
      {view === 'asistencia' && <section className="space-y-3"><h2 className="font-semibold">Resumen de asistencia del grado y periodo seleccionados</h2><div className="record-intro-grid">{['presente', 'ausente', 'tardanza', 'justificado'].map(state => <article className="card" key={state}><p className="text-sm capitalize text-gray-500">{state}</p><strong className="mt-2 block text-2xl">{attendance.filter(a => a.estado === state).reduce((sum, a) => sum + Number(a.total), 0)}</strong></article>)}</div><p className="text-xs text-gray-500">Se cuentan registros de clase; puede haber varias clases el mismo día.{unattributed > 0 ? ` Hay ${unattributed} registros históricos sin periodo inequívoco, que no se suman a esta selección.` : ''}</p></section>}
      {view === 'ficha' && <div className="grid items-start gap-4 md:grid-cols-2"><section className="card"><h2 className="font-semibold">Ficha del alumno</h2><dl className="mobile-bento-fields mt-4">{[['DNI', record.alumno.dni], ['Correo', record.alumno.email], ['Teléfono', record.alumno.telefono], ['Nacimiento', record.alumno.fecha_nacimiento ? recordDate(record.alumno.fecha_nacimiento) : null], ['Dirección', record.alumno.direccion]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Sin registrar'}</dd></div>)}</dl></section><section className="card"><h2 className="font-semibold">Apoderados y contactos</h2>{!record.apoderados.length ? <p className="mt-3 text-sm text-gray-500">Sin apoderados vinculados.</p> : record.apoderados.map(a => <article key={a.id} className="mt-4 space-y-1 break-words text-sm"><h3 className="font-semibold">{a.nombre} {a.apellido}</h3><p className="text-gray-500">{a.parentesco || 'Parentesco sin registrar'}</p><p className="break-all">{a.email}</p><p>{a.telefono || 'Teléfono sin registrar'}</p></article>)}</section></div>}
      {view === 'documentos' && <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Archivos asociados a este alumno</h2><button type="button" className="btn-primary" onClick={() => onUploadDocument(record.alumno.id, `${record.alumno.nombre} ${record.alumno.apellido}`)}>Adjuntar al expediente</button></div>{downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}{!record.documentos.length ? <p className="card text-sm text-gray-500">No hay documentos vinculados a este alumno.</p> : <div className="record-intro-grid">{record.documentos.map(d => <article className="card" key={d.id}><h3 className="break-words text-sm font-semibold">{d.titulo}</h3><p className="mt-2 text-xs text-gray-500">{d.tipo_archivo} · {d.estado}</p><button type="button" className="btn-secondary mt-3 w-full gap-2" disabled={downloading !== null} onClick={() => void download(d.id, d.titulo)}><Download aria-hidden="true" className="h-4 w-4"/>{downloading === d.id ? 'Descargando…' : 'Descargar'}</button></article>)}</div>}</section>}

    </>}
  </section>;
}
