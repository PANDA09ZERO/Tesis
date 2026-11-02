import {useSearchParams} from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, X, UserPlus, BookOpen, GraduationCap, Layers, Copy } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { configuracionApi, gradosApi, cursosApi, profesoresApi } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { usePeriodo } from '../../context/PeriodoContext';

const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];

export default function ConfiguracionAcademicaPage() {
  const [params]=useSearchParams();const request=useRef(0);const [loadError,setLoadError]=useState('');
  const linkedTeacher=params.get('profesor_id'),linkedGrade=params.get('grado_id');
  const { periodoId: contextPeriodoId, periodos } = usePeriodo();
  const [periodoId, setPeriodoId] = useState('');
  const [grados, setGrados] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({ grados: 0, cursos: 0, asignaciones: 0 });
  const [nivelFiltro, setNivelFiltro] = useState('Primaria');
  const [loading, setLoading] = useState(false);

  const [todosGrados, setTodosGrados] = useState<any[]>([]);
  const [todosCursos, setTodosCursos] = useState<any[]>([]);
  const [todosProfesores, setTodosProfesores] = useState<any[]>([]);

  const [showGrados, setShowGrados] = useState(false);
  const [seleccionGrados, setSeleccionGrados] = useState<number[]>([]);
  const [gradoActual, setGradoActual] = useState<any | null>(null);
  const [showCursos, setShowCursos] = useState(false);
  const [seleccionCursos, setSeleccionCursos] = useState<number[]>([]);
  const [cursoActual, setCursoActual] = useState<any | null>(null);
  const [showProfesores, setShowProfesores] = useState(false);
  const [seleccionProfesores, setSeleccionProfesores] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showClonar, setShowClonar] = useState(false);
  const [periodoOrigenId, setPeriodoOrigenId] = useState('');
  const [clonando, setClonando] = useState(false);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const requested = params.get('periodo_id');
    if (requested && /^[1-9][0-9]*$/.test(requested) && periodos.some(p => String(p.id) === requested)) {
      setPeriodoId(requested);
    } else if (contextPeriodoId) {
      setPeriodoId(contextPeriodoId);
    }
  }, [params, contextPeriodoId, periodos]);

  useEffect(() => {
    setShowProfesores(false);setShowCursos(false);setShowGrados(false);setSeleccionProfesores([]);
    if (periodoId) cargarEstructura();else{request.current++;setGrados([]);}
  }, [periodoId]);

  useEffect(()=>{if(!loading&&linkedGrade&&/^[1-9][0-9]*$/.test(linkedGrade))document.getElementById(`estructura-grado-${linkedGrade}`)?.scrollIntoView({block:'center'});},[loading,grados,linkedGrade]);

  const cargarCatalogos = async () => {
    try {
      const [gradRes, curRes, profRes] = await Promise.all([
        gradosApi.getAll(),
        cursosApi.getAll({ limit: 100 }),
        profesoresApi.getAll({ limit: 100 })
      ]);
      setTodosGrados(gradRes.data.data || []);
      setTodosCursos(curRes.data.data || []);
      setTodosProfesores(profRes.data.data || []);
    } catch (error) {
      console.error(error);
      setLoadError('No se pudieron cargar los catálogos. Recarga para reintentar');toast.error('No se pudieron cargar los catálogos');
    }
  };

  const cargarEstructura = async () => {
    const current=++request.current;setGrados([]);setResumen({grados:0,cursos:0,asignaciones:0});setLoadError('');setLoading(true);
    try {
      const res = await configuracionApi.getEstructura(Number(periodoId));
      if(current!==request.current)return;
      const data=res.data.data?.grados||[];setGrados(data);const linked=data.find(g=>String(g.grado_id)===linkedGrade);if(linked)setNivelFiltro(linked.nivel);
      setResumen(res.data.data?.resumen || { grados: 0, cursos: 0, asignaciones: 0 });
    } catch (error: any) {
      console.error(error);
      if(current!==request.current)return;setLoadError(error.response?.data?.message||'No se pudo cargar la estructura académica');toast.error(error.response?.data?.message || 'No se pudo cargar la estructura académica');
      setGrados([]);
    } finally {
      if(current===request.current)setLoading(false);
    }
  };

  const gradosDelNivel = grados.filter(grado => grado.nivel === nivelFiltro);
  const gradosHabilitados = grados.map(grado => grado.grado_id);
  const periodoSel = periodos.find(p => String(p.id) === periodoId);

  const toggle = (lista: number[], valor: number, setter: (valores: number[]) => void) => {
    setter(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]);
  };

  const guardarGrados = async () => {
    if (!seleccionGrados.length) {
      toast.error('Seleccione al menos un grado');
      return;
    }
    setSaving(true);
    try {
      await configuracionApi.addGrados(Number(periodoId), seleccionGrados);
      toast.success('Grados agregados al periodo');
      setShowGrados(false);
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron agregar los grados');
    } finally {
      setSaving(false);
    }
  };

  const guardarCursos = async () => {
    if (!gradoActual || !seleccionCursos.length) {
      toast.error('Seleccione al menos un curso');
      return;
    }
    setSaving(true);
    try {
      await configuracionApi.addCursos(Number(periodoId), gradoActual.grado_id, seleccionCursos);
      toast.success('Cursos agregados al grado');
      setShowCursos(false);
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron agregar los cursos');
    } finally {
      setSaving(false);
    }
  };

  const guardarProfesores = async () => {
    if (!cursoActual || !seleccionProfesores.length) {
      toast.error('Seleccione al menos un profesor');
      return;
    }
    setSaving(true);
    try {
      await configuracionApi.addProfesores(cursoActual.id, seleccionProfesores);
      toast.success('Profesor(es) asignado(s) al curso');
      setShowProfesores(false);
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron asignar los profesores');
    } finally {
      setSaving(false);
    }
  };

  const quitarGrado = async (grado: any) => {
    if (!confirm(`¿Quitar ${grado.grado} (${grado.nivel}) de este periodo? Solo se permite si no tiene matrículas, horarios ni historial vinculado.`)) return;
    try {
      await configuracionApi.removeGrado(Number(periodoId), grado.grado_id);
      toast.success('Grado quitado del periodo');
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo quitar el grado');
    }
  };

  const quitarCurso = async (curso: any) => {
    if (!confirm(`¿Quitar el curso ${curso.curso} de este grado?`)) return;
    try {
      await configuracionApi.removeCurso(curso.id);
      toast.success('Curso quitado del grado');
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo quitar el curso');
    }
  };

  const quitarProfesor = async (curso: any, profesor: any) => {
    if (!confirm(`¿Quitar a ${profesor.nombre} ${profesor.apellido} de ${curso.curso}?`)) return;
    try {
      await configuracionApi.removeProfesor(curso.id, profesor.profesor_id);
      toast.success('Profesor quitado del curso');
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo quitar el profesor');
    }
  };

  const abrirModalGrados = () => {
    setSeleccionGrados([]);
    setShowGrados(true);
  };

  const abrirModalCursos = (grado: any) => {
    setGradoActual(grado);
    setSeleccionCursos([]);
    setShowCursos(true);
  };

  const abrirModalProfesores = (curso: any) => {
    setCursoActual(curso);
    const teacher=todosProfesores.find(p=>String(p.id)===linkedTeacher);setSeleccionProfesores(teacher&&!curso.profesores.some((p:any)=>p.profesor_id===teacher.id)?[teacher.id]:[]);
    setShowProfesores(true);
  };

  const clonarConfiguracion = async () => {
    if (!periodoOrigenId) {
      toast.error('Seleccione un periodo origen');
      return;
    }
    if (periodoOrigenId === periodoId) {
      toast.error('El periodo origen y destino deben ser diferentes');
      return;
    }
    const origen = periodos.find(p => String(p.id) === periodoOrigenId);
    const destino = periodos.find(p => String(p.id) === periodoId);
    if (!confirm(`¿Clonar la configuración de ${origen?.nombre} a ${destino?.nombre}? Se copiarán grados, cursos y profesores.`)) return;
    setClonando(true);
    try {
      const res = await configuracionApi.clonar(Number(periodoId), Number(periodoOrigenId));
      const { grados, cursos, profesores_asignados, profesores_omitidos } = res.data.data!;
      const omitidos = profesores_omitidos.length > 0
        ? `; ${profesores_omitidos.length} profesores omitidos (inactivos o no disponibles)`
        : '';
      toast.success(`Clonado exitoso: ${grados} grados, ${cursos} cursos, ${profesores_asignados} profesores asignados${omitidos}`);
      setShowClonar(false);
      cargarEstructura();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo clonar la configuración');
    } finally {
      setClonando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Layers className="w-5 h-5 text-primary-600" /> Estructura académica
          </h1>
          <p className="text-sm text-gray-500">
            Configura, por periodo, los grados de cada nivel, sus cursos y los profesores responsables.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button onClick={() => { setPeriodoOrigenId(''); setShowClonar(true); }} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <Copy className="w-4 h-4" /> Clonar de otro periodo
          </button>
          <button onClick={abrirModalGrados} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Agregar grados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">
        <StatCard title="Grados configurados" value={resumen.grados || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Cursos asignados" value={resumen.cursos || 0} icon={BookOpen} color="green" />
        <StatCard title="Profesores asignados" value={resumen.asignaciones || 0} icon={UserPlus} color="purple" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {NIVELES.map(nivel => {
          const total = grados.filter(grado => grado.nivel === nivel).length;
          const activo = nivelFiltro === nivel;
          return (
            <button
              key={nivel}
              onClick={() => setNivelFiltro(nivel)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                activo
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {nivel} ({total})
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-500">
          {periodoSel ? `Periodo: ${periodoSel.nombre}` : 'Seleccione un periodo'}
        </span>
      </div>

      {loadError&&<div role="alert" className="card text-red-600"><p>{loadError}</p><button className="btn-secondary mt-2" onClick={()=>periodoId?void cargarEstructura():void cargarCatalogos()}>Reintentar</button></div>}
      {linkedTeacher&&<p className="card text-sm">{todosProfesores.find(p=>String(p.id)===linkedTeacher)?`Asignando a: ${todosProfesores.find(p=>String(p.id)===linkedTeacher)?.nombre} ${todosProfesores.find(p=>String(p.id)===linkedTeacher)?.apellido}. Elige grado y curso para registrar su responsabilidad.`:'El docente solicitado no está disponible. Revisa su estado antes de asignarlo.'}</p>}
      {loading ? (
        <div className="card animate-pulse h-40" />
      ) : loadError ? null : gradosDelNivel.length === 0 ? (
        <div className="card py-10 text-center text-gray-500">
          No hay grados de {nivelFiltro} configurados en este periodo. Usa «Agregar grados».
        </div>
      ) : (
        <div className="space-y-4">
          {gradosDelNivel.map(grado => (
            <div key={grado.grado_id} id={`estructura-grado-${grado.grado_id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">{grado.grado}</h3>
                  <Badge variant="default">{grado.nivel}</Badge>
                  <span className="text-xs text-gray-500">{grado.cursos.length} curso(s)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => abrirModalCursos(grado)}
                    className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar curso
                  </button>
                  <button
                    onClick={() => quitarGrado(grado)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar grado
                  </button>
                </div>
              </div>

              {grado.cursos.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-gray-400">
                  Este grado aún no tiene cursos configurados.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {grado.cursos.map((curso: any) => (
                    <div key={curso.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-[180px] flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <BookOpen className="w-4 h-4 text-gray-400" /> {curso.curso}
                        </p>
                        {curso.codigo && <p className="font-mono text-xs text-gray-400">{curso.codigo}</p>}
                      </div>
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {curso.profesores.length === 0 ? (
                          <span className="text-xs font-medium text-amber-600">Sin profesor asignado</span>
                        ) : (
                          curso.profesores.map((profesor: any) => (
                            <span
                              key={profesor.profesor_id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                            >
                              {profesor.nombre} {profesor.apellido}
                              <button
                                onClick={() => quitarProfesor(curso, profesor)}
                                title="Quitar profesor"
                                className="text-primary-500 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalProfesores(curso)}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Asignar profesor
                        </button>
                        <button
                          onClick={() => quitarCurso(curso)}
                          title="Quitar curso del grado"
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: agregar grados al periodo */}
      <Modal
        isOpen={showGrados}
        onClose={() => setShowGrados(false)}
        title={`Agregar grados — ${periodoSel?.nombre || 'periodo'}`}
        size="md"
      >
        <div className="space-y-4">
          {NIVELES.map(nivel => (
            <div key={nivel}>
              <p className="mb-2 text-sm font-medium text-gray-700">{nivel}</p>
              <div className="space-y-1">
                {todosGrados
                  .filter(g => g.nivel === nivel && !gradosHabilitados.includes(g.id))
                  .map(g => (
                    <label key={g.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={seleccionGrados.includes(g.id)}
                        onChange={() => toggle(seleccionGrados, g.id, setSeleccionGrados)}
                        className="rounded"
                      />
                      <span className="text-gray-900">{g.nombre}</span>
                    </label>
                  ))}
                {todosGrados.filter(g => g.nivel === nivel && !gradosHabilitados.includes(g.id)).length === 0 && (
                  <p className="px-2 text-xs text-gray-400">Todos los grados de {nivel} ya están agregados</p>
                )}
              </div>
            </div>
          ))}
          <div className="form-actions">
            <button type="button" onClick={() => setShowGrados(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={guardarGrados} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: agregar cursos al grado */}
      <Modal
        isOpen={showCursos}
        onClose={() => setShowCursos(false)}
        title={gradoActual ? `Agregar cursos a ${gradoActual.grado}` : 'Agregar cursos'}
        size="md"
      >
        <div className="space-y-4">
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {todosCursos
              .filter(curso => !(gradoActual?.cursos || []).some((c: any) => c.curso_id === curso.id))
              .map(curso => (
                <label key={curso.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={seleccionCursos.includes(curso.id)}
                    onChange={() => toggle(seleccionCursos, curso.id, setSeleccionCursos)}
                    className="rounded"
                  />
                  <span className="text-gray-900">{curso.nombre}</span>
                  {curso.codigo && <span className="font-mono text-xs text-gray-400">{curso.codigo}</span>}
                </label>
              ))}
            {todosCursos.filter(curso => !(gradoActual?.cursos || []).some((c: any) => c.curso_id === curso.id)).length === 0 && (
              <p className="px-2 text-sm text-gray-400">Todos los cursos ya están agregados a este grado</p>
            )}
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowCursos(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={guardarCursos} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: asignar profesores al curso */}
      <Modal
        isOpen={showProfesores}
        onClose={() => setShowProfesores(false)}
        title={cursoActual ? `Asignar profesores a ${cursoActual.curso}` : 'Asignar profesores'}
        size="md"
      >
        <div className="space-y-4">
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {todosProfesores.map(profesor => {
              const yaAsignado = (cursoActual?.profesores || []).some((p: any) => p.profesor_id === profesor.id);
              return (
                <label key={profesor.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={yaAsignado || seleccionProfesores.includes(profesor.id)}
                    disabled={yaAsignado}
                    onChange={() => toggle(seleccionProfesores, profesor.id, setSeleccionProfesores)}
                    className="rounded"
                  />
                  <span className="text-gray-900">
                    {profesor.apellido} {profesor.nombre}
                  </span>
                  {profesor.especialidad && <span className="text-xs text-gray-400">{profesor.especialidad}</span>}
                  {yaAsignado && (
                    <span className="ml-auto text-xs text-gray-400">Ya asignado</span>
                  )}
                </label>
              );
            })}
            {todosProfesores.length === 0 && (
              <p className="px-2 text-sm text-gray-400">No hay profesores registrados</p>
            )}
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowProfesores(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={guardarProfesores} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Asignar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: clonar configuración */}
      <Modal
        isOpen={showClonar}
        onClose={() => setShowClonar(false)}
        title="Clonar configuración de otro periodo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se copiarán los grados, cursos y profesores del periodo origen al periodo destino "{periodoSel?.nombre}". 
            Los profesores que ya no existan en el sistema serán omitidos.
          </p>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Periodo origen</label>
            <select
              value={periodoOrigenId}
              onChange={e => setPeriodoOrigenId(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar periodo origen...</option>
              {periodos.filter(p => String(p.id) !== periodoId).map(periodo => (
                <option key={periodo.id} value={periodo.id}>
                  {periodo.nombre}{periodo.activo ? ' (activo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowClonar(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={clonarConfiguracion} disabled={clonando} className="btn-primary disabled:opacity-50">
              {clonando ? 'Clonando…' : 'Clonar'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}