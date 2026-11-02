'use strict';
const fs=require('node:fs/promises');const nativeFs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawn}=require('node:child_process');const {pipeline}=require('node:stream/promises');const {createHash}=require('node:crypto');
const mysql=require('mysql2/promise');const {databaseSettings,uploadDirectory}=require('../dist/config/environment');const {identifier}=require('./database.cjs');
const hash=async filename=>{const h=createHash('sha256');for await(const chunk of nativeFs.createReadStream(filename))h.update(chunk);return h.digest('hex');};
async function inventory(directory){
 const files=[];for(const name of (await fs.readdir(directory)).sort()){
  const file=path.join(directory,name),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Solo archivos regulares en el almacén; revisar directorios/enlaces');
  files.push({name,size:stat.size,sha256:await hash(file)});
 }return files;
}
async function client(settings,kind,filename){
 // Contraseña fuera de argv, stdout y archivos de respaldo.
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-db-client-'));await fs.chmod(temp,0o700);
 const config=path.join(temp,'client.cnf');const quote=v=>'"'+String(v??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r')+'"';
 try{
  let content='[client]\nhost='+quote(settings.host)+'\nport='+settings.port+'\nuser='+quote(settings.user)+'\npassword='+quote(settings.password)+'\ndefault-character-set=utf8mb4\n';
  if(settings.ssl){content+=(process.env.MYSQL_CLIENT_FLAVOR==='mariadb'?'ssl=1\nssl-verify-server-cert=1\n':'ssl-mode=VERIFY_IDENTITY\n');if(process.env.DB_SSL_CA_FILE)content+='ssl-ca='+quote(process.env.DB_SSL_CA_FILE)+'\n';}
  await fs.writeFile(config,content,{mode:0o600});
  const executable=kind==='dump'?(process.env.MYSQLDUMP_BIN||'mysqldump'):(process.env.MYSQL_BIN||'mysql');
  const args=['--defaults-file='+config,...(kind==='dump'?['--single-transaction','--quick','--hex-blob','--no-tablespaces','--skip-add-locks','--skip-comments',...(process.env.MYSQL_CLIENT_FLAVOR==='mariadb'?[]:['--set-gtid-purged=OFF']),settings.database]:['--database='+settings.database])];
  const child=spawn(executable,args,{stdio:['pipe','pipe','pipe'],windowsHide:true});let diagnostic='';child.stderr.on('data',chunk=>{if(diagnostic.length<4096)diagnostic+=chunk.toString();});
  const completed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Cliente MySQL falló: '+(diagnostic.match(/(?:ERROR\s+|Got error:\s*)\d+|unknown (?:option|variable)|defaults handling|Access is denied|Permission denied/i)?.[0]||'exit '+code))));});
  // Registrar handlers antes de comenzar el flujo para evitar rechazos no atendidos.
  const transfer=kind==='dump'?pipeline(child.stdout,nativeFs.createWriteStream(filename,{flags:'wx',mode:0o600})):pipeline(nativeFs.createReadStream(filename),child.stdin);
  if(kind==='dump')child.stdin.end();else child.stdout.resume();
  const results=await Promise.allSettled([completed,transfer]);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 }finally{await fs.rm(config,{force:true});await fs.rmdir(temp);}
}
async function backup(settings,storage,destination){
 if(!path.isAbsolute(destination)||!path.isAbsolute(storage))throw new Error('Se requieren rutas absolutas');
 if(destination===storage||destination.startsWith(storage+path.sep))throw new Error('El respaldo debe estar fuera de uploads');
 await fs.mkdir(destination,{mode:0o700});await fs.mkdir(path.join(destination,'uploads'),{mode:0o700});
 const before=await inventory(storage);const db=await mysql.createConnection(settings);
 try{
  const [documents]=await db.query('SELECT archivo_url FROM documentos WHERE archivo_url IS NOT NULL');const names=new Set(before.map(f=>f.name));
  if(documents.some(d=>!names.has(path.basename(d.archivo_url))))throw new Error('Hay documentos sin archivo: respaldo detenido');
  await client(settings,'dump',path.join(destination,'database.sql'));
  for(const file of before)await fs.copyFile(path.join(storage,file.name),path.join(destination,'uploads',file.name),nativeFs.constants.COPYFILE_EXCL);
  const after=await inventory(storage),copied=await inventory(path.join(destination,'uploads'));
  if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(before)!==JSON.stringify(copied))throw new Error('El almacén cambió durante el respaldo');
  const [tables]=await db.query('SHOW TABLES');const counts={};for(const table of tables.map(t=>Object.values(t)[0])){const [rows]=await db.query('SELECT COUNT(*) total FROM '+identifier(table));counts[table]=Number(rows[0].total);}
  const manifest={format:1,createdAt:new Date().toISOString(),sourceDatabase:settings.database,quiescenceRequired:true,counts,files:copied,sqlSha256:await hash(path.join(destination,'database.sql'))};
  await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});return {tables:tables.length,files:copied.length};
 }finally{await db.end();}
}
async function restore(settings,source,storage){
 const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
 if(manifest.format!==1||manifest.sourceDatabase===settings.database)throw new Error('Restaurar solo a otra base vacía y aislada');
 identifier(settings.database);
 if(await hash(path.join(source,'database.sql'))!==manifest.sqlSha256||JSON.stringify(await inventory(path.join(source,'uploads')))!==JSON.stringify(manifest.files))throw new Error('Integridad de respaldo inválida');
 await fs.mkdir(storage,{recursive:true,mode:0o700});if((await fs.readdir(storage)).length)throw new Error('El almacén destino debe estar vacío');
 const db=await mysql.createConnection(settings);try{const [tables]=await db.query('SHOW TABLES');if(tables.length)throw new Error('La base destino debe estar vacía');}finally{await db.end();}
 await client(settings,'restore',path.join(source,'database.sql'));
 for(const file of manifest.files){if(path.basename(file.name)!==file.name)throw new Error('Nombre inválido');await fs.copyFile(path.join(source,'uploads',file.name),path.join(storage,file.name),nativeFs.constants.COPYFILE_EXCL);}
 const verified=await mysql.createConnection(settings);try{
  for(const [table,count] of Object.entries(manifest.counts)){const [rows]=await verified.query('SELECT COUNT(*) total FROM '+identifier(table));if(Number(rows[0].total)!==count)throw new Error('Conteo restaurado diferente');}
 }finally{await verified.end();}
 if(JSON.stringify(await inventory(storage))!==JSON.stringify(manifest.files))throw new Error('Archivos restaurados diferentes');
 return {verified:true,tables:Object.keys(manifest.counts).length,files:manifest.files.length};
}
async function main(){const [command,location]=process.argv.slice(2);const settings=databaseSettings();let result;
 if(command==='create'){if(!process.argv.includes('--maintenance-confirmed'))throw new Error('Detenga escrituras HTTP/jobs y confirme mantenimiento');result=await backup(settings,uploadDirectory(),path.resolve(location));}
 else if(command==='restore'){if(!process.argv.includes('--isolated-target-confirmed'))throw new Error('Confirme base y uploads de recuperación aislados');result=await restore(settings,path.resolve(location),uploadDirectory());}
 else throw new Error('Use create <directorio nuevo> --maintenance-confirmed o restore <respaldo> --isolated-target-confirmed');console.log(JSON.stringify(result));}
module.exports={backup,restore,inventory,hash};
if(require.main===module)main().catch(()=>{console.error('Respaldo/restauración falló. No usar el destino parcial; revisar permisos, integridad, referencias y mantenimiento');process.exitCode=1;});
