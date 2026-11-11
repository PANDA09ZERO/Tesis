import type { CalculatedResponse, IssuedReport, RulesResponse, LibretaPolicy } from '../pages/documents/academic-record';
import type { StudentRecord } from '../pages/documents/academic-record';
import type {ResumenFamilia,DetalleFamilia} from '../pages/guardian/familia';
import client from './client';
import type { ApiResponse, CreatedAccount, PaginatedResponse, User, Alumno, Profesor, Curso, Calificacion, Asistencia, Documento, DocumentoCategoria, FormularioDocumental, FormularioCampo, FormularioEnvio, Horario, HorarioPayload, CalendarEvent, PeriodoAcademico, DetallePeriodo, Alerta, Incidencia, IncidenciasEstadisticas, DashboardStats, OfertaAcademica, EvaluacionAcademica, AlumnoLibro } from '../types';

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    client.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password }),
  register: (data: any) => client.post<ApiResponse>('/auth/register', data),
  getProfile: () => client.get<ApiResponse<User>>('/auth/profile'),
  updatePersonalProfile: (data: { fecha_nacimiento?: string | null; genero?: string }) =>
    client.put<ApiResponse>('/auth/profile/personal', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    client.put<ApiResponse>('/auth/change-password', { currentPassword, newPassword })
};

