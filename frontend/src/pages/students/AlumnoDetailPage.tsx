import './students.css';
import FamilyStudentDetailPage from '../guardian/FamilyStudentDetailPage';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, BookOpen } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { alumnosApi } from '../../api/endpoints';
import DataTable from '../../components/ui/DataTable';
import { useAuth } from '../../context/AuthContext';
import IncidenciasAlumno from '../incidencias/IncidenciasAlumno';

function AcademicAlumnoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoContexto = searchParams.get('periodo_id');
  const { user } = useAuth();
  const [section, setSection] = useState('matricula');
  const [alumno, setAlumno] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const requestId = useRef(0);
  const esAdmin = user?.rol === 'administrador';

  useEffect(() => {
    setSection('matricula');
    const alumnoId = Number(id);
    const refresh = () => loadAlumno(alumnoId);
    refresh(); window.addEventListener('focus', refresh);
    return () => { requestId.current++; window.removeEventListener('focus', refresh); };
  }, [id, periodoContexto]);

  const loadAlumno = async (alumnoId: number) => {
    const request = ++requestId.current;
    setLoading(true); setLoadError('');
    if (!Number.isInteger(alumnoId) || alumnoId <= 0) { setAlumno(null); setLoading(false); return; }
    try {
      const res = await alumnosApi.getById(alumnoId, periodoContexto ? {periodo_id:periodoContexto} : undefined);
      if (request !== requestId.current) return;
      setAlumno(res.data.data); setMatriculas((res.data.data as any)?.matriculas_academicas || []);
    } catch (error: any) {
      if (request === requestId.current) setLoadError(error.response?.data?.message || 'No se pudo cargar el detalle del alumno');
    } finally { if (request === requestId.current) setLoading(false); }
  };

  if (loading) {
    return <div className="card animate-pulse h-64" />;
  }

  if (loadError) return <div className="card text-red-600" role="alert">{loadError}<button className="btn-secondary ml-3" onClick={() => loadAlumno(Number(id))}>Reintentar</button></div>;

  if (!alumno) {
    return <div className="text-center py-12 text-gray-500">Alumno no encontrado</div>;
  }

  const grados = user?.rol === 'profesor' ? matriculas : matriculas.filter(m=>m.periodo_activo&&m.inscripciones.some((c:any)=>c.estado==='activa'));
  const gradoContexto = [...new Set(grados.map(m=>m.grado).filter(Boolean))].join(', ');

  return (
    <div className="students-surface space-y-5">
      <button onClick={() => navigate(-1)} className="flex min-h-11 items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Volver
      </button>

      <div className="card">
        <div className="flex items-start gap-3 md:gap-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 md:h-24 md:w-24 md:rounded-full">
            <span className="text-lg font-bold text-primary-700 md:text-3xl">{alumno.nombre?.[0]}{alumno.apellido?.[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
              <div>
                <h2 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{alumno.nombre} {alumno.apellido}</h2>
                <p className="text-gray-500 font-mono">{alumno.codigo_alumno}</p>
              </div>
              <Badge variant={!matriculas.length ? 'info' : alumno.estado === 'matriculado' ? 'success' : alumno.estado ? 'danger' : 'info'}>{matriculas.length ? (alumno.estado || 'Con matrícula registrada') : 'Sin matrícula'}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              {alumno.email && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600"><Mail className="h-4 w-4 shrink-0" /> {alumno.email}</div>}
              {alumno.telefono && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600"><Phone className="h-4 w-4 shrink-0" /> {alumno.telefono}</div>}
              {alumno.fecha_nacimiento && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600"><Calendar className="h-4 w-4 shrink-0" /> {alumno.fecha_nacimiento}</div>}
              {gradoContexto && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600"><BookOpen className="h-4 w-4 shrink-0" /> {gradoContexto}</div>}
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Secciones del alumno" className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900 lg:hidden">
        {[['matricula','Matrícula y cursos'],['notas','Calificaciones'],['asistencia','Asistencia']].map(([key,label]) => <button key={key} type="button" aria-pressed={section===key} aria-controls={`student-${key}`} onClick={() => setSection(key)} className={`min-h-12 rounded-lg px-1 py-2 text-xs font-medium ${section===key ? 'bg-primary-600 text-white dark:bg-gray-700' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{label}</button>)}
      </nav>
      <section id="student-matricula" className={`card ${section==='matricula' ? '' : 'hidden lg:block'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Matrículas y cursos</h3>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center text-sm text-primary-600" onClick={() => loadAlumno(Number(id))}>Actualizar</button>
            {esAdmin && <button className="inline-flex min-h-11 items-center text-sm text-primary-600" onClick={() => navigate('/admin/matriculas')}>Gestionar matrícula</button>}
          </div>
        </div>
        {!matriculas.length ? <p className="py-8 text-center text-gray-500">Sin matrículas académicas registradas</p> :
          <div className="space-y-4">{matriculas.map(m => <div key={m.periodo_academico_id + '-' + m.grado_id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">{m.periodo}</p><p className="text-sm text-gray-600">Grado: {m.grado || 'Sin grado registrado'}</p></div>
              {'pago' in m && <Badge variant={m.pago?.estado === 'pagado' ? 'success' : 'warning'}>{m.pago?.estado === 'pagado' ? 'Matrícula pagada' : 'Matrícula pendiente de pago'}</Badge>}
            </div>
            {m.pago && <p className="mt-2 text-sm text-gray-500">Pago de matrícula: S/ {Number(m.pago.monto).toFixed(2)}{m.pago.fecha_pago ? ' · Fecha: ' + m.pago.fecha_pago.slice(0,10) : ''}. Un pago por alumno y periodo.</p>}
            <div className="mt-3 space-y-2">{m.inscripciones.map((c: any) => <div key={c.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3">
              <span>{c.curso || 'Matrícula sin curso asignado'}{c.codigo ? ' (' + c.codigo + ')' : ''}</span>
              <Badge variant={c.estado === 'activa' ? 'success' : c.estado === 'cancelada' ? 'danger' : 'info'}>{c.estado}</Badge>
            </div>)}</div>
          </div>)}</div>}
      </section>

      <div className={`${section==='matricula' ? 'hidden lg:grid' : 'grid'} grid-cols-1 lg:grid-cols-3 gap-6`}>
        <section id="student-notas" className={`card lg:col-span-2 ${section==='notas' ? '' : 'hidden lg:block'}`}>
          <h3 className="text-lg font-semibold mb-4">Calificaciones</h3>
          <DataTable data={alumno.calificaciones||[]} columns={[{key:'curso_nombre',label:'Curso'},{key:'periodo',label:'Periodo'},{key:'fecha_evaluacion',label:'Fecha'},{key:'nota',label:'Nota original'},{key:'escala_maxima',label:'Máximo de evaluación',render:(r:any)=>r.escala_maxima??'Histórica sin escala'}]} emptyMessage="Sin calificaciones registradas"/>
        </section>

        <section id="student-asistencia" className={`card ${section==='asistencia' ? '' : 'hidden lg:block'}`}>
          <h3 className="text-lg font-semibold mb-4">Asistencia · {periodoContexto?'periodo seleccionado':'año actual, todos los periodos'}</h3>
          {alumno.resumenAsistencia ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{alumno.resumenAsistencia.total} registros de clase · {alumno.resumenAsistencia.dias_unicos} días únicos</p>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {alumno.resumenAsistencia.total > 0
                    ? Math.round((alumno.resumenAsistencia.presentes / alumno.resumenAsistencia.total) * 100)
                    : 0}%
                </div>
                <p className="text-sm text-gray-500">Asistencia</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Presentes:</span><span className="font-medium">{alumno.resumenAsistencia.presentes || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ausentes:</span><span className="font-medium text-red-600">{alumno.resumenAsistencia.ausentes || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tardanzas:</span><span className="font-medium text-yellow-600">{alumno.resumenAsistencia.tardanzas || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Justificados:</span><span className="font-medium">{alumno.resumenAsistencia.justificados || 0}</span></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Sin datos de asistencia</p>
          )}
        </section>
      </div>

      <IncidenciasAlumno alumnoId={Number(id)} registrarHref={`/incidencias?registrar=${alumno.id}&nombre=${encodeURIComponent(`${alumno.nombre} ${alumno.apellido} · ${alumno.codigo_alumno}`)}`} />
    </div>
  );
}

export default function AlumnoDetailPage(){const {user}=useAuth();return user?.rol==='apoderado'?<FamilyStudentDetailPage/>:<AcademicAlumnoDetailPage/>;}
