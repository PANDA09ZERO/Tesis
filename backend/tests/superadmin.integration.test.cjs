'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),mysql=require('mysql2/promise'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {databaseSettings}=require('../dist/config/environment');const {install}=require('../scripts/database.cjs');const {provision:provisionAccount}=require('../scripts/bootstrap-superadmin.cjs');
async function provision(db,action,body){const connection=await db.getConnection();try{return await provisionAccount(connection,action,body);}finally{connection.release();}}
test('superadministración: cuenta protegida, suspensión persistente, respaldo y recuperación real aislada',async t=>{
 const initial=databaseSettings(),suffix=Date.now()+'_'+process.pid,source='super_test_'+suffix,target='super_restore_'+suffix;
 assert.match(source,/^super_test_\d+_\d+$/);assert.match(target,/^super_restore_\d+_\d+$/);
 const admin=await mysql.createConnection({...initial,database:undefined}),original=require('../dist/config/database').default;
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-super-test-')),uploads=path.join(directory,'uploads'),operations=path.join(directory,'operations'),recovery=path.join(directory,'recovery');
 const previous={...process.env};let db,server,superToken,adminToken,id,backupId;
 try{
  await fs.mkdir(uploads);await admin.query('CREATE DATABASE `'+source+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await admin.query('CREATE DATABASE `'+target+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=mysql.createPool({...initial,database:source});await install(db);
  Object.assign(process.env,{NODE_ENV:'test',DB_NAME:source,JWT_SECRET:'super-test-secret',UPLOAD_DIRECTORY:uploads,OPERATIONS_DIRECTORY:operations,OPERATIONS_SINGLE_INSTANCE:'true',RECOVERY_DB_NAME:target,RECOVERY_UPLOAD_DIRECTORY:recovery});
  require.cache[require.resolve('../dist/config/database')].exports.default=db;
  const hash=await require('../dist/utils/encrypt').encryptPasswordAsync('Ordinary-test-2026!');
  await db.query("INSERT INTO usuarios(email,password_hash,nombre,apellido,rol_id) VALUES('admin@example.test',?,'Administrador','Prueba',1)",[hash]);
  const body={email:'owner@example.test',password:'Super-test-2026!',nombre:'Propietario',apellido:'Prueba'};
  await t.test('consola crea una sola cuenta sin valores predeterminados y audita',async()=>{
   await assert.rejects(()=>provision(db,'create',{...body,password:'short'}));await provision(db,'prepare',body);
   const [prepared]=await db.query('SELECT activo FROM usuarios WHERE email=?',[body.email]);assert.equal(prepared[0].activo,0);await provision(db,'activate',body);
   await assert.rejects(()=>provision(db,'create',{...body,email:'second@example.test'}));
   const [rows]=await db.query("SELECT u.id,r.nombre rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE email=?",[body.email]);id=rows[0].id;assert.equal(rows[0].rol,'superadministrador');
  });
  server=await new Promise(resolve=>{const s=require('../dist/app').default.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port+'/api';
  async function call(route,method='GET',data,token=superToken){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});if(response.headers.get('content-type')?.includes('application/json'))return {...await response.json(),status:response.status};return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};}
  const credentials={password:body.password};
  await t.test('login normal y perfil conservan el rol real',async()=>{const login=await call('/auth/login','POST',{email:body.email,password:body.password},null);assert.equal(login.status,200);superToken=login.data.token;assert.equal(login.data.user.rol,'superadministrador');assert.equal((await call('/auth/profile')).data.rol,'superadministrador');const adminLogin=await call('/auth/login','POST',{email:'admin@example.test',password:'Ordinary-test-2026!'},null);adminToken=adminLogin.data.token;});
  await t.test('otros usuarios no acceden al panel; supercuenta ausente en listas, total, IDs y modificaciones',async()=>{
   assert.equal((await call('/superadministracion/estado','GET',undefined,adminToken)).status,403);
   for(const token of [adminToken,superToken]){const list=await call('/users?limit=100','GET',undefined,token);assert.equal(list.status,200);assert.equal(list.data.some(u=>u.id===id),false);assert.equal(list.total,1);for(const [method,data]of [['GET',null],['PUT',{activo:0}],['DELETE',null]])assert.equal((await call('/users/'+id,method,data,token)).status,404);}
   assert.equal((await call('/users','POST',{nombre:'Prueba',apellido:'Escalada',email:'bad@example.test',password:'Some-test-2026!',rol_id:5},adminToken)).status,400);
  });
  await t.test('validación, reautenticación y copia sin mantenimiento',async()=>{
   assert.equal((await call('/superadministracion/suspension','PUT',{suspended:'true',...credentials})).status,400);
   assert.equal((await call('/superadministracion/suspension','PUT',{suspended:true,password:'incorrecta'})).status,403);
   assert.equal((await call('/superadministracion/respaldos','POST',credentials)).status,503);assert.deepEqual((await call('/superadministracion/respaldos')).data,[]);
  });
  await t.test('suspensión bloquea sesiones abiertas, login y escrituras; superadministrador puede consultar y recuperar',async()=>{
   assert.equal((await call('/superadministracion/suspension','PUT',{suspended:true,...credentials})).status,200);
   assert.equal((await call('/users','GET',undefined,adminToken)).status,503);assert.equal((await call('/users/1','PUT',{nombre:'Bloqueado'},adminToken)).status,503);
   assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'Ordinary-test-2026!'},null)).status,503);
   assert.equal((await call('/auth/login','POST',{email:body.email,password:body.password},null)).status,200);
   assert.equal((await call('/users')).status,200);assert.equal((await call('/health','GET',undefined,null)).status,200);
   const lines=(await fs.readFile(path.join(operations,'suspension.jsonl'),'utf8')).trim().split('\n');assert.equal(JSON.parse(lines[lines.length-1]).suspended,true);
   const [rows]=await db.query('SELECT nombre FROM usuarios WHERE id=1');assert.equal(rows[0].nombre,'Administrador');
  });
  await t.test('copias bloqueadas para despliegue no confirmado; lock excluye operaciones concurrentes',async()=>{
   process.env.OPERATIONS_SINGLE_INSTANCE='false';assert.equal((await call('/superadministracion/respaldos','POST',credentials)).status,503);process.env.OPERATIONS_SINGLE_INSTANCE='true';
   const release=await require('../dist/utils/operations').operationLock();try{const [before]=await db.query('SELECT COUNT(*) total FROM registro_actividades');assert.equal((await call('/superadministracion/suspension','PUT',{suspended:false,...credentials})).status,409);assert.equal((await call('/superadministracion/respaldos','POST',{password:'incorrecta'})).status,409);const [after]=await db.query('SELECT COUNT(*) total FROM registro_actividades');assert.equal(after[0].total,before[0].total);assert.equal((await call('/users')).status,503);}finally{await release();}
  });
  await t.test('respaldo real incluye base y archivos, sin mostrarse públicamente',async()=>{
   await fs.writeFile(path.join(uploads,'synthetic.pdf'),Buffer.from('%PDF-1.4 synthetic'));
   await db.query("INSERT INTO documentos(titulo,tipo_archivo,archivo_url,usuario_subio) VALUES('Sintético','pdf','synthetic.pdf',1)");
   const created=await call('/superadministracion/respaldos','POST',credentials);assert.equal(created.status,200);backupId=created.data.id;
   const list=await call('/superadministracion/respaldos');assert.equal(list.data.length,1);assert.equal(list.data[0].files,1);assert.equal('sourceDatabase' in list.data[0],false);
   assert.equal((await call('/superadministracion/respaldos/'+backupId+'/descargar','POST',{password:'incorrecta'})).status,403);
   const download=await call('/superadministracion/respaldos/'+backupId+'/descargar','POST',credentials);assert.equal(download.status,200);assert.equal(download.bytes[0],0x1f);assert.equal(download.bytes[1],0x8b);
   assert.equal((await call('/superadministracion/respaldos/not-an-id/descargar','POST',credentials)).status,400);
  });
  await t.test('recuperación verificada en destino aislado; no sobrescribe origen ni destino ocupado',async()=>{
   const route='/superadministracion/respaldos/'+backupId+'/recuperar',request={...credentials,confirmation:'RECUPERAR EN DESTINO AISLADO'};
   assert.equal((await call(route,'POST',credentials)).status,400);
   process.env.RECOVERY_DB_NAME=source;assert.equal((await call(route,'POST',request)).status,503);process.env.RECOVERY_DB_NAME=target;
   assert.equal((await call(route,'POST',request)).data.verified,true);assert.equal(await fs.readFile(path.join(recovery,'synthetic.pdf'),'utf8'),'%PDF-1.4 synthetic');
   assert.equal((await call(route,'POST',request)).status,503);assert.equal((await call('/superadministracion/estado')).data.suspended,true);
  });
  await t.test('reactivar restaura acceso y la auditoría conserva actor y resultado',async()=>{
   assert.equal((await call('/superadministracion/suspension','PUT',{suspended:false,...credentials})).status,200);assert.equal((await call('/users','GET',undefined,adminToken)).status,200);
   const events=(await call('/superadministracion/auditoria')).data;assert.ok(events.some(e=>e.accion==='crear_respaldo_completada'&&e.usuario_id===id));assert.ok(events.some(e=>e.accion==='recuperar_respaldo_completada'));assert.ok(events.some(e=>e.accion==='reactivar_sistema_completada'));
  });
  await t.test('desactivación y restablecimiento por consola revocan sesiones sin exponer la cuenta',async()=>{
   assert.equal((await call('/auth/change-password','PUT',{currentPassword:body.password,newPassword:'short123'})).status,400);
   await provision(db,'deactivate',{email:body.email});assert.equal((await call('/auth/profile')).status,401);await provision(db,'activate',body);
   assert.equal((await call('/auth/profile')).status,401);
   await provision(db,'reset-password',{email:body.email,password:'Changed-super-2026!'});assert.equal((await call('/auth/profile')).status,401);
   assert.equal((await call('/auth/login','POST',{email:body.email,password:body.password},null)).status,401);
   assert.equal((await call('/auth/login','POST',{email:body.email,password:'Changed-super-2026!'},null)).status,200);
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.query('DROP DATABASE IF EXISTS `'+target+'`');await admin.query('DROP DATABASE IF EXISTS `'+source+'`');await admin.end();await original.end();
  for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);
  assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(directory,{recursive:true,force:true});
 }
});