// Users
export const usersApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<User>>('/users', { params }),
  getById: (id: number) => client.get<ApiResponse<User>>(`/users/${id}`),
  create: (data: any) => client.post<ApiResponse<CreatedAccount>>('/users', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/users/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/users/${id}`)
};

// Alumnos
export const alumnosApi = {
  getExpediente: (id: number) => client.get<ApiResponse<StudentRecord>>(`/alumnos/${id}/expediente`),
  getMatriculas: (id: number) => client.get<ApiResponse<any[]>>(`/alumnos/${id}/matriculas`),
  getAll: (params?: any) => client.get<PaginatedResponse<Alumno>>('/alumnos', { params }),
  getById: (id: number, params?: any) => client.get<ApiResponse<Alumno>>(`/alumnos/${id}`, { params }),
  create: (data: any) => client.post<ApiResponse<CreatedAccount>>('/alumnos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/alumnos/${id}`, data),
  getHorario: (id: number) => client.get<ApiResponse<Horario[]>>(`/alumnos/${id}/horario`),
  importarHistoricos: (archivo: File, modo: 'vista_previa' | 'confirmar') => {
    const form = new FormData(); form.append('archivo', archivo);
    return client.post<ApiResponse<any>>('/alumnos/historicos/importar', form, { params: { modo }, headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
  },
  crearHistorico: (data: Record<string, string>) => client.post<ApiResponse<any>>('/alumnos/historicos', data),
  actualizarHistorico: (id: number, data: Record<string, string>) => client.put<ApiResponse>(`/alumnos/${id}/historico`, data)
};

// Trámites documentales (traslados, certificados y constancias)
export type TipoTramite = 'traslado' | 'certificado_estudios' | 'constancia_estudios' | 'constancia_matricula' | 'constancia_conducta' | 'otro';
export type EstadoTramite = 'solicitado' | 'en_proceso' | 'listo' | 'entregado' | 'anulado';
export interface Tramite {
  id: number; alumno_id: number; tipo: TipoTramite; estado: EstadoTramite; solicitante: string | null; destino: string | null;
  observaciones: string | null; documento_id: number | null; documento_titulo: string | null; created_at: string; updated_at: string;
  entregado_en: string | null; atendido_por_nombre: string | null; creado_por_nombre: string | null;
  codigo_alumno: string; nombre: string; apellido: string; dni: string | null; estado_alumno: string; es_historico: number;
}
export const tramitesApi = {
  getAll: (params?: { alumno_id?: number; estado?: string; pendientes?: '1' }) => client.get<ApiResponse<Tramite[]>>('/tramites', { params }),
  create: (data: { alumno_id: number; tipo: TipoTramite; solicitante?: string; destino?: string; observaciones?: string }) =>
    client.post<ApiResponse<Tramite>>('/tramites', data),
  update: (id: number, data: Partial<{ estado: EstadoTramite; solicitante: string; destino: string; observaciones: string; documento_id: number | null }>) =>
    client.put<ApiResponse<Tramite>>(`/tramites/${id}`, data)
};

// Profesores
export const profesoresApi = {
  getMisApoderados: () => client.get<ApiResponse<any[]>>('/profesores/me/apoderados'),
  getAll: (params?: any) => client.get<PaginatedResponse<Profesor>>('/profesores', { params }),
  getById: (id: number) => client.get<ApiResponse<Profesor>>(`/profesores/${id}`),
  create: (data: any) => client.post<ApiResponse<CreatedAccount>>('/profesores', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/profesores/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/profesores/${id}`),
  getAlumnos: (id: number) => client.get<ApiResponse<Alumno[]>>(`/profesores/${id}/alumnos`),
  getCursos: (id: number) => client.get<ApiResponse<any[]>>(`/profesores/${id}/cursos`)
};

// Cursos
export const cursosApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Curso>>('/cursos', { params }),
  getById: (id: number) => client.get<ApiResponse<Curso>>(`/cursos/${id}`),
  create: (data: any) => client.post<ApiResponse>('/cursos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/cursos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/cursos/${id}`)
};

// Grados
export const gradosApi = {
  getAll: () => client.get<ApiResponse<any[]>>('/grados')
};

// Apoderados
export const apoderadosApi = {
  getMisAlumnos: () => client.get<ApiResponse<any[]>>('/apoderados/me/alumnos'),
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/apoderados', { params }),
  getById: (id: number) => client.get<ApiResponse<any>>(`/apoderados/${id}`),
  create: (data: any) => client.post<ApiResponse<CreatedAccount>>('/apoderados', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/apoderados/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/apoderados/${id}`),
  asignarAlumno: (id: number, data: any) => client.post<ApiResponse>(`/apoderados/${id}/asignar-alumno`, data),
  removerAlumno: (id: number, alumnoId: number) => client.delete<ApiResponse>(`/apoderados/${id}/alumnos/${alumnoId}`),
  getAlumnos: (id: number) => client.get<ApiResponse<any[]>>(`/apoderados/${id}/alumnos`)
};

// Matrículas
export const matriculasApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/matriculas', { params }),
  getById: (id: number) => client.get<ApiResponse<any>>(`/matriculas/${id}`),
  getByPeriodo: (periodoId: number) => client.get<ApiResponse<any[]>>(`/matriculas/periodo/${periodoId}`),
  getEstadisticas: (params?: any) => client.get<ApiResponse<any>>('/matriculas/estadisticas', { params }),
  create: (data: any) => client.post<ApiResponse>('/matriculas', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/matriculas/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/matriculas/${id}`)
};

// Configuración académica: Periodo -> Nivel -> Grado -> Curso -> Profesor
export const configuracionApi = {
  getOfertas: (params?: { periodo_id?: number; grado_id?: number; nivel?: string; curso_id?: number; search?: string }) =>
    client.get<ApiResponse<OfertaAcademica[]>>('/configuracion-academica/ofertas', { params }),
  getOferta: (ofertaId: number) =>
    client.get<ApiResponse<OfertaAcademica>>(`/configuracion-academica/ofertas/${ofertaId}`),
  getEstructura: (periodoId: number) =>
    client.get<ApiResponse<{ grados: any[]; resumen: any }>>(`/configuracion-academica/periodos/${periodoId}`),
  getCursosDeGrado: (periodoId: number, gradoId: number) =>
    client.get<ApiResponse<any[]>>(`/configuracion-academica/periodos/${periodoId}/grados/${gradoId}/cursos`),
  addGrados: (periodoId: number, grado_ids: number[]) =>
    client.post<ApiResponse>('/configuracion-academica/periodos/' + periodoId + '/grados', { grado_ids }),
  removeGrado: (periodoId: number, gradoId: number) =>
    client.delete<ApiResponse>(`/configuracion-academica/periodos/${periodoId}/grados/${gradoId}`),
  addCursos: (periodoId: number, gradoId: number, curso_ids: number[]) =>
    client.post<ApiResponse>(`/configuracion-academica/periodos/${periodoId}/grados/${gradoId}/cursos`, { curso_ids }),
  removeCurso: (pgcId: number) => client.delete<ApiResponse>(`/configuracion-academica/cursos/${pgcId}`),
  addProfesores: (pgcId: number, profesor_ids: number[]) =>
    client.post<ApiResponse>(`/configuracion-academica/cursos/${pgcId}/profesores`, { profesor_ids }),
  removeProfesor: (pgcId: number, profesorId: number) =>
    client.delete<ApiResponse>(`/configuracion-academica/cursos/${pgcId}/profesores/${profesorId}`),
  clonar: (destinoId: number, periodo_origen_id: number) =>
    client.post<ApiResponse<{
      grados: number;
      cursos: number;
      profesores_asignados: number;
      profesores_omitidos: number[];
    }>>(`/configuracion-academica/periodos/${destinoId}/clonar`, { periodo_origen_id })
};

// Notificaciones
export const notificacionesApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/notificaciones', { params }),
  getById: (id: number) => client.get<ApiResponse<any>>(`/notificaciones/${id}`),
  getNoLeidas: () => client.get<ApiResponse<any>>('/notificaciones/no-leidas'),
  create: (data: any) => client.post<ApiResponse>('/notificaciones', data),
  enviarMasiva: (data: any) => client.post<ApiResponse>('/notificaciones/masiva', data),
  marcarLeida: (id: number) => client.put<ApiResponse>(`/notificaciones/${id}/marcar-leida`),
  marcarTodasLeidas: () => client.put<ApiResponse>('/notificaciones/marcar-todas-leidas'),
  delete: (id: number) => client.delete<ApiResponse>(`/notificaciones/${id}`)
};

