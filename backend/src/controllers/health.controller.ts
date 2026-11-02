import { Request, Response } from 'express';
import fs from 'fs/promises';
import {constants} from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import pool from '../config/database';
import { applicationSettings } from '../config/environment';
export async function readiness(_req: Request, res: Response) {
  const config = applicationSettings();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      Promise.all([pool.query('SELECT 1'), checkStorage(config.uploadDirectory)]),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Readiness timeout')),config.readinessTimeout);})
    ]);
    res.json({status:'ready'});
  } catch {res.status(503).json({status:'unavailable'});}
  finally {if(timer)clearTimeout(timer);}
}
async function checkStorage(directory: string) {
  // El panel necesita un almacén inmutable durante copias; readiness no debe crear archivos allí.
  if(process.env.OPERATIONS_DIRECTORY||process.env.OPERATIONS_SINGLE_INSTANCE==='true')return fs.access(directory,constants.R_OK|constants.W_OK);
  const filename = path.join(directory,`.readiness-${randomUUID()}`);
  let file;
  try {file=await fs.open(filename,'wx',0o600);await file.close();file=undefined;}
  finally {if(file)await file.close();await fs.unlink(filename).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
