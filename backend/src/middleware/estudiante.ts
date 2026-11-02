import { Response,NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response';

// Complementa la propiedad comprobada por cada controlador: sin catálogos ni escritura administrativa.
export function limitarEstudiante(req:AuthRequest,res:Response,next:NextFunction) {
  if (req.user?.rol !== 'alumno') return next();
  const path = req.originalUrl.replace(/^\/api(?=\/|$)/,'').split('?')[0];
  const read = req.method === 'GET' || req.method === 'HEAD';
  const reads = [
    /^\/auth\/profile$/, /^\/estudiante\/(contexto|periodo|cursos\/\d+)$/,
    /^\/alumnos\/\d+(?:\/horario)?$/, /^\/calificaciones\/alumno\/\d+$/,
    /^\/asistencias\/alumno\/\d+$/, /^\/horarios\/calendario$/,
    /^\/documentos(?:\/.*)?$/, /^\/alertas(?:\/estadisticas)?$/,
    /^\/notificaciones(?:\/(no-leidas|\d+))?$/
  ];
  const permittedWrite = req.method === 'PUT' && (path === '/auth/change-password' || /^\/notificaciones\/(\d+\/marcar-leida|marcar-todas-leidas)$/.test(path))
    || req.method === 'DELETE' && /^\/notificaciones\/\d+$/.test(path)
    || req.method === 'POST' && /^\/documentos\/formularios\/\d+\/envios$/.test(path);
  if (read && reads.some(pattern=>pattern.test(path)) || permittedWrite) return next();
  return sendError(res,'Tu cuenta de estudiante solo puede consultar sus datos personales y realizar las acciones habilitadas',403);
}
