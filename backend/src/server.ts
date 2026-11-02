import app from './app';
import pool from './config/database';
import { applicationSettings } from './config/environment';
import fs from 'fs/promises';

async function main() {
  const config=applicationSettings();
  // No se crea en producción: la ruta debe corresponder al volumen montado.
  if(!config.production)await fs.mkdir(config.uploadDirectory,{recursive:true});
  else await fs.access(config.uploadDirectory);
  const server=app.listen(config.port,'0.0.0.0',()=>console.log(JSON.stringify({event:'server_started',port:config.port})));
  server.requestTimeout=config.requestTimeout;
  server.headersTimeout=Math.min(60000,config.requestTimeout);
  let closing=false;
  const close=()=>{if(closing)return;closing=true;const deadline=setTimeout(()=>process.exit(1),15000);deadline.unref();server.close(()=>{pool.end().then(()=>{clearTimeout(deadline);process.exit(0);}).catch(()=>process.exit(1));});};
  process.once('SIGTERM',close);process.once('SIGINT',close);
}
main().catch(()=>{console.error(JSON.stringify({event:'startup_failed',message:'Verifique configuración y volumen persistente'}));process.exitCode=1;});
