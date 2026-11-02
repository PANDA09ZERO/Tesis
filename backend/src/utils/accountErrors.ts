import { Response } from 'express';
import { sendError } from './response';
import { logError } from './logger';
export function accountFailure(res: Response,error: unknown,message: string){
  const code=(error as {code?:string})?.code;
  if(code==='ER_DUP_ENTRY')return sendError(res,'El usuario institucional, correo o DNI ya está registrado; vuelva a intentar con los datos verificados',409);
  if(code==='ER_NO_REFERENCED_ROW_2')return sendError(res,'Una referencia seleccionada ya no existe. Actualice la lista e intente nuevamente',400);
  logError(message,error);return sendError(res,message,500);
}