// Mensualidades
export const mensualidadesApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/mensualidades', { params }),
  getResumen: (params?: any) => client.get<ApiResponse<any[]>>('/mensualidades/resumen', { params: typeof params === 'string' ? { año: params } : params }),
  getAlumnosConDeuda: (params?: any) => client.get<ApiResponse<any[]>>('/mensualidades/alumnos-con-deuda', { params }),
  getById: (id: number) => client.get<ApiResponse>(`/mensualidades/${id}`),
  create: (data: any) => client.post<ApiResponse>('/mensualidades', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/mensualidades/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/mensualidades/${id}`)
};

// Sueldos
export const sueldosApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/sueldos', { params }),
  getResumen: (params?: any) => client.get<ApiResponse<any[]>>('/sueldos/resumen', { params: typeof params === 'string' ? { año: params } : params }),
  getById: (id: number) => client.get<ApiResponse>(`/sueldos/${id}`),
  create: (data: any) => client.post<ApiResponse>('/sueldos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/sueldos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/sueldos/${id}`)
};

// Calificaciones
export const calificacionesApi = {
  getLibroOferta: (ofertaId: number) =>
    client.get<ApiResponse<{ alumnos: AlumnoLibro[]; evaluaciones: EvaluacionAcademica[]; calificaciones: Array<Calificacion & { evaluacion_id: number | null; evaluacion_nombre?: string; nombre: string; apellido: string; codigo_alumno: string }> }>>(`/calificaciones/oferta/${ofertaId}/libro`),
  registerOfertaBulk: (ofertaId: number, evaluacionId: number, calificaciones: Array<Pick<Calificacion, 'alumno_id' | 'nota' | 'observaciones'>>) =>
    client.post<ApiResponse<{ guardadas: number }>>(`/calificaciones/oferta/${ofertaId}/evaluacion/${evaluacionId}/bulk`, { calificaciones }),
  getByAlumno: (alumnoId: number, params?: any) =>
    client.get<ApiResponse<{ calificaciones: Calificacion[]; resumen: any }>>(`/calificaciones/alumno/${alumnoId}`, { params }),
  getByCurso: (cursoId: number, params?: any) =>
    client.get<ApiResponse<{ calificaciones: Calificacion[]; estadisticas: any }>>(`/calificaciones/curso/${cursoId}`, { params }),
  getAlumnosByCurso: (cursoId: number) => client.get<ApiResponse<any[]>>(`/calificaciones/curso/${cursoId}/alumnos`),
  register: (data: any) => client.post<ApiResponse>('/calificaciones', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/calificaciones/${id}`, data),
  bulkRegister: (calificaciones: any[]) => client.post<ApiResponse>('/calificaciones/bulk', { calificaciones })
};

// Asistencias
export const asistenciasApi = {
  getByOferta: (ofertaId: number, fecha: string) =>
    client.get<ApiResponse<{ fecha: string; asistencias: Asistencia[] }>>(`/asistencias/oferta/${ofertaId}`, { params: { fecha } }),
  getHistorialByOferta: (ofertaId: number, params?: { fecha_inicio?: string; fecha_fin?: string }) =>
    client.get<ApiResponse<{ asistencias: Array<Asistencia & { nombre: string; apellido: string; codigo_alumno: string }>; resumen: Record<string, number> }>>(`/asistencias/oferta/${ofertaId}/historial`, { params }),
  registerOfertaBulk: (ofertaId: number, fecha: string, asistencias: Array<Pick<Asistencia, 'alumno_id' | 'estado' | 'minutos_tardanza' | 'observaciones'>>) =>
    client.post<ApiResponse<{ guardadas: number }>>(`/asistencias/oferta/${ofertaId}/bulk`, { fecha, asistencias }),
  getByAlumno: (alumnoId: number, params?: any) =>
    client.get<ApiResponse<{ asistencias: Asistencia[]; resumen: any }>>(`/asistencias/alumno/${alumnoId}`, { params }),
  getByCurso: (cursoId: number, params?: any) =>
    client.get<ApiResponse<Asistencia[]>>(`/asistencias/curso/${cursoId}`, { params }),
  register: (data: any) => client.post<ApiResponse>('/asistencias', data),
  bulkRegister: (asistencias: any[]) => client.post<ApiResponse>('/asistencias/bulk', { asistencias }),
  getResumenGrado: () => client.get<ApiResponse<any[]>>('/asistencias/resumen-grado')
};

// Documentos
export const documentosApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; categoria_id?: number; categoria?: string; estado?: string }) =>
    client.get<PaginatedResponse<Documento>>('/documentos', { params }),
  getById: (id: number) => client.get<ApiResponse<Documento>>(`/documentos/${id}`),
  download: (id: number) => client.get<Blob>(`/documentos/${id}/archivo`, { responseType: 'blob' }),
  upload: (formData: FormData) =>
    client.post<ApiResponse<{ id: number; archivo_url: string }>>('/documentos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  update: (id: number, data: any) => client.put<ApiResponse>(`/documentos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/documentos/${id}`),
  getPendientes: () => client.get<ApiResponse<Documento[]>>('/documentos/pendientes'),
  getCategorias: (incluirArchivadas = false) =>
    client.get<ApiResponse<DocumentoCategoria[]>>('/documentos/categorias', {
      params: incluirArchivadas ? { incluir_archivadas: 'true' } : undefined
    }),
  createCategoria: (nombre: string) =>
    client.post<ApiResponse<DocumentoCategoria>>('/documentos/categorias', { nombre }),
  updateCategoria: (id: number, data: { nombre?: string; estado?: 'activa' | 'archivada' }) =>
    client.patch<ApiResponse>(`/documentos/categorias/${id}`, data),
  getFormularios: (params?: { page?: number; limit?: number; search?: string; categoria_id?: number; estado?: string }) =>
    client.get<PaginatedResponse<FormularioDocumental>>('/documentos/formularios', { params }),
  getFormulario: (id: number) =>
    client.get<ApiResponse<FormularioDocumental>>(`/documentos/formularios/${id}`),
  createFormulario: (data: Pick<FormularioDocumental, 'titulo' | 'descripcion' | 'categoria_id' | 'campos'>) =>
    client.post<ApiResponse<{ id: number; estado: FormularioDocumental['estado'] }>>('/documentos/formularios', data),
  updateFormulario: (id: number, data: Pick<FormularioDocumental, 'titulo' | 'descripcion' | 'categoria_id' | 'campos'>) =>
    client.put<ApiResponse>(`/documentos/formularios/${id}`, data),
  updateFormularioEstado: (id: number, estado: 'publicada' | 'archivada') =>
    client.patch<ApiResponse>(`/documentos/formularios/${id}/estado`, { estado }),
  submitFormulario: (id: number, respuestas: Record<string, unknown>, alumno_id?: number) =>
    client.post<ApiResponse<{ id: number }>>(`/documentos/formularios/${id}/envios`, { respuestas, alumno_id }),
  getEnviosFormulario: (id: number, params?: { page?: number; limit?: number }) =>
    client.get<PaginatedResponse<FormularioEnvio>>(`/documentos/formularios/${id}/envios`, { params })
};

// Horarios
export const horariosApi = {
  getAll: (params?: { periodo_id?: number; periodo_grado_curso_id?: number }) =>
    client.get<ApiResponse<Horario[]>>('/horarios', { params }),
  create: (data: HorarioPayload) => client.post<ApiResponse<{ id: number }>>('/horarios', data),
  update: (id: number, data: HorarioPayload) => client.put<ApiResponse>(`/horarios/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/horarios/${id}`)
};

export const calendarApi = {
  getEvents: (params: { fecha_inicio: string; fecha_fin: string; periodo_id?: number }) =>
    client.get<ApiResponse<CalendarEvent[]>>('/horarios/calendario', { params }),
  createEvent: (data: {
    titulo: string;
    descripcion?: string | null;
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    tipo?: 'institucional' | 'feriado' | 'reunion' | 'otro';
    periodo_academico_id?: number | null;
  }) => client.post<ApiResponse<{ id: number }>>('/horarios/calendario', data),
  deleteEvent: (id: number) => client.delete<ApiResponse>(`/horarios/calendario/${id}`)
};

// Periodos
export const periodosApi = {
  getById: (id: number) => client.get<ApiResponse<DetallePeriodo>>(`/periodos/${id}`),
  getAll: () => client.get<ApiResponse<PeriodoAcademico[]>>('/periodos'),
  create: (data: any) => client.post<ApiResponse>('/periodos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/periodos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/periodos/${id}`)
};

