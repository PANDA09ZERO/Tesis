import client from './client';
import type { ApiResponse, PaginatedResponse, User, Alumno, Profesor, Curso, Calificacion, Asistencia, Documento, Horario, PeriodoAcademico, Alerta, DashboardStats, RiesgoAcademico } from '../types';

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    client.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password }),
  register: (data: any) => client.post<ApiResponse>('/auth/register', data),
  getProfile: () => client.get<ApiResponse<User>>('/auth/profile'),
  changePassword: (currentPassword: string, newPassword: string) =>
    client.put<ApiResponse>('/auth/change-password', { currentPassword, newPassword })
};

// Users
export const usersApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<User>>('/users', { params }),
  getById: (id: number) => client.get<ApiResponse<User>>(`/users/${id}`),
  create: (data: any) => client.post<ApiResponse>('/users', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/users/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/users/${id}`)
};

// Alumnos
export const alumnosApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Alumno>>('/alumnos', { params }),
  getById: (id: number) => client.get<ApiResponse<Alumno>>(`/alumnos/${id}`),
  create: (data: any) => client.post<ApiResponse>('/alumnos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/alumnos/${id}`, data),
  getHorario: (id: number) => client.get<ApiResponse<Horario[]>>(`/alumnos/${id}/horario`)
};

// Profesores
export const profesoresApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Profesor>>('/profesores', { params }),
  getById: (id: number) => client.get<ApiResponse<Profesor>>(`/profesores/${id}`),
  create: (data: any) => client.post<ApiResponse>('/profesores', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/profesores/${id}`, data),
  getAlumnos: (id: number) => client.get<ApiResponse<Alumno[]>>(`/profesores/${id}/alumnos`)
};

// Cursos
export const cursosApi = {
  getAll: (params?: any) => client.get<PaginatedResponse<Curso>>('/cursos', { params }),
  create: (data: any) => client.post<ApiResponse>('/cursos', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/cursos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/cursos/${id}`)
};

// Calificaciones
export const calificacionesApi = {
  getByAlumno: (alumnoId: number, params?: any) =>
    client.get<ApiResponse<{ calificaciones: Calificacion[]; resumen: any }>>(`/calificaciones/alumno/${alumnoId}`, { params }),
  getByCurso: (cursoId: number, params?: any) =>
    client.get<ApiResponse<{ calificaciones: Calificacion[]; estadisticas: any }>>(`/calificaciones/curso/${cursoId}`, { params }),
  register: (data: any) => client.post<ApiResponse>('/calificaciones', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/calificaciones/${id}`, data),
  bulkRegister: (calificaciones: any[]) => client.post<ApiResponse>('/calificaciones/bulk', { calificaciones })
};

// Asistencias
export const asistenciasApi = {
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
  getAll: (params?: any) => client.get<PaginatedResponse<Documento>>('/documentos', { params }),
  getById: (id: number) => client.get<ApiResponse<Documento>>(`/documentos/${id}`),
  upload: (formData: FormData) =>
    client.post<ApiResponse<{ id: number; archivo_url: string }>>('/documentos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  update: (id: number, data: any) => client.put<ApiResponse>(`/documentos/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/documentos/${id}`),
  getPendientes: () => client.get<ApiResponse<Documento[]>>('/documentos/pendientes')
};

// Horarios
export const horariosApi = {
  getAll: (params?: any) => client.get<ApiResponse<Horario[]>>('/horarios', { params }),
  create: (data: any) => client.post<ApiResponse>('/horarios', data),
  update: (id: number, data: any) => client.put<ApiResponse>(`/horarios/${id}`, data),
  delete: (id: number) => client.delete<ApiResponse>(`/horarios/${id}`)
};

// Periodos
export const periodosApi = {
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
  getEstadisticas: () => client.get<ApiResponse<any>>('/alertas/estadisticas')
};

// Dashboard
export const dashboardApi = {
  getStats: () => client.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
  getRendimiento: () => client.get<ApiResponse<any[]>>('/dashboard/rendimiento'),
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

// AI (proxy del backend al servicio Python)
export const aiApi = {
  predictAlumno: (alumnoId: number) =>
    client.get<ApiResponse<RiesgoAcademico>>(`/ai/predict/${alumnoId}`),
  analyzeAll: () => client.post<ApiResponse<any>>('/ai/analyze-all'),
  trainModel: () => client.post<ApiResponse<any>>('/ai/train')
};