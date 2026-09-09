import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { sendError } from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token de autenticación requerido', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Token inválido o expirado', 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'No autenticado', 401);
    }

    if (!roles.includes(req.user.rol)) {
      return sendError(res, 'No tiene permisos para esta acción', 403);
    }

    next();
  };
}
