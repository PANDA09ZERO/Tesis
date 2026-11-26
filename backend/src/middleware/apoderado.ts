import {Response,NextFunction} from 'express';
import {AuthRequest} from '../types';
import {sendError} from '../utils/response';
export function limitarApoderado(req:AuthRequest,res:Response,next:NextFunction){
 const apiPath=req.originalUrl.replace(/^\/api(?=\/|$)/,'').split('?')[0];
    if (req.user?.rol !== 'apoderado') return next();

    const isRead = req.method === 'GET' || req.method === 'HEAD';
    const allowedGuardianReads = [
      /^\/auth\/profile$/,
      /^\/apoderados\/me\/alumnos$/,
      /^\/apoderados\/me\/inicio$/,
      /^\/apoderados\/me\/alumnos\/\d+\/resumen$/,
      /^\/alumnos\/\d+(?:\/horario)?$/,
      /^\/calificaciones\/alumno\/\d+$/,
      /^\/asistencias\/alumno\/\d+$/,
      /^\/incidencias\/alumno\/\d+$/,
      /^\/documentos(?:\/.*)?$/,
      /^\/notificaciones(?:\/(no-leidas|\d+(?:\/respuestas)?))?$/
    ];

    const allowedFormSubmission = req.method === 'POST'
      && /^\/documentos\/formularios\/\d+\/envios$/.test(apiPath);
    // Sus propias notificaciones: marcar como leídas o borrarlas (el controlador filtra por usuario).
    const allowedNotificationWrite = req.method === 'PUT' && /^\/notificaciones\/(\d+\/marcar-leida|marcar-todas-leidas)$/.test(apiPath)
      || req.method === 'DELETE' && /^\/notificaciones\/\d+$/.test(apiPath)
      || req.method === 'POST' && /^\/notificaciones\/(\d+\/respuestas|eliminar)$/.test(apiPath);

    if ((isRead && allowedGuardianReads.some(pattern => pattern.test(apiPath))) || allowedFormSubmission || allowedNotificationWrite || (req.method === 'PUT' && apiPath === '/auth/change-password')) {
      return next();
    }

    return sendError(res, 'El acceso de apoderado es de solo lectura y limitado a sus alumnos', 403);
}
