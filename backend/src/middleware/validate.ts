import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sendError } from '../utils/response';

export function handleValidation(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, errors.array().map(e => e.msg).join(', '), 400);
  }
  next();
}

export const validateStudent = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('apellido').notEmpty().withMessage('Apellido requerido'),
  body('email').isEmail().withMessage('Email válido requerido'),
  body('dni').optional().isLength({ min: 8, max: 12 }),
  handleValidation
];

export const validateTeacher = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('apellido').notEmpty().withMessage('Apellido requerido'),
  body('email').isEmail().withMessage('Email válido requerido'),
  body('especialidad').optional().isString(),
  handleValidation
];

export const validateGrade = [
  body('alumno_id').isInt().withMessage('ID de alumno requerido'),
  body('curso_id').isInt().withMessage('ID de curso requerido'),
  body('periodo_academico_id').isInt().withMessage('ID de periodo requerido'),
  body('nota').isFloat({ min: 0, max: 20 }).withMessage('La nota debe estar entre 0 y 20'),
  handleValidation
];

export const validateAttendance = [
  body('alumno_id').isInt().withMessage('ID de alumno requerido'),
  body('fecha').isISO8601().withMessage('Fecha válida requerida'),
  body('estado').isIn(['presente', 'ausente', 'tardanza', 'justificado']).withMessage('Estado inválido'),
  handleValidation
];

export const validateIdParam = [
  param('id').isInt().withMessage('ID inválido'),
  handleValidation
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidation
];
