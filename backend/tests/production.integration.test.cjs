const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const mysql=require('mysql2/promise');
const {databaseSettings}=require('../dist/config/environment');const {install,checkSchema,preflight}=require('../scripts/database.cjs');const {backup,restore}=require('../scripts/backup.cjs');
test('producción: instalación limpia, API real, documentos privados y recuperación aislada',async t=>{
 const settings=databaseSettings(),suffix=Date.now()+'_'+process.pid,source='production_test_'+suffix,target='restore_test_'+suffix;
 assert.match(source,/^production_test_\d+_\d+$/);assert.match(target,/^restore_test_\d+_\d+$/);
 const admin=await mysql.createConnection({...settings,database:undefined});const dir=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-production-'));const storage=path.join(dir,'uploads');await fs.mkdir(storage);
 const previous={...process.env};let db,server,token,documentId;
 try{
  await admin.query('CREATE DATABASE `'+source+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await admin.query('CREATE DATABASE `'+target+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=mysql.createPool({...settings,database:source});
  await t.test('esquema consolidado instala FKs, roles y versión sin cuentas demo; repetir no sobrescribe',async()=>{
   await install(db);assert.equal((await checkSchema(db)).compatible,true);await assert.rejects(()=>install(db));const [rows]=await db.query('SELECT COUNT(*) total FROM usuarios');assert.equal(rows[0].total,0);const [versions]=await db.query('SELECT version FROM schema_migrations');assert.equal(versions.length,1);
  });
  await t.test('preflight informa cuentas ausentes y legacy sin exponer credenciales',async()=>{
   assert.equal((await preflight(db)).ready,false);
   const hash=await require('../dist/utils/encrypt').encryptPasswordAsync('Synthetic-2026!');
   for(const [id,role]of [[1,1],[2,2],[3,3],[4,4]])await db.query('INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(?,?,?,?,?,?)',[id,'user'+id+'@example.test',hash,'Usuario',String(id),role]);
   assert.equal((await preflight(db)).ready,true);await db.query("INSERT INTO usuarios(email,password_hash,nombre,apellido,rol_id) VALUES('legacy@example.test','synthetic-legacy','Prueba','Legacy',3)");assert.equal((await preflight(db)).ready,false);await db.query("UPDATE usuarios SET activo=0 WHERE email='legacy@example.test'");
   const [versions]=await db.query('SELECT version,checksum FROM schema_migrations');await db.query('DELETE FROM schema_migrations');assert.equal((await preflight(db)).ready,false);await db.query('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)',[versions[0].version,versions[0].checksum]);assert.equal((await preflight(db)).ready,true);
  });
  await t.test('migración de producción inspecciona primero y añade unicidad sin borrar datos',async()=>{
   const {migrate}=require('../scripts/migrate-production.cjs');await db.query('ALTER TABLE sueldos ADD INDEX idx_sueldo_profesor_soporte(profesor_id)');await db.query('ALTER TABLE sueldos DROP INDEX unique_sueldo_mensual');const proposed=await migrate(db);assert.equal(proposed.pending,true);assert.equal(proposed.changed,false);assert.equal((await migrate(db,true)).changed,true);assert.equal((await migrate(db,true)).pending,false);
  });
  for(const sql of ["INSERT INTO profesores(id,usuario_id) VALUES(1,2)","INSERT INTO alumnos(id,usuario_id,codigo_alumno) VALUES(1,3,'TEST')","INSERT INTO grados(id,nombre,nivel) VALUES(1,'Primero','Primaria')","INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Periodo prueba','2026-01-01','2026-12-31',1)","INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Matemática','MAT',1)",'INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1)','INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(1,1)',"INSERT INTO matriculas(id,alumno_id,curso_id,grado_id,periodo_academico_id) VALUES(1,1,1,1,1)"])await db.query(sql);
  // La aplicación usa SOLO el pool temporal. Se prueban las guardas de producción.
  require.cache[require.resolve('../dist/config/database')]={exports:{__esModule:true,default:db}};
  Object.assign(process.env,{NODE_ENV:'production',JWT_SECRET:'ab'.repeat(48),CORS_ORIGINS:'https://portal.example.test',UPLOAD_DIRECTORY:storage,TRUST_PROXY:'',ENABLE_DEMO_SEED:'true',MAX_UPLOAD_BYTES:'10485760'});
  const app=require('../dist/app').default;server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
  const call=async(route,method='GET',body,auth=token)=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,body:await r.json()};};
  await t.test('liveness y readiness públicos; login y caché privada',async()=>{
   assert.equal((await call('/api/health')).status,200);assert.equal((await call('/api/ready')).status,200);
   const login=await call('/api/auth/login','POST',{email:'user1@example.test',password:'Synthetic-2026!'});assert.equal(login.status,200);token=login.body.data.token;
   assert.match(login.headers.get('Cache-Control'),/no-store/);assert.equal(login.headers.get('x-powered-by'),null);
  });
  await t.test('rutas inexistentes, seed deshabilitado y JSON inválido devuelven errores JSON',async()=>{
   assert.equal((await call('/api/no-existe')).status,404);assert.equal((await call('/api/seed/users','POST',{})).status,404);
   const invalid=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'});assert.equal(invalid.status,400);assert.equal((await invalid.json()).success,false);
   const oversized=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'x'.repeat(270000)})});assert.equal(oversized.status,413);
  });
  await t.test('CORS permite solo origen exacto y el cliente no impone su IP',async()=>{
   const ok=await fetch(base+'/api/health',{headers:{Origin:'https://portal.example.test'}});assert.equal(ok.headers.get('access-control-allow-origin'),'https://portal.example.test');
   const bad=await fetch(base+'/api/health',{headers:{Origin:'https://portal.example.test.evil'}});assert.equal(bad.status,403);
   const express=require('express');const p=express();p.set('trust proxy',false);p.get('/',(req,res)=>res.json({ip:req.ip}));const s=await new Promise(resolve=>{const listener=p.listen(0,'127.0.0.1',()=>resolve(listener));});try{const r=await fetch('http://127.0.0.1:'+s.address().port,{headers:{'X-Forwarded-For':'203.0.113.9'}});assert.equal((await r.json()).ip,'127.0.0.1');}finally{await new Promise(resolve=>s.close(resolve));}
  });
  await t.test('altas administrativas sin contraseña y datos inválidos no persisten',async()=>{
   for(const route of ['/api/alumnos','/api/profesores','/api/apoderados','/api/users'])assert.equal((await call(route,'POST',{nombre:'Alta',apellido:'Inválida',email:'alta@example.test',rol_id:3})).status,400);
   const r=await call('/api/alumnos','POST',{nombre:'Alta',apellido:'Válida',genero:'Otro'});assert.equal(r.status,201);assert.equal(r.body.data.credentials.email,'alta.valida@cienciaseingenieria.edu');assert.equal(r.body.data.credentials.mustChangePassword,true);
   assert.equal((await call('/api/users/9999','PUT',{nombre:'Ausente'})).status,404);
  });
  await t.test('pagos persisten separados y rechazan duplicados en esquema nuevo',async()=>{
   assert.equal((await call('/api/pagos-matricula','POST',{alumno_id:1,matricula_id:1,monto:100,estado:'pagado',fecha_pago:'2026-10-15'})).status,201);
   const monthly={alumno_id:1,periodo_academico_id:1,mes:'Octubre',año:2026,monto:200};assert.equal((await call('/api/mensualidades','POST',monthly)).status,201);assert.equal((await call('/api/mensualidades','POST',monthly)).status,409);
   assert.equal((await call('/api/sueldos','POST',{profesor_id:1,mes:'Octubre',año:2026,monto_total:500})).status,201);
   const [rows]=await db.query('SELECT estado FROM mensualidades');assert.equal(rows[0].estado,'pendiente');
   assert.equal((await call('/api/matriculas/1','DELETE')).status,409);
  });
  await t.test('subida, descarga privada y archivo conservan bytes; ZIP disfrazado se rechaza',async()=>{
   const send=async(name,content,mime)=>{const form=new FormData();form.append('titulo','Documento prueba');form.append('archivo',new Blob([content],{type:mime}),name);return fetch(base+'/api/documentos/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});};
   const good=await send('test.pdf','%PDF-1.4\nsynthetic','application/pdf');const result=await good.json();assert.equal(good.status,201);documentId=result.data.id;
   assert.equal((await fetch(base+'/api/documentos/'+documentId+'/archivo')).status,401);
   const download=await fetch(base+'/api/documentos/'+documentId+'/archivo',{headers:{Authorization:'Bearer '+token}});assert.equal(download.status,200);assert.equal(await download.text(),'%PDF-1.4\nsynthetic');
   const bad=await send('bad.docx',Buffer.from('PK\x03\x04not-a-docx'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');assert.equal(bad.status,400);
   assert.equal((await call('/api/documentos/'+documentId,'DELETE')).status,200);const [documents]=await db.query('SELECT archivo_url,estado FROM documentos WHERE id=?',[documentId]);assert.equal(documents[0].estado,'archivado');assert.ok(documents[0].archivo_url);assert.equal((await fs.readdir(storage)).length,1);
  });
  await t.test('readiness detecta pérdida de almacenamiento sin filtrar rutas',async()=>{
   process.env.UPLOAD_DIRECTORY=path.join(dir,'missing-volume');try{const result=await call('/api/ready');assert.equal(result.status,503);assert.deepEqual(result.body,{status:'unavailable'});}finally{process.env.UPLOAD_DIRECTORY=storage;}
  });
  await t.test('concurrencia sintética de consultas y bcrypt no produce falsos éxitos ni errores de pool',async()=>{
   const durations=[];for(let batch=0;batch<5;batch++){const results=await Promise.all(Array.from({length:8},async()=>{const start=performance.now();const result=await call('/api/auth/profile');durations.push(performance.now()-start);return result.status;}));assert.ok(results.every(status=>status===200));}
   const logins=await Promise.all(Array.from({length:4},()=>call('/api/auth/login','POST',{email:'user1@example.test',password:'Synthetic-2026!'})));assert.ok(logins.every(r=>r.status===200));durations.sort((a,b)=>a-b);t.diagnostic('40 consultas, concurrencia 8; p95 local '+durations[Math.ceil(durations.length*0.95)-1].toFixed(1)+' ms. 4 logins bcrypt concurrentes. No define capacidad productiva.');
  });
  await new Promise(resolve=>server.close(resolve));server=undefined;
  await t.test('respaldo y restauración recuperan tablas, pagos, vínculos y checksums',async()=>{
   const start=Date.now();const snapshot=path.join(dir,'snapshot');
   await backup({...settings,database:source},storage,snapshot);const result=await restore({...settings,database:target},snapshot,path.join(dir,'recovered'));
   assert.equal(result.verified,true);assert.equal(result.files,1);
   const recovered=await mysql.createConnection({...settings,database:target});try{const [payments]=await recovered.query('SELECT monto,estado FROM pagos_matricula');assert.equal(Number(payments[0].monto),100);assert.equal(payments[0].estado,'pagado');const [monthly]=await recovered.query('SELECT estado FROM mensualidades');assert.equal(monthly[0].estado,'pendiente');assert.equal((await checkSchema(recovered)).compatible,true);}finally{await recovered.end();}
   await fs.appendFile(path.join(snapshot,'database.sql'),'\n--tampered');await assert.rejects(()=>restore({...settings,database:target},snapshot,path.join(dir,'invalid')));
   t.diagnostic('Respaldo + restauración sintética: '+(Date.now()-start)+' ms; no equivale a RTO institucional');
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();
  await admin.query('DROP DATABASE IF EXISTS `'+source+'`');await admin.query('DROP DATABASE IF EXISTS `'+target+'`');await admin.end();
  await fs.rm(dir,{recursive:true,force:true});for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);
 }
});
