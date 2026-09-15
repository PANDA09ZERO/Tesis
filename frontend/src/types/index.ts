export interface User {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  foto_url?: string;
  password_hash?: string;
  password?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Alumno {
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
  nivel?: string;
  seccion?: string;
  periodo_academico?: string;
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
  nombre: string;
  codigo?: string;
  seccion: string;
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
  archivo_url: string;
  tipo_archivo: string;
  tamano_bytes: number;
  categoria?: string;
  subcategoria?: string;
  alumno_id?: number;
  profesor_id?: number;
  obligatorio: number;
  fecha_vencimiento?: string;
  estado: string;
  created_at: string;
}

export interface Horario {
  id: number;
  curso_id: number;
  profesor_id: number;
  seccion_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula?: string;
  curso_nombre?: string;
  curso_codigo?: string;
  profesor_nombre?: string;
  seccion?: string;
  grado?: string;
  periodo?: string;
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
  indicadores: string;
  descripcion?: string;
  recomendacion?: string;
  estado: string;
  generada_por_ia: number;
  alumno_nombre?: string;
  alumno_apellido?: string;
  codigo_alumno?: string;
  grado?: string;
  seccion?: string;
  created_at: string;
}

export interface DashboardStats {
  totalAlumnos: number;
  totalProfesores: number;
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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface RiesgoAcademico {
  alumno_id: number;
  nombre_completo: string;
  codigo_alumno: string;
  grado: string;
  seccion: string;
  nivel_riesgo: number;
  tipo_riesgo: 'bajo' | 'medio' | 'alto';
  indicadores: string[];
  promedio_general: number;
  porcentaje_ausencias: number;
  cursos_desaprobados: number;
  tendencia: string;
  recomendacion: string;
}