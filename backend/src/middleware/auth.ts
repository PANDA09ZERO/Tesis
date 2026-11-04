import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { sendError } from '../utils/response';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { credentialVersion } from '../utils/session';
const verified = new WeakSet<object>();
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  if (verified.has(req)) return next();
  const secret = process.env.JWT_SECRET;
  if (!secret) return sendError(res, 'La configuración de autenticación no está disponible', 500);
  if (!req.headers.authorization?.startsWith('Bearer ')) return sendError(res, 'Token de autenticación requerido', 401);
  let decoded: JwtPayload & {credentialVersion: string};
  try {
    decoded = jwt.verify(req.headers.authorization.slice(7), secret, {algorithms:['HS256']}) as typeof decoded;
    if (!decoded || !Number.isSafeInteger(decoded.userId) || decoded.userId < 1 || typeof decoded.rol !== 'string' || typeof decoded.credentialVersion !== 'string') throw new Error('Invalid claims');
  } catch { return sendError(res, 'Sesión inválida o expirada. Inicie sesión nuevamente', 401); }
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT u.id, u.email, u.activo, u.password_hash, u.debe_cambiar_password, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?', [decoded.userId]);
    const user = rows[0];
    if (!user || Number(user.activo) !== 1 || user.rol !== decoded.rol || credentialVersion(user.password_hash, secret) !== decoded.credentialVersion) return sendError(res, 'Sesión inválida. Inicie sesión nuevamente', 401);
    // Robustez: si originalUrl no está definido (pruebas/montajes), se usa url para no fallar con 503.
    const apiPath = String(req.originalUrl ?? req.url ?? '').replace(/^\/api(?=\/|$)/, '').split('?')[0];
    if (Number(user.debe_cambiar_password) === 1 && !(
      (req.method === 'GET' && apiPath === '/auth/profile') ||
      (req.method === 'PUT' && apiPath === '/auth/change-password')
    )) return sendError(res, 'Debe cambiar su contraseña antes de continuar', 403);
    req.user = {userId:user.id, email:user.email, rol:user.rol};
    verified.add(req);
  } catch { return sendError(res, 'No se pudo verificar la sesión. Intente nuevamente', 503); }
  return next();
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'No autenticado', 401);
    }

    if (!roles.includes(req.user.rol) && !(req.user.rol==='superadministrador'&&roles.includes('administrador'))) {
      return sendError(res, 'No tiene permisos para esta acción', 403);
    }

    next();
  };
}
