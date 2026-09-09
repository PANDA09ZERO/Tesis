import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, message = 'Operación exitosa', statusCode = 200) {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, message = 'Error del servidor', statusCode = 500) {
  const response: ApiResponse = {
    success: false,
    message
  };
  return res.status(statusCode).json(response);
}

export function sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number, message = 'Operación exitosa') {
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
  return res.status(200).json(response);
}