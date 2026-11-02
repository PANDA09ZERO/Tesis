import { ErrorRequestHandler, RequestHandler } from 'express';
export const notFound: RequestHandler = (_req,res) => { res.status(404).json({success:false,message:'Ruta no encontrada'}); };
export const errorHandler: ErrorRequestHandler = (error,_req,res,_next) => {
  if (res.headersSent) return _next(error);
  const status = error?.type === 'entity.parse.failed' ? 400 : error?.type === 'entity.too.large' ? 413 : error?.status === 403 ? 403 : 500;
  console.error(JSON.stringify({event:'request_error',status}));
  res.status(status).json({success:false,message:status===400?'El cuerpo de la solicitud no es JSON válido':status===413?'Solicitud demasiado grande':status===403?'Origen no permitido':'Error al procesar la solicitud'});
};
