import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  email: string;
  rol: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface DashboardStats {
  totalAlumnos: number;
  totalProfesores: number;
  totalCursos: number;
  alertasActivas: number;
  documentosPendientes: number;
  asistenciaPromedio: number;
}

export interface RiesgoAcademico {
  alumnoId: number;
  nombreCompleto: string;
  nivelRiesgo: 'bajo' | 'medio' | 'alto';
  porcentaje: number;
  indicadores: {
    inasistencias: number;
    tardanzas: number;
    promedioGeneral: number;
    cursosDesaprobados: number;
    tendencia: 'mejora' | 'estable' | 'deterioro';
  };
  recomendacion: string;
}