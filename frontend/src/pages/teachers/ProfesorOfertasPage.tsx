import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { configuracionApi } from '../../api/endpoints';
import type { OfertaAcademica } from '../../types';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { usePeriodo } from '../../context/PeriodoContext';
import { useDebounce } from '../../hooks/useDebounce';

type Modo = 'cursos' | 'notas' | 'asistencia';
export default function ProfesorOfertasPage({modo = 'cursos'}:{modo?:Modo}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.rol === 'profesor';
  const [searchParams] = useSearchParams();
  const search = useDebounce(searchParams.get('search') || '');
  // Contexto global de periodo académico (vigente por defecto)
  const { periodoId: periodo, periodos } = usePeriodo();
  const [ofertas,setOfertas] = useState<OfertaAcademica[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [reload,setReload] = useState(0);

  useEffect(()=>{
    let active=true;
    if(!periodo){setOfertas([]);setLoading(false);return;}
    setLoading(true);setError('');setOfertas([]);
    configuracionApi.getOfertas({periodo_id:Number(periodo),search:search || undefined}).then(r=>{if(active)setOfertas(r.data.data || []);})
      .catch(e=>{if(active)setError(e.response?.data?.message || 'No se pudieron cargar las ofertas');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[periodo,reload,search]);

  const title=!isTeacher ? (modo === 'notas' ? 'Libros de calificaciones' : modo === 'asistencia' ? 'Asistencia por oferta' : 'Ofertas académicas') : modo === 'notas' ? 'Mis libros de calificaciones' : modo === 'asistencia' ? 'Asistencia de mis cursos' : 'Mis cursos asignados';
  const selected=periodos.find(p=>String(p.id)===periodo);

  return <div className="space-y-4">
    <header className="card space-y-2"><h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-500">Cada asignación identifica un periodo, grado y curso. {isTeacher ? 'Los periodos históricos son de solo consulta.' : 'Selecciona una oferta para consultar o registrar información.'}</p>
    </header>
    {error ? <div className="card text-red-600" role="alert">{error}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div> : loading ? <div className="card animate-pulse h-40"/> : !ofertas.length ? <div className="card text-gray-500">{isTeacher ? 'No tienes ofertas académicas asignadas' : 'No hay ofertas académicas configuradas'}{selected ? ' en ' + selected.nombre : ''}. Las asignaciones se administran desde Estructura académica.</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ofertas.map(o=><button key={o.periodo_grado_curso_id} className="card text-left hover:border-primary-400" onClick={()=>navigate(`${modo==='notas' ? '/calificaciones/oferta/' : modo==='asistencia' ? '/asistencias/oferta/' : '/cursos/oferta/'}${o.periodo_grado_curso_id}`)}>
      <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{o.curso}</span><Badge variant={o.periodo_activo ? 'success' : 'info'}>{o.periodo_activo ? 'Activo' : isTeacher ? 'Solo consulta' : 'Histórico'}</Badge></div>
      <p className="mt-2 text-sm text-gray-600">{o.nivel} · {o.grado}</p><p className="text-xs text-gray-500">{o.periodo}</p><p className="mt-3 text-sm">{o.alumnos_count || 0} alumnos matriculados</p>
    </button>)}</div>}
  </div>;
}
