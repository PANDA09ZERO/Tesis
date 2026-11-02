const {test}=require('node:test');
const assert=require('node:assert/strict');
const mysql=require('mysql2/promise');
const express=require('express');
const jwt=require('jsonwebtoken');
const fs=require('node:fs/promises');
const path=require('node:path');
const original=require('../dist/config/database').default;

test('perspectiva estudiante: HTTP, identidad y persistencia con esquema real aislado',async t=>{
 const name='estudiante_test_'+Date.now()+'_'+process.pid;
 assert.match(name,/^estudiante_test_\d+_\d+$/);
 const settings={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',charset:'utf8mb4',dateStrings:true};
 const admin=await mysql.createConnection(settings);let db,server;
 const filename=name+'.pdf';const upload=path.resolve(__dirname,'../uploads',filename);
 assert.equal(path.dirname(upload),path.resolve(__dirname,'../uploads'));
 try {
  const [source]=await original.query('SELECT DATABASE() name');assert.match(source[0].name,/^[a-zA-Z0-9_]+$/);
  await admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=mysql.createPool({...settings,database:name});
  for(const table of ['roles','usuarios','profesores','grados','periodos_academicos','cursos','periodo_grados','periodo_grado_cursos','periodo_grado_curso_profesores','profesor_curso','alumnos','matriculas','evaluaciones','calificaciones','asistencias','horarios','pagos_matricula','mensualidades','alertas_academicas','notificaciones','documentos','documentos_historial','documento_categorias','formularios_documentales','formularios_documentales_envios','registro_actividades','eventos_calendario']) await db.query('CREATE TABLE `'+table+'` LIKE `'+source[0].name+'`.`'+table+'`');
  for(const sql of [
   "INSERT INTO roles(id,nombre) VALUES(1,'administrador'),(2,'profesor'),(3,'alumno')",
   "INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(1,'admin@test.local','hash','Admin','Prueba',1),(2,'p@test.local','hash','Profesor','Prueba',2),(11,'a1@test.local','hash','Alumno','Uno',3),(12,'a2@test.local','hash','Alumno','Dos',3),(13,'a3@test.local','hash','Alumno','Sin matrícula',3),(14,'a4@test.local','hash','Cuenta','Sin perfil',3)",
   "INSERT INTO profesores(id,usuario_id) VALUES(1,2)",
   "INSERT INTO grados(id,nombre,nivel,orden) VALUES(1,'Primero','Primaria',1),(2,'Segundo','Primaria',2)",
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Actual','2026-01-01','2026-12-31',1),(2,'Histórico propio','2025-01-01','2025-12-31',0),(3,'Ajeno','2024-01-01','2024-12-31',0),(4,'Solo pagos anteriores','2023-01-01','2023-12-31',0)",
   "INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Compartido','COMP',1),(2,'No inscrito','NO',1)",
   "INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1),(2,1,2,1),(3,2,1,1),(4,1,1,2),(5,3,2,1)",
   "INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(1,1),(2,1),(3,1)",
   "INSERT INTO alumnos(id,usuario_id,codigo_alumno,grado_id,periodo_academico_id) VALUES(1,11,'A1',2,3),(2,12,'A2',1,2),(3,13,'A3',1,1)",
   "INSERT INTO matriculas(id,alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,1,1,1,1,'activa'),(2,2,1,2,1,'activa'),(3,1,1,1,2,'activa'),(4,2,1,2,3,'activa')",
   "INSERT INTO evaluaciones(id,periodo_grado_curso_id,nombre,fecha_evaluacion,nota_maxima,estado) VALUES(1,1,'Propia','2026-10-13',10,'activa'),(2,2,'Ajena','2026-10-13',20,'activa'),(3,3,'Anterior','2025-10-13',20,'cerrada'),(4,4,'No inscrito','2026-10-13',20,'activa')",
   "INSERT INTO calificaciones(id,alumno_id,curso_id,periodo_academico_id,periodo_grado_curso_id,evaluacion_id,nota,fecha_evaluacion) VALUES(1,1,1,1,1,1,9,'2026-10-13'),(2,2,1,1,2,2,19,'2026-10-13'),(3,1,1,2,3,3,15,'2025-10-13'),(4,1,1,1,NULL,NULL,13,'2026-10-01')",
   "INSERT INTO asistencias(id,alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,1,1,'2026-10-13','presente'),(2,2,1,2,'2026-10-13','ausente'),(3,1,1,3,'2025-10-13','tardanza'),(4,1,1,NULL,'2026-10-01','ausente')",
   "INSERT INTO horarios(id,curso_id,profesor_id,periodo_academico_id,periodo_grado_curso_id,dia_semana,hora_inicio,hora_fin) VALUES(1,1,1,1,1,'Lunes','08:00','09:00'),(2,1,1,1,2,'Lunes','09:00','10:00'),(3,1,1,2,3,'Lunes','08:00','09:00'),(4,2,1,1,4,'Martes','08:00','09:00'),(5,1,1,1,NULL,'Martes','09:00','10:00')",
   "INSERT INTO pagos_matricula(id,alumno_id,periodo_academico_id,monto,estado,fecha_pago) VALUES(1,1,1,100,'pagado','2026-10-13'),(2,2,1,150,'pendiente',NULL)",
   "INSERT INTO mensualidades(id,alumno_id,periodo_academico_id,monto,mes,año,estado,fecha_pago) VALUES(1,1,1,200,'Octubre',2026,'pendiente',NULL),(2,2,1,300,'Octubre',2026,'pagado','2026-10-13'),(3,1,2,180,'Octubre',2025,'pagado','2025-10-13'),(4,1,4,160,'Octubre',2023,'pagado','2023-10-13')",
   "INSERT INTO alertas_academicas(id,alumno_id,estado) VALUES(1,1,'activa'),(2,2,'activa')",
   "INSERT INTO notificaciones(id,titulo,mensaje,usuario_id) VALUES(1,'Propia','Aviso',11),(2,'Ajena','Aviso',12)",
   "INSERT INTO documentos(id,titulo,tipo_archivo,usuario_subio,alumno_id) VALUES(1,'Propio','pdf',1,1),(2,'Ajeno','pdf',1,2),(3,'Común','pdf',1,NULL)"
  ])await db.query(sql);
  await fs.mkdir(path.dirname(upload),{recursive:true});await fs.writeFile(upload,'%PDF-1.4\n%%EOF\n',{flag:'wx'});
  await db.query('UPDATE documentos SET archivo_url=? WHERE id IN (1,2,3)',[filename]);
  const fields=JSON.stringify([{id:'nombre',etiqueta:'Nombre',tipo:'texto',requerido:true}]);
  await db.query("INSERT INTO formularios_documentales(id,titulo,campos,estado,creado_por) VALUES(1,'Publicado',?,'publicada',1),(2,'Borrador',?,'borrador',1)",[fields,fields]);
  require.cache[require.resolve('../dist/config/database')].exports.default=db;
  const {encryptPassword,verifyPassword}=require('../dist/utils/encrypt');
  await db.query('UPDATE usuarios SET password_hash=? WHERE id IN (11,12)',[encryptPassword('testOriginal')]);
  process.env.JWT_SECRET='student-test-secret';
  const app=express();app.use(express.json());
  const {authenticate}=require('../dist/middleware/auth');const {limitarEstudiante}=require('../dist/middleware/estudiante');
  app.use('/api',authenticate,limitarEstudiante);
  for(const [prefix,module] of [['estudiante','estudiante'],['auth','auth'],['alumnos','alumnos'],['calificaciones','calificaciones'],['asistencias','asistencias'],['horarios','horarios'],['documentos','documentos'],['alertas','alertas'],['notificaciones','notificaciones'],['dashboard','dashboard'],['cursos','cursos'],['grados','grados'],['mensualidades','mensualidades'],['pagos-matricula','pagosMatricula'],['matriculas','matriculas'],['users','users'],['profesores','profesores'],['periodos','periodos'],['evaluaciones','evaluaciones']])app.use('/api/'+prefix,require('../dist/routes/'+module+'.routes').default);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const {credentialVersion}=require('../dist/utils/session');
  const [accounts]=await db.query('SELECT id,password_hash FROM usuarios');
  const hashes=new Map(accounts.map(u=>[u.id,u.password_hash]));
  const sign=claims=>jwt.sign({...claims,credentialVersion:credentialVersion(hashes.get(claims.userId),process.env.JWT_SECRET)},process.env.JWT_SECRET);
  const tokens={a1:sign({userId:11,rol:'alumno'}),a2:sign({userId:12,rol:'alumno'}),none:sign({userId:13,rol:'alumno'}),missing:sign({userId:14,rol:'alumno'}),teacher:sign({userId:2,rol:'profesor'})};
  async function call(route,method='GET',body,actor='a1'){
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api'+route,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+tokens[actor]}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return {status:response.status,...await response.json()};
  }
  await t.test('identidad de sesión, periodos propios y cache académico ignorado',async()=>{
   const r=await call('/estudiante/contexto?alumno_id=2&usuario_id=12');assert.equal(r.status,200);assert.equal(r.data.alumno.id,1);assert.equal(r.data.alumno.password_hash,undefined);assert.deepEqual(r.data.periodos.map(p=>p.id),[1,2,4]);assert.equal(r.data.matriculas.find(m=>m.periodo_academico_id===1).grado_id,1);
   assert.equal((await call('/estudiante/contexto','GET',undefined,'a2')).data.alumno.id,2);
   assert.equal((await call('/estudiante/contexto','GET',undefined,null)).status,401);
   assert.equal((await call('/estudiante/contexto','GET',undefined,'teacher')).status,403);
   assert.equal((await call('/estudiante/contexto','GET',undefined,'missing')).status,404);
  });
  await t.test('notas y asistencia propias actuales e históricas, sin compañeros',async()=>{
   const r=await call('/estudiante/periodo?periodo_id=1&alumno_id=2');assert.equal(r.status,200);assert.deepEqual(r.data.calificaciones.map(c=>c.id),[4,1]);assert.deepEqual(r.data.asistencias.map(c=>c.id),[1,4]);assert.deepEqual(r.data.cursos.map(c=>c.matricula_id),[1]);assert.equal(r.data.cursos[0].alumnos,undefined);assert.deepEqual(r.data.evaluaciones.map(e=>e.id),[1]);
   const h=(await call('/estudiante/periodo?periodo_id=2')).data;assert.deepEqual(h.calificaciones.map(c=>c.id),[3]);assert.deepEqual(h.asistencias.map(c=>c.id),[3]);
   const second=(await call('/estudiante/periodo?periodo_id=1','GET',undefined,'a2')).data;assert.deepEqual(second.calificaciones.map(c=>c.id),[2]);assert.deepEqual(second.evaluaciones.map(e=>e.id),[2]);
  });
  await t.test('detalle de curso exige matrícula propia y valida periodo',async()=>{
   assert.equal((await call('/estudiante/cursos/1')).status,200);assert.equal((await call('/estudiante/cursos/2')).status,404);
   assert.equal((await call('/estudiante/periodo?periodo_id=3')).status,404);assert.equal((await call('/estudiante/periodo?periodo_id=invalid')).status,400);assert.equal((await call('/estudiante/cursos/0')).status,400);
  });
  await t.test('horarios y calendario por curso, periodo y grado matriculados',async()=>{
   assert.deepEqual((await call('/estudiante/periodo?periodo_id=1')).data.horarios.map(h=>h.id).sort(),[1]);
   assert.deepEqual((await call('/alumnos/1/horario?periodo_id=1')).data.map(h=>h.id).sort(),[1]);assert.equal((await call('/alumnos/2/horario')).status,404);
   const r=await call('/horarios/calendario?fecha_inicio=2026-10-12&fecha_fin=2026-10-18&periodo_id=1');assert.equal(r.status,200);assert.ok(r.data.some(e=>e.tipo==='clase'&&e.periodo_grado_curso_id===1));const [legacy]=await db.query('SELECT id FROM horarios WHERE id=5');assert.equal(legacy.length,1);assert.ok(r.data.some(e=>e.tipo==='evaluacion'&&e.periodo_grado_curso_id===1));assert.ok(r.data.every(e=>e.periodo_grado_curso_id===1));
   assert.deepEqual((await call('/estudiante/periodo?periodo_id=1','GET',undefined,'a2')).data.horarios.map(h=>h.id),[2]);
  });
  await t.test('matrícula pagada y mensualidad pendiente independientes; historia sin matrícula',async()=>{
   const d=(await call('/estudiante/periodo?periodo_id=1')).data;assert.equal(d.pago_matricula.estado,'pagado');assert.equal(Number(d.pago_matricula.monto),100);assert.equal(d.mensualidades.length,1);assert.equal(d.mensualidades[0].estado,'pendiente');assert.equal(Number(d.mensualidades[0].monto),200);
   const b=(await call('/estudiante/periodo?periodo_id=1','GET',undefined,'a2')).data;assert.equal(b.pago_matricula.estado,'pendiente');assert.equal(b.mensualidades[0].estado,'pagado');assert.equal(b.cursos.length,1);
   const old=(await call('/estudiante/periodo?periodo_id=4')).data;assert.deepEqual(old.cursos,[]);assert.equal(old.mensualidades[0].año,2023);
  });
  await t.test('alumno sin matrícula: vacíos legítimos sin datos escolares',async()=>{
   const c=await call('/estudiante/contexto','GET',undefined,'none');assert.deepEqual(c.data.periodos,[]);assert.deepEqual(c.data.matriculas,[]);
   const r=await call('/estudiante/periodo','GET',undefined,'none');assert.equal(r.status,200);assert.equal(r.data.periodo,null);for(const key of ['cursos','calificaciones','asistencias','horarios','mensualidades'])assert.deepEqual(r.data[key],[]);
   assert.equal((await call('/estudiante/periodo?periodo_id=1','GET',undefined,'none')).status,404);
  });
  await t.test('alertas y notificaciones propias; IDs ajenos no se modifican',async()=>{
   assert.deepEqual((await call('/alertas')).data.map(a=>a.id),[1]);assert.equal(Number((await call('/alertas/estadisticas')).data.total),1);assert.equal((await call('/alertas/1/estado','PUT',{estado:'resuelta'})).status,403);
   assert.deepEqual((await call('/notificaciones')).data.map(n=>n.id),[1]);assert.equal((await call('/notificaciones/2')).status,404);assert.equal((await call('/notificaciones/2/marcar-leida','PUT',{})).status,404);assert.equal((await call('/notificaciones/2','DELETE')).status,404);
   assert.equal((await call('/notificaciones/1/marcar-leida','PUT',{})).status,200);const [n]=await db.query('SELECT leida FROM notificaciones WHERE id=1');assert.equal(n[0].leida,1);
  });
  await t.test('documentos propios y comunes, descarga autenticada y archivo ajeno bloqueado',async()=>{
   assert.deepEqual((await call('/documentos')).data.map(d=>d.id).sort(),[1,3]);assert.equal((await call('/documentos/2')).status,404);assert.equal((await call('/documentos/2/archivo')).status,404);
   const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/documentos/1/archivo',{headers:{Authorization:'Bearer '+tokens.a1}});assert.equal(res.status,200);assert.ok((await res.text()).startsWith('%PDF-'));assert.equal((await call('/documentos/1/archivo','GET',undefined,null)).status,401);
  });
  await t.test('formularios publicados: validación, asociación propia y persistencia',async()=>{
   assert.equal((await call('/documentos/formularios/2')).status,404);assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{}})).status,400);assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{nombre:'Prueba'},alumno_id:2})).status,404);
   assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{nombre:'Uno'}})).status,201);assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{nombre:'Dos'}},'a2')).status,201);
   const [rows]=await db.query('SELECT usuario_id,alumno_id FROM formularios_documentales_envios ORDER BY id');assert.deepEqual(rows.map(r=>[r.usuario_id,r.alumno_id]),[[11,1],[12,2]]);assert.equal((await call('/documentos/formularios/1/envios')).data.length,1);
  });
  await t.test('contraseña: errores de validación y modificación exclusiva de sesión',async()=>{
   assert.equal((await call('/auth/change-password','PUT',{currentPassword:'incorrecta',newPassword:'testNueva'})).status,400);assert.equal((await call('/auth/change-password','PUT',{currentPassword:'testOriginal',newPassword:'123'})).status,400);
   assert.equal((await call('/auth/change-password','PUT',{currentPassword:'testOriginal',newPassword:'testNueva',userId:12})).status,200);const [rows]=await db.query('SELECT id,password_hash FROM usuarios WHERE id IN (11,12) ORDER BY id');assert.ok(verifyPassword('testNueva',rows[0].password_hash));assert.ok(verifyPassword('testOriginal',rows[1].password_hash));
   assert.equal((await call('/auth/profile')).status,401);hashes.set(11,rows[0].password_hash);tokens.a1=sign({userId:11,rol:'alumno'});
  });
  await t.test('rutas administrativas, listados globales y escritura académica denegados',async()=>{
   for(const [route,method] of [['/dashboard/stats','GET'],['/cursos','GET'],['/cursos/1','GET'],['/grados','GET'],['/alumnos','GET'],['/users','GET'],['/profesores','GET'],['/horarios','GET'],['/periodos','GET'],['/mensualidades','GET'],['/pagos-matricula','GET'],['/matriculas','GET'],['/calificaciones/curso/1','GET'],['/calificaciones','POST'],['/asistencias','POST'],['/evaluaciones/oferta/1','POST'],['/mensualidades/1','PUT'],['/pagos-matricula/1','PUT'],['/documentos/1','PUT'],['/documentos/1','DELETE'],['/documentos/upload','POST'],['/notificaciones','POST']]) assert.equal((await call(route,method,method==='GET'?undefined:{})).status,403,route);
   assert.equal((await call('/alumnos/2')).status,404);assert.equal((await call('/calificaciones/alumno/2')).status,404);assert.equal((await call('/asistencias/alumno/2')).status,404);
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await fs.unlink(upload).catch(e=>{if(e.code!=='ENOENT')throw e;});await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();await original.end();
 }
});
