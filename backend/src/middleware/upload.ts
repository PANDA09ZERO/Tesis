import { uploadDirectory, integerSetting } from '../config/environment';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response';
import { logError } from '../utils/logger';

const UPLOAD_DIRECTORY = uploadDirectory();
const ALLOWED_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(UPLOAD_DIRECTORY, { recursive: true }, error => cb(error, UPLOAD_DIRECTORY));
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES[extension] === file.mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo: PDF, JPG, PNG, GIF, DOC, DOCX'));
  }
};

const MAX_UPLOAD_BYTES = integerSetting(process.env, 'MAX_UPLOAD_BYTES', 10 * 1024 * 1024, 1, 100 * 1024 * 1024);

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, fields:20, fieldSize:16384, parts:21, files:1 }
});

export function uploadDocumentoFile(req: Request, res: Response, next: NextFunction) {
  upload.single('archivo')(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      // Corrección: el mensaje decía siempre 10 MB aunque MAX_UPLOAD_BYTES fuera otro valor.
      return sendError(res, `El archivo supera el límite de ${Math.max(1, Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024)))} MB`, 413);
    }
    if(error instanceof multer.MulterError)return sendError(res,'Formulario de archivo inválido o demasiado grande',400);
    if(error.message?.startsWith('Tipo de archivo no permitido'))return sendError(res,error.message,400);
    logError('Error al guardar archivo:',error);
    return sendError(res, 'No se pudo guardar el archivo. Verifique el almacenamiento e intente nuevamente', 500);
  });
}

// Hojas de cálculo para importaciones: se leen en memoria y nunca se guardan.
const hojaCalculo = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.csv'].includes(extension)) cb(null, true);
    else cb(new Error('Formato no admitido. Usa Excel (.xlsx) o CSV'));
  },
  limits: { fileSize: 5 * 1024 * 1024, fields: 5, parts: 6, files: 1 }
});

export function uploadHojaCalculo(req: Request, res: Response, next: NextFunction) {
  hojaCalculo.single('archivo')(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return sendError(res, 'El archivo supera el límite de 5 MB', 413);
    if (error instanceof multer.MulterError) return sendError(res, 'Formulario de archivo inválido', 400);
    return sendError(res, error.message || 'No se pudo leer el archivo', 400);
  });
}
