import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Mail, Phone, UserRound } from 'lucide-react';
import '../../components/ui/people-directory.css';
import Badge from '../../components/ui/Badge';
import { profesoresApi } from '../../api/endpoints';
import type { Profesor } from '../../types';


interface AlumnoProfesor {
  nombre: string;
  apellido: string;
  codigo_alumno: string;
  grado?: string;
}

export default function ProfesorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoProfesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,setError]=useState(''),[reload,setReload]=useState(0);

  useEffect(()=>{let active=true;setLoading(true);setError('');setProfesor(null);setAlumnos([]);const profesorId=Number(id);
    if(!Number.isSafeInteger(profesorId)||profesorId<1){setError('Profesor inválido');setLoading(false);return;}
    Promise.all([profesoresApi.getById(profesorId),profesoresApi.getAlumnos(profesorId)]).then(([profile,students])=>{if(active){setProfesor(profile.data.data||null);setAlumnos(students.data.data||[]);}})
    .catch(error=>{if(active)setError(error.response?.data?.message||'No se pudo cargar el profesor y sus asignaciones');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[id,reload]);

  if(error)return <section role="alert" className="card space-y-3"><p>{error}</p><button className="btn-secondary" onClick={()=>setReload(n=>n+1)}>Reintentar</button></section>;

  if (loading) {
    return <div className="card h-64 animate-pulse" />;
  }

  if (!profesor) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/profesores')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft className="h-4 w-4" /> Volver a profesores
        </button>
        <div className="py-12 text-center text-gray-500">Profesor no encontrado</div>
      </div>
    );
  }

  return (
    <div className="people-directory mx-auto max-w-7xl space-y-5">
      <button onClick={() => navigate('/profesores')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100">
        <ArrowLeft className="h-4 w-4" /> Volver a profesores
      </button>

      <section className="card rounded-2xl">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-100">
            <span className="text-3xl font-bold text-primary-700">
              {profesor.nombre?.[0]}{profesor.apellido?.[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{profesor.nombre} {profesor.apellido}</h2>
                <p className="text-gray-500">{profesor.titulo_profesional || 'Profesor'}</p>
              </div>
              <Badge variant={profesor.activo ? 'success' : 'danger'}>
                {profesor.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {profesor.email && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600 [&_svg]:shrink-0"><Mail className="h-4 w-4" />{profesor.email}</div>}
              {profesor.telefono && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600 [&_svg]:shrink-0"><Phone className="h-4 w-4" />{profesor.telefono}</div>}
              {profesor.especialidad && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600 [&_svg]:shrink-0"><BookOpen className="h-4 w-4" />{profesor.especialidad}</div>}
              {profesor.fecha_ingreso && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600 [&_svg]:shrink-0"><Calendar className="h-4 w-4" />Ingreso: {profesor.fecha_ingreso.split('T')[0]}</div>}
              {profesor.dni && <div className="flex min-w-0 items-start gap-2 break-all text-gray-600 [&_svg]:shrink-0"><UserRound className="h-4 w-4" />DNI: {profesor.dni}</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="card rounded-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Asignaciones por periodo y grado</h3><Link className="btn-secondary" to={`/admin/configuracion-academica?profesor_id=${profesor.id}`}>Gestionar en Estructura</Link></div>
        {!profesor.cursos_asignados?.length ? (
          <p className="py-6 text-center text-gray-500">Sin asignaciones específicas. Registra periodo, grado y curso desde Estructura académica.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {profesor.cursos_asignados.map((curso, index) => (
              <div key={`${curso.nombre}-${curso.dia_semana}-${curso.hora_inicio}-${index}`} className="rounded-lg bg-gray-50 p-3">
                <p className="break-words font-medium text-gray-900">{curso.nombre}{curso.codigo ? ` (${curso.codigo})` : ''}</p>
                <p className="text-xs text-gray-500">
                  {[curso.grado, curso.periodo, curso.periodo_activo?'Activo':'Histórico', curso.dia_semana, curso.hora_inicio && curso.hora_fin ? `${curso.hora_inicio} - ${curso.hora_fin}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card rounded-2xl">
        <h3 className="mb-4 text-lg font-semibold">Alumnos</h3>
        {alumnos.length === 0 ? (
          <p className="py-6 text-center text-gray-500">Sin alumnos asociados a sus cursos</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {alumnos.map((alumno) => (
              <div key={`${alumno.codigo_alumno}-${alumno.nombre}-${alumno.apellido}`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
                <div>
                  <p className="break-words font-medium text-gray-900">{alumno.nombre} {alumno.apellido}</p>
                  <p className="text-xs text-gray-500">{alumno.codigo_alumno}</p>
                </div>
                {alumno.grado && <span className="text-sm text-gray-600">{alumno.grado}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
