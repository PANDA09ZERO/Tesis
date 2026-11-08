export interface User {
  rolSistema?: string;
  debe_cambiar_password?: boolean;
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  foto_url?: string;
  dni?: string;
  telefono?: string;
  fecha_nacimiento?: string | null;
  genero?: string;
}

export interface CreatedAccountCredentials {
  email: string;
  temporaryPassword: string;
  mustChangePassword: true;
  mailboxCreated: false;
}

export interface CreatedAccount {
  id: number;
  usuario_id?: number;
  codigo_alumno?: string;
  credentials: CreatedAccountCredentials;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Alumno {
  tiene_matricula?: number;
  tiene_matricula_activa_periodo?: number | null;
  estado_matricula?: string | null;
  id: number;
  usuario_id: number;
  codigo_alumno: string;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  fecha_nacimiento?: string;
  genero?: string;
  telefono?: string;
  foto_url?: string;
  grado?: string;
  grado_id?: number;
  nivel?: string;
  periodo_academico?: string;
  periodo_academico_id?: number;
  estado: string;
  activo: number;
  created_at: string;
}

export interface Profesor {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  telefono?: string;
  foto_url?: string;
  especialidad?: string;
  fecha_ingreso?: string;
  titulo_profesional?: string;
  activo: number;
  cursos_asignados?: CursoAsignado[];
}

export interface CursoAsignado {
  periodo_activo?:number;
  periodo_grado_curso_id?:number;
  periodo_academico_id?:number;
  nombre: string;
  codigo?: string;
  grado: string;
  periodo: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Curso {
  id: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  grado_id?: number;
  grado_nombre?: string;
  estado?: string;
  instructor?: string;
  image?: string;
  grado?: string;
}

export interface OfertaAcademica {
  periodo_grado_curso_id: number;
  periodo_academico_id: number;
  periodo: string;
  periodo_activo: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  grado_id: number;
  grado: string;
  nivel: string;
  curso_id: number;
  curso: string;
  codigo?: string;
  descripcion?: string;
  alumnos_count?: number;
  profesores?: Profesor[];
  alumnos?: AlumnoOferta[];
}

export interface AlumnoOferta {
  matricula_id: number;
  alumno_id: number;
  codigo_alumno: string;
  nombre: string;
  apellido: string;
  estado_matricula: string;
  periodo_academico_id: number;
  grado_id: number;
}

export interface Calificacion {
  id: number;
  alumno_id: number;
  curso_id: number;
  periodo_academico_id: number;
  nota: number;
  tipo_evaluacion?: string;
  observaciones?: string;
  curso_nombre?: string;
  curso_codigo?: string;
  periodo_nombre?: string;
  fecha_evaluacion?: string;
}

export interface EvaluacionAcademica {
  id: number;
  periodo_grado_curso_id: number;
  nombre: string;
  tipo: string;
  fecha_evaluacion: string;
  nota_maxima: number;
  estado: 'activa' | 'cerrada';
}

export interface AlumnoLibro {
  alumno_id: number;
  codigo_alumno: string;
  nombre: string;
  apellido: string;
  grado_id: number;
}

export interface Asistencia {
  id: number;
  alumno_id: number;
  curso_id?: number;
  fecha: string;
  estado: 'presente' | 'ausente' | 'tardanza' | 'justificado';
  minutos_tardanza: number;
  observaciones?: string;
  curso_nombre?: string;
}

export interface Documento {
  id: number;
  titulo: string;
  descripcion?: string;
  archivo_url?: string | null;
  tipo_archivo: string;
  tamano_bytes: number;
  categoria?: string;
  categoria_id?: number | null;
  subcategoria?: string;
  alumno_id?: number;
  profesor_id?: number;
  obligatorio: number;
  fecha_vencimiento?: string;
  estado: string;
  created_at: string;
}

export interface DocumentoCategoria {
  id: number;
  nombre: string;
  estado: 'activa' | 'archivada';
}

export type FormularioCampoTipo =
  | 'texto'
  | 'parrafo'
  | 'numero'
  | 'fecha'
  | 'correo'
  | 'seleccion'
  | 'casilla';

export interface FormularioCampo {
  id: string;
  etiqueta: string;
  tipo: FormularioCampoTipo;
  requerido: boolean;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
}

export interface FormularioDocumental {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoria_id?: number | null;
  categoria?: string | null;
  campos?: FormularioCampo[];
  estado: 'borrador' | 'publicada' | 'archivada';
  creado_por: number;
  created_at: string;
  updated_at: string;
  cantidad_campos?: number;
  envios_count?: number | null;
}

export interface FormularioEnvio {
  id: number;
  usuario_id: number;
  alumno_id: number | null;
  respuestas: Record<string, unknown>;
  created_at: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
  codigo_alumno?: string | null;
  alumno_nombre?: string | null;
  alumno_apellido?: string | null;
}

export interface Horario {
  id: number;
  curso_id: number;
  profesor_id: number;
  periodo_academico_id: number;
  periodo_grado_curso_id: number | null;
  oferta_academica_id?: number | null;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula?: string;
  curso_nombre?: string;
  curso_codigo?: string;
  profesor_nombre?: string;
  grado?: string;
  nivel?: string;
  periodo?: string;
}

export interface HorarioPayload {
  periodo_grado_curso_id: number;
  profesor_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
}

export type CalendarEventType = 'clase' | 'evaluacion' | 'institucional' | 'feriado' | 'reunion' | 'otro';

export interface CalendarEvent {
  id: string;
  tipo: CalendarEventType;
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  aula: string | null;
  curso: string;
  curso_codigo?: string | null;
  grado: string;
  periodo: string;
  periodo_academico_id: number | null;
  periodo_grado_curso_id: number | null;
}

export interface PeriodoAcademico {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: number;
}

export interface Alerta {
  id: number;
  alumno_id: number;
  tipo_riesgo: 'bajo' | 'medio' | 'alto';
  nivel_riesgo: number;
  indicadores: string | { periodo_id?: number; ventana?: { desde: string; hasta: string }; items?: { tipo: string; riesgo: string; valor: number; detalle: string }[] } | null;
  descripcion?: string;
  recomendacion?: string;
  estado: string;
  generada_por_ia: number;
  alumno_nombre?: string;
  alumno_apellido?: string;
  codigo_alumno?: string;
  grado?: string;
  created_at: string;
}

export interface DashboardStats {
  totalAlumnos: number;
  totalProfesores: number;
  totalApoderados?: number;
  totalCursos: number;
  alertasActivas: number;
  documentosPendientes: number;
  asistenciaPromedio: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface DetallePeriodo {
  periodo: PeriodoAcademico;
  resumen: { grados: number; cursos: number; ofertas: number; profesores: number; alumnos_activos: number; inscripciones: number; horarios: number };
}

export type TipoIncidencia = 'derivacion_direccion' | 'conducta' | 'citacion_apoderado' | 'agresion' | 'otro';
export type GravedadIncidencia = 'leve' | 'moderada' | 'grave';
export type EstadoIncidencia = 'abierta' | 'en_seguimiento' | 'cerrada';
export interface Incidencia {
  id: number;
  alumno_id: number;
  fecha: string;
  hora?: string | null;
  tipo: TipoIncidencia;
  gravedad: GravedadIncidencia;
  lugar?: string | null;
  descripcion: string;
  medida_tomada?: string | null;
  apoderado_notificado: number | boolean;
  estado: EstadoIncidencia;
  resolucion?: string | null;
  cerrada_en?: string | null;
  created_at: string;
  periodo?: string | null;
  reportado_por?: number;
  alumno_nombre: string;
  alumno_apellido: string;
  codigo_alumno: string;
  reportado_nombre?: string;
  reportado_apellido?: string;
  cerrada_nombre?: string | null;
  cerrada_apellido?: string | null;
}
export interface IncidenciasEstadisticas { total: number; abiertas: number; derivaciones: number; graves_abiertas: number; ultimos_30_dias: number }