// Alertas
export const alertasApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Alerta>>('/alertas', { params }),
  updateEstado: (id: number, estado: string) =>
    client.put<ApiResponse>(`/alertas/${id}/estado`, { estado }),
  asignar: (id: number, asignada_a: number) =>
    client.put<ApiResponse>(`/alertas/${id}/asignar`, { asignada_a }),
  getEstadisticas: () => client.get<ApiResponse<any>>('/alertas/estadisticas'),
  getCriterios: () => client.get<ApiResponse<any>>('/alertas/criterios'),
  evaluar: () => client.post<ApiResponse<{ periodo: string | null; evaluados: number; creadas: number; actualizadas: number; superadas: number; omitidas: number }>>('/alertas/evaluar')
};

// Incidencias de conducta
export const incidenciasApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Incidencia>>('/incidencias', { params }),
  getEstadisticas: () => client.get<ApiResponse<IncidenciasEstadisticas>>('/incidencias/estadisticas'),
  getByAlumno: (alumnoId: number) => client.get<ApiResponse<Incidencia[]>>(`/incidencias/alumno/${alumnoId}`),
  create: (data: any) => client.post<ApiResponse<{ id: number }>>('/incidencias', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/incidencias/${id}`, data),
  updateEstado: (id: number, estado: string, resolucion?: string) => client.put<ApiResponse>(`/incidencias/${id}/estado`, { estado, resolucion })
};

// Dashboard
export const dashboardApi = {
  getStats: () => client.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
  getRendimiento: (params?: { periodo_id?: number }) => client.get<ApiResponse<any[]>>('/dashboard/rendimiento', { params }),
  getAsistenciaReciente: () => client.get<ApiResponse<any[]>>('/dashboard/asistencia-reciente'),
  getActividadReciente: () => client.get<ApiResponse<any[]>>('/dashboard/actividad-reciente')
};

// Reportes
export const reportesApi = {
  getRendimiento: (params?: any) => client.get<ApiResponse<any[]>>('/reportes/rendimiento', { params }),
  getAsistencia: (params?: any) => client.get<ApiResponse<any[]>>('/reportes/asistencia', { params }),
  getAlumnosEnRiesgo: () => client.get<ApiResponse<any[]>>('/reportes/alumnos-riesgo'),
  getDocumentos: () => client.get<ApiResponse<any[]>>('/reportes/documentos')
};

export const evaluacionesApi = {
  getByOferta: (ofertaId: number) =>
    client.get<ApiResponse<EvaluacionAcademica[]>>(`/evaluaciones/oferta/${ofertaId}`),
  create: (ofertaId: number, data: Pick<EvaluacionAcademica, 'nombre' | 'tipo' | 'fecha_evaluacion' | 'nota_maxima'>) =>
    client.post<ApiResponse<{ id: number }>>(`/evaluaciones/oferta/${ofertaId}`, data)
};
export const pagosMatriculaApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<any>>('/pagos-matricula', { params }),
  getResumen: (params?: any) => client.get<ApiResponse<any[]>>('/pagos-matricula/resumen', { params }),
  getById: (id: number) => client.get<ApiResponse<any>>(`/pagos-matricula/${id}`),
  create: (data: any) => client.post<ApiResponse>('/pagos-matricula', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/pagos-matricula/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/pagos-matricula/${id}`),
};

// Consultas personales: la identidad se obtiene de la sesión en el servidor.
export const estudianteApi = {
  getContexto: () => client.get<ApiResponse<any>>('/estudiante/contexto'),
  getPeriodo: (periodoId?: number) => client.get<ApiResponse<any>>('/estudiante/periodo',{params:periodoId ? {periodo_id:periodoId} : undefined}),
  getCurso: (matriculaId:number) => client.get<ApiResponse<any>>(`/estudiante/cursos/${matriculaId}`),
};

export const profesorPersonalApi = {
  getPerfil:()=>client.get<ApiResponse<any>>('/profesores/me/perfil'),
  getResumen:(periodoId?:number)=>client.get<ApiResponse<any>>('/profesores/me/resumen',{params:periodoId?{periodo_id:periodoId}:undefined})
};

export const familiaApi={
 getInicio:()=>client.get<ApiResponse<ResumenFamilia[]>>('/apoderados/me/inicio'),
 getDetalle:(id:number,periodo_id?:string)=>client.get<ApiResponse<DetalleFamilia>>(`/apoderados/me/alumnos/${id}/resumen`,{params:periodo_id===undefined?undefined:{periodo_id}})
};

export const libretasApi = {
 getRules: (periodo: number, grado: number) => client.get<ApiResponse<RulesResponse>>(`/alumnos/libreta/reglas/${periodo}/${grado}`),
 saveRules: (periodo: number, grado: number, configuracion: LibretaPolicy, revision: number, cerrado: boolean) => client.put(`/alumnos/libreta/reglas/${periodo}/${grado}`, { configuracion, revision, cerrado }),
 calculate: (alumno: number, periodo: number, grado: number) => client.get<ApiResponse<CalculatedResponse>>(`/alumnos/${alumno}/libretas/${periodo}/${grado}`),
 emit: (alumno: number, periodo: number, grado: number, revision: number, solicitud_id: string, huella: string) => client.post<ApiResponse<{id:number}>>(`/alumnos/${alumno}/libretas/${periodo}/${grado}`, {revision,solicitud_id,huella,revisada:true}),
 issued: (alumno:number,id:number) => client.get<ApiResponse<IssuedReport>>(`/alumnos/${alumno}/libretas/emisiones/${id}`)
};

// Consulta de DNI (RENIEC) para autocompletar registros
export interface PersonaDni { dni: string; nombre: string; apellido: string; apellido_paterno: string; apellido_materno: string; registrado: { id: number; nombre: string } | null }
export const consultaApi = {
  dni: (dni: string) => client.get<ApiResponse<PersonaDni>>(`/consulta/dni/${dni}`),
};
