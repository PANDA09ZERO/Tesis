const {test}=require('node:test');
const assert=require('node:assert/strict');
const mysql=require('mysql2/promise');
const express=require('express');
const jwt=require('jsonwebtoken');
const original=require('../dist/config/database').default;

test('perspectiva de profesores: HTTP con esquema MySQL real aislado',async t=>{
 const name='profesor_test_'+Date.now()+'_'+process.pid;
 assert.match(name,/^profesor_test_\d+_\d+$/);
 const settings={host:process.env.DB_HOST || 'localhost',port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',charset:'utf8mb4',dateStrings:true};
 const admin=await mysql.createConnection(settings);
 let db,server;
 try {
  const [source]=await original.query('SELECT DATABASE() name');const sourceName=source[0].name;
  assert.match(sourceName,/^[a-zA-Z0-9_]+$/);
  await admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=mysql.createPool({...settings,database:name});
  // LIKE conserva columnas, índices y CHECK reales; las filas reales nunca se copian.
  for(const table of ['roles','usuarios','profesores','grados','periodos_academicos','cursos','periodo_grados','periodo_grado_cursos','periodo_grado_curso_profesores','profesor_curso','alumnos','matriculas','evaluaciones','horarios','calificaciones','asistencias','apoderados','apoderado_alumno','alertas_academicas','documentos','documentos_historial','documento_categorias','notificaciones','registro_actividades','pagos_matricula','eventos_calendario']) {
   await db.query('CREATE TABLE `'+table+'` LIKE `'+sourceName+'`.`'+table+'`');
  }
  for(const sql of [
   "INSERT INTO roles(id,nombre) VALUES(1,'administrador'),(2,'profesor'),(3,'alumno'),(4,'apoderado')",
   "INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(1,'admin@test.local','hash','Admin','Prueba',1),(2,'p1@test.local','hash','Profesor','Uno',2),(3,'p2@test.local','hash','Profesor','Dos',2),(4,'p3@test.local','hash','Profesor','Sin asignación',2),(21,'apo1@test.local','hash','Apoderado','Uno',4),(22,'apo2@test.local','hash','Apoderado','Dos',4)",
   "INSERT INTO profesores(id,usuario_id) VALUES(1,2),(2,3),(3,4)",
   "INSERT INTO grados(id,nombre,nivel,orden) VALUES(1,'Primero','Primaria',1),(2,'Segundo','Primaria',2)",
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Actual','2026-01-01','2026-12-31',1),(2,'Histórico','2025-01-01','2025-12-31',0)",
   "INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Curso compartido','COMP',1),(2,'Manual','MAN',1)",
   "INSERT INTO periodo_grados(periodo_academico_id,grado_id) VALUES(1,1),(1,2),(2,1),(2,2)",
   "INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1),(2,1,2,1),(3,2,1,1),(4,2,2,1),(5,1,1,2)",
   "INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(1,1),(2,2),(3,2),(4,1)",
   "INSERT INTO profesor_curso(profesor_id,curso_id,origen) VALUES(1,2,'manual'),(1,1,'configuracion'),(2,1,'configuracion')",
   "INSERT INTO evaluaciones(id,periodo_grado_curso_id,nombre,fecha_evaluacion,nota_maxima,estado) VALUES(1,1,'Escala diez','2026-10-07',10,'activa'),(2,1,'Cerrada','2026-10-01',20,'cerrada'),(3,2,'Otra asignación','2026-10-07',20,'activa'),(4,4,'Histórico','2025-10-07',20,'activa')",
   "INSERT INTO apoderados(id,usuario_id) VALUES(1,21),(2,22)",
   "INSERT INTO documentos(id,titulo,tipo_archivo,usuario_subio,profesor_id) VALUES(1,'Propio','pdf',2,1),(2,'Ajeno','pdf',3,2),(3,'Común','pdf',1,NULL)",
   "INSERT INTO horarios(id,curso_id,profesor_id,periodo_academico_id,periodo_grado_curso_id,dia_semana,hora_inicio,hora_fin) VALUES(1,1,1,1,1,'Lunes','08:00','09:00'),(2,1,2,1,2,'Lunes','09:00','10:00'),(3,1,1,2,4,'Lunes','08:00','09:00'),(4,2,1,1,NULL,'Martes','08:00','09:00')",
   "INSERT INTO notificaciones(id,titulo,mensaje,usuario_id) VALUES(1,'Propia','Aviso',2),(2,'Ajena','Aviso',3)"
  ])await db.query(sql);
  await db.query("INSERT INTO registro_actividades(usuario_id,accion) VALUES(2,'Propia'),(3,'Ajena')");
  for(let id=1;id<=7;id++) {
   await db.query('INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(?,?,?,?,?,3)',[id+10,'a'+id+'@test.local','hash','Alumno',String(id)]);
   // Los caches de alumno son distintos: la autorización debe usar la matrícula.
   await db.query('INSERT INTO alumnos(id,usuario_id,codigo_alumno,grado_id,periodo_academico_id) VALUES(?,?,?,?,1)',[id,id+10,'A'+id,id===1?2:1]);
  }
  for(const sql of [
   "INSERT INTO matriculas(alumno_id,curso_id,periodo_academico_id,grado_id,estado) VALUES(1,1,1,1,'activa'),(2,1,1,2,'activa'),(3,1,2,1,'activa'),(4,1,2,2,'activa'),(5,2,1,1,'activa'),(7,1,1,1,'cancelada'),(1,1,2,1,'activa')",
   "INSERT INTO calificaciones(id,alumno_id,curso_id,periodo_academico_id,periodo_grado_curso_id,nota,fecha_evaluacion,evaluacion_id) VALUES(1,1,1,1,1,9,'2026-10-07',1),(2,2,1,1,2,19,'2026-10-07',3),(3,3,1,2,3,8,'2025-10-07',NULL),(4,4,1,2,4,15,'2025-10-07',4),(5,1,1,2,3,7,'2025-10-07',NULL),(6,1,1,1,NULL,13,'2026-10-01',NULL),(7,2,1,1,NULL,18,'2026-10-01',NULL),(8,1,1,1,1,12,'2026-10-01',2)",
   "INSERT INTO asistencias(id,alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,1,1,'2026-10-07','presente'),(2,2,1,2,'2026-10-07','ausente'),(3,4,1,4,'2025-10-07','presente'),(4,1,1,NULL,'2025-10-07','ausente'),(5,1,1,NULL,'2026-10-06','presente')",
   "INSERT INTO alertas_academicas(id,alumno_id,estado) VALUES(1,1,'activa'),(2,2,'activa'),(3,6,'activa')",
   "INSERT INTO apoderado_alumno(apoderado_id,alumno_id,parentesco) VALUES(1,1,'Padre'),(1,2,'Padre'),(2,5,'Madre')",
  ])await db.query(sql);
  require.cache[require.resolve('../dist/config/database')].exports.default=db;
  process.env.JWT_SECRET='teacher-test-secret';
  const app=express();app.use(express.json());
  for(const [path,module] of [['configuracion','configuracion'],['cursos','cursos'],['alumnos','alumnos'],['profesores','profesores'],['periodos','periodos'],['grados','grados'],['calificaciones','calificaciones'],['asistencias','asistencias'],['evaluaciones','evaluaciones'],['dashboard','dashboard'],['alertas','alertas'],['documentos','documentos'],['notificaciones','notificaciones'],['horarios','horarios'],['matriculas','matriculas'],['usuarios','users'],['mensualidades','mensualidades'],['sueldos','sueldos'],['pagos-matricula','pagosMatricula']]) app.use('/'+path,require('../dist/routes/'+module+'.routes').default);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const {credentialVersion}=require('../dist/utils/session');
  const [accounts]=await db.query('SELECT id,password_hash FROM usuarios');
  const hashes=new Map(accounts.map(u=>[u.id,u.password_hash]));
  const sign=claims=>jwt.sign({...claims,credentialVersion:credentialVersion(hashes.get(claims.userId),process.env.JWT_SECRET)},process.env.JWT_SECRET);
  const tokens={p1:sign({userId:2,rol:'profesor'}),p2:sign({userId:3,rol:'profesor'}),none:sign({userId:4,rol:'profesor'}),admin:sign({userId:1,rol:'administrador'})};
  async function call(path,method='GET',body,actor='p1') {
   const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens[actor]},...(body?{body:JSON.stringify(body)}:{})});
   return {status:response.status,...await response.json()};
  }
  await t.test('perfil personal usa la sesión sin exponer contraseña ni sueldo',async()=>{
   const own=await call('/profesores/me/perfil?usuario_id=3&profesor_id=2');assert.equal(own.status,200);assert.equal(own.data.id,1);assert.equal(own.data.email,'p1@test.local');assert.equal(own.data.password_hash,undefined);assert.equal(own.data.salario_base,undefined);
   assert.equal((await call('/profesores/me/perfil','GET',undefined,'p2')).data.id,2);
   assert.equal((await call('/profesores/me/perfil','GET',undefined,'admin')).status,403);
  });
  await t.test('panel selecciona exclusivamente periodos propios y conserva históricos',async()=>{
   const own=await call('/profesores/me/resumen');assert.equal(own.status,200);assert.equal(own.data.periodo.id,1);assert.equal(Number(own.data.totalAlumnos),1);assert.equal(Number(own.data.totalCursos),1);assert.equal(Number(own.data.alertasActivas),1);
   const historic=await call('/profesores/me/resumen?periodo_id=2');assert.equal(historic.status,200);assert.equal(historic.data.periodo.activo,0);assert.equal(Number(historic.data.totalAlumnos),1);assert.equal(Number(historic.data.totalCursos),1);
   assert.equal((await call('/profesores/me/resumen?periodo_id=999')).status,404);assert.equal((await call('/profesores/me/resumen?periodo_id=invalid')).status,400);assert.equal((await call('/profesores/me/resumen?periodo_id=1&periodo_id=2')).status,400);
   const empty=await call('/profesores/me/resumen','GET',undefined,'none');assert.equal(empty.status,200);assert.deepEqual(empty.data.periodos,[]);assert.equal(empty.data.periodo,null);assert.equal(empty.data.totalAlumnos,0);assert.deepEqual(empty.data.evaluaciones,[]);
  });
  await t.test('próximas evaluaciones aisladas por grupo aun compartiendo curso',async()=>{
   await db.query("INSERT INTO evaluaciones(id,periodo_grado_curso_id,nombre,fecha_evaluacion,nota_maxima,estado) VALUES(5,1,'Próxima propia',DATE_ADD(CURDATE(),INTERVAL 1 DAY),20,'activa'),(6,2,'Próxima ajena',DATE_ADD(CURDATE(),INTERVAL 1 DAY),20,'activa'),(7,1,'Próxima cerrada',DATE_ADD(CURDATE(),INTERVAL 1 DAY),20,'cerrada')");
   assert.deepEqual((await call('/profesores/me/resumen')).data.evaluaciones.map(e=>e.id),[5]);assert.deepEqual((await call('/profesores/me/resumen','GET',undefined,'p2')).data.evaluaciones.map(e=>e.id),[6]);
   await db.query('DELETE FROM evaluaciones WHERE id IN(5,6,7)');
  });
  await t.test('evaluaciones validan tipos y notas repetidas actualizan una única fila',async()=>{
   const valid={nombre:'Prueba nueva',tipo:'practica',fecha_evaluacion:'2026-10-14',nota_maxima:10};
   for(const body of [{...valid,nombre:{}},{...valid,tipo:[]},{...valid,nota_maxima:true},{...valid,nota_maxima:''},{...valid,fecha_evaluacion:'2026-02-30'},{...valid,nota_maxima:21},{...valid,nota_maxima:0.001},{...valid,nota_maxima:10.123}])assert.equal((await call('/evaluaciones/oferta/1','POST',body)).status,400);
   const created=await call('/evaluaciones/oferta/1','POST',valid);assert.equal(created.status,201);
   const path='/calificaciones/oferta/1/evaluacion/'+created.data.id+'/bulk';
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:7}]})).status,200);assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:8}]})).status,200);
   const [rows]=await db.query('SELECT nota FROM calificaciones WHERE alumno_id=1 AND evaluacion_id=?',[created.data.id]);assert.equal(rows.length,1);assert.equal(Number(rows[0].nota),8);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:7},{alumno_id:1,nota:8}]})).status,400);
   await db.query('DELETE FROM calificaciones WHERE evaluacion_id=?',[created.data.id]);await db.query('DELETE FROM evaluaciones WHERE id=?',[created.data.id]);
  });
  await t.test('ofertas aisladas aun compartiendo curso y grado de catálogo',async()=>{
   assert.deepEqual((await call('/configuracion/ofertas')).data.map(o=>o.periodo_grado_curso_id).sort(),[1]);
   assert.deepEqual((await call('/configuracion/ofertas', 'GET',undefined,'p2')).data.map(o=>o.periodo_grado_curso_id),[2]);
   assert.equal((await call('/configuracion/ofertas/2')).status,404);
   assert.equal((await call('/configuracion/ofertas/1','GET',undefined,'p2')).status,404);
   const o=(await call('/configuracion/ofertas/1')).data;assert.equal(o.fecha_inicio,'2026-01-01');assert.deepEqual(o.alumnos.map(a=>a.alumno_id),[1]);
   const historical=await call('/configuracion/ofertas?periodo_id=2');assert.deepEqual(historical.data.map(o=>o.periodo_grado_curso_id),[4]);
  });
  await t.test('estructuras, grados y periodos consultados según alcance',async()=>{
   const e=(await call('/configuracion/periodos/1')).data;assert.equal(e.grados.length,1);assert.equal(e.grados[0].grado_id,1);assert.equal(e.resumen.cursos,1);
   assert.deepEqual((await call('/configuracion/periodos/1/grados/2/cursos')).data,[]);
   assert.deepEqual((await call('/grados','GET',undefined,'p2')).data.map(g=>g.id),[1,2]);
   assert.deepEqual((await call('/periodos','GET',undefined,'none')).data,[]);
  });
  await t.test('alumnos y apoderados provienen de matrícula, no cache de grado',async()=>{
   const mine=(await call('/alumnos')).data;assert.deepEqual(mine.map(a=>a.id).sort(),[1]);assert.equal(mine.find(a=>a.id===1).grado,'Primero');assert.deepEqual((await call('/alumnos?grado_id=1')).data.map(a=>a.id).sort(),[1]);
   assert.deepEqual((await call('/alumnos','GET',undefined,'p2')).data.map(a=>a.id),[2]);
   assert.equal((await call('/alumnos/2')).status,404);assert.equal((await call('/alumnos/6')).status,404);
   const detail=(await call('/alumnos/1')).data;assert.ok(detail.calificaciones.every(c=>[1,6,8].includes(c.id)));assert.equal(detail.resumenAsistencia.total,2);
   const parents=(await call('/profesores/me/apoderados')).data;assert.deepEqual(parents.map(a=>a.alumno_id).sort(),[1]);assert.equal(parents.find(a=>a.alumno_id===1).grado,'Primero');
   const old=await call('/alumnos/4?periodo_id=2');assert.equal(old.status,200);assert.equal(old.data.resumenAsistencia.total,1);assert.ok(old.data.matriculas_academicas.every(m=>m.periodo_academico_id===2));
   assert.deepEqual((await call('/alumnos?periodo_id=2')).data.map(a=>a.id),[4]);
  });
  await t.test('catálogo antiguo no permite obtener alumnos ajenos',async()=>{
   const result=await call('/cursos/1');assert.equal(result.status,200);assert.deepEqual(result.data.alumnos.map(a=>a.alumno_id),[1]);
   assert.equal((await call('/cursos/2','GET',undefined,'p2')).status,404);
  });
  await t.test('dashboard y alertas usan el mismo alcance y excluyen no matriculados',async()=>{
   const result=await call('/dashboard/stats');assert.equal(result.status,200);assert.equal(Number(result.data.totalAlumnos),1);assert.equal(Number(result.data.totalCursos),1);assert.equal(Number(result.data.alertasActivas),1);
   assert.equal((await call('/dashboard/rendimiento')).data[0].grado,'Primero');
   assert.ok((await call('/dashboard/asistencia-reciente')).data.every(a=>Number(a.ausentes)===0));
   assert.ok((await call('/dashboard/actividad-reciente')).data.every(a=>a.usuario_id===2));
   assert.deepEqual((await call('/alertas')).data.map(a=>a.id),[1]);assert.equal(Number((await call('/alertas/estadisticas')).data.total),1);
   assert.equal((await call('/alertas/2/estado','PUT',{estado:'resuelta'})).status,404);
   assert.equal((await call('/alertas/1/estado','PUT',{estado:'incorrecto'})).status,400);
  });
  await t.test('notas de oferta: registro, actualización, evaluación y matrícula exacta',async()=>{
   const path='/calificaciones/oferta/1/evaluacion/1/bulk';
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:8}]})).status,200);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:2,nota:8}]})).status,403);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:7,nota:8}]})).status,403);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:11}]})).status,400);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:null}]})).status,400);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:1.234}]})).status,400);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:true,nota:8}]})).status,400);
   assert.equal((await call(path,'POST',{calificaciones:[{alumno_id:1,nota:8,observaciones:{}}]})).status,400);
   assert.equal((await call('/calificaciones/oferta/1/evaluacion/3/bulk','POST',{calificaciones:[{alumno_id:1,nota:8}]})).status,404);
   assert.equal((await call('/calificaciones/oferta/1/evaluacion/2/bulk','POST',{calificaciones:[{alumno_id:1,nota:8}]})).status,409);
   assert.equal((await call('/calificaciones/8','PUT',{nota:8})).status,409);
   assert.equal((await call('/calificaciones/2','PUT',{nota:8})).status,403);
   const [rows]=await db.query('SELECT nota FROM calificaciones WHERE id=1');assert.equal(Number(rows[0].nota),8);
  });
  await t.test('consulta y escritura heredadas conservan aislamiento',async()=>{
   const notes=await call('/calificaciones/curso/1?periodo_id=1');assert.equal(notes.status,200);assert.ok(notes.data.calificaciones.every(c=>c.alumno_id===1));
   const good={alumno_id:1,curso_id:1,periodo_academico_id:1,nota:14,fecha_evaluacion:'2026-10-07'};
   assert.equal((await call('/calificaciones','POST',good)).status,201);
   assert.equal((await call('/calificaciones','POST',{...good,alumno_id:2})).status,403);
   assert.equal((await call('/calificaciones','POST',{...good,nota:-1})).status,400);
   const [before]=await db.query('SELECT COUNT(*) n FROM calificaciones');
   assert.equal((await call('/calificaciones/bulk','POST',{calificaciones:[good,{...good,alumno_id:2}]})).status,403);
   const [after]=await db.query('SELECT COUNT(*) n FROM calificaciones');assert.equal(after[0].n,before[0].n);
  });
  await t.test('asistencia: fecha, estado, alumno exacto y persistencia',async()=>{
   const path='/asistencias/oferta/1/bulk';const valid={fecha:'2026-10-08',asistencias:[{alumno_id:1,estado:'tardanza',minutos_tardanza:5}]};
   assert.equal((await call(path,'POST',valid)).status,200);
   assert.equal((await call(path,'POST',{...valid,asistencias:[{alumno_id:2,estado:'presente'}]})).status,403);
   assert.equal((await call(path,'POST',{...valid,fecha:'2025-10-08'})).status,400);
   assert.equal((await call(path,'POST',{...valid,asistencias:[{alumno_id:1,estado:'tardanza',minutos_tardanza:0}]})).status,400);
   const result=await call('/asistencias/oferta/1?fecha=2026-10-08');assert.equal(result.data.asistencias[0].estado,'tardanza');
   assert.equal((await call('/asistencias/oferta/2?fecha=2026-10-08')).status,404);
   const historic=await call('/asistencias/alumno/1');assert.ok(historic.data.asistencias.every(a=>a.fecha.startsWith('2026')));
  });
  await t.test('periodo histórico de solo consulta por todas las rutas de escritura',async()=>{
   assert.equal((await call('/calificaciones/oferta/4/libro')).status,200);
   assert.equal((await call('/asistencias/oferta/4/historial')).status,200);
   assert.equal((await call('/calificaciones/oferta/4/evaluacion/4/bulk','POST',{calificaciones:[{alumno_id:4,nota:16}]})).status,409);
   assert.equal((await call('/asistencias/oferta/4/bulk','POST',{fecha:'2025-10-08',asistencias:[{alumno_id:4,estado:'presente'}]})).status,409);
   assert.equal((await call('/evaluaciones/oferta/4','POST',{nombre:'Nueva',fecha_evaluacion:'2025-10-08',nota_maxima:20})).status,409);
   assert.equal((await call('/calificaciones/4','PUT',{nota:16})).status,409);
   assert.equal((await call('/calificaciones','POST',{alumno_id:4,curso_id:1,periodo_academico_id:2,nota:16})).status,409);
   assert.equal((await call('/asistencias','POST',{alumno_id:4,curso_id:1,periodo_academico_id:2,fecha:'2025-10-08',estado:'presente'})).status,409);
   assert.equal((await call('/asistencias/bulk','POST',{asistencias:[{alumno_id:4,curso_id:1,periodo_academico_id:2,fecha:'2025-10-08',estado:'presente'}]})).status,409);
  });
  await t.test('manual no autoriza y profesor sin asignaciones',async()=>{
   assert.equal((await call('/configuracion/ofertas/5')).status,404);
   assert.equal((await call('/asistencias/oferta/5/bulk','POST',{fecha:'2026-10-08',asistencias:[{alumno_id:5,estado:'presente'}]})).status,404);
   for(const path of ['/configuracion/ofertas','/alumnos','/profesores/me/apoderados','/alertas']) assert.equal((await call(path,'GET',undefined,'none')).data.length,0);
   const stats=await call('/dashboard/stats','GET',undefined,'none');assert.equal(Number(stats.data.totalAlumnos),0);assert.equal(Number(stats.data.totalCursos),0);
   assert.equal((await call('/configuracion/ofertas/1','GET',undefined,'none')).status,404);
  });
  await t.test('documentos propios/comunes y notificaciones personales',async()=>{
   assert.equal((await call('/documentos/1')).status,200);assert.equal((await call('/documentos/2')).status,404);assert.equal((await call('/documentos/2/archivo')).status,404);
   assert.equal((await call('/documentos/3')).status,200);assert.equal((await call('/documentos/3','PUT',{titulo:'Modificar compartido'})).status,404);
   assert.equal((await call('/documentos/1','PUT',{titulo:'Actualizado'})).status,200);
   assert.deepEqual((await call('/notificaciones')).data.map(n=>n.id),[1]);assert.equal((await call('/notificaciones/2')).status,404);
   assert.equal((await call('/notificaciones/2/marcar-leida','PUT',{})).status,404);assert.equal((await call('/notificaciones/2','DELETE')).status,404);
   assert.equal((await call('/notificaciones/1/marcar-leida','PUT',{})).status,200);
  });
  await t.test('horarios y calendario propios, sin inferir pertenencia de horarios antiguos',async()=>{
   const schedules=await call('/horarios?periodo_id=1');assert.equal(schedules.status,200);assert.deepEqual(schedules.data.map(h=>h.id).sort(),[1]);
   assert.deepEqual((await call('/horarios?periodo_id=1','GET',undefined,'p2')).data.map(h=>h.id),[2]);
   assert.deepEqual((await call('/horarios?periodo_id=2')).data.map(h=>h.id),[3]);
   const calendar=await call('/horarios/calendario?fecha_inicio=2026-10-05&fecha_fin=2026-10-11&periodo_id=1');assert.equal(calendar.status,200);
   assert.ok(calendar.data.every(e=>e.periodo_grado_curso_id !== 2));
   assert.ok(calendar.data.every(e=>e.periodo_grado_curso_id!==null));const [legacy]=await db.query('SELECT id FROM horarios WHERE id=4');assert.equal(legacy.length,1);
   assert.equal((await call('/horarios','POST',{})).status,403);
  });
  await t.test('edición antigua valida existencia, escala y cierre también para administración',async()=>{
   assert.equal((await call('/calificaciones/999999','PUT',{nota:10},'admin')).status,404);
   assert.equal((await call('/calificaciones/1oops','PUT',{nota:10},'admin')).status,400);
   assert.equal((await call('/calificaciones/1','PUT',{nota:11},'admin')).status,400);
   assert.equal((await call('/calificaciones/1','PUT',{nota:1.234},'admin')).status,400);
   assert.equal((await call('/calificaciones/8','PUT',{nota:10},'admin')).status,409);
   assert.equal((await call('/calificaciones/1','PUT',{observaciones:{}},'admin')).status,400);
   assert.equal((await call('/calificaciones/1','PUT',{},'admin')).status,400);
   assert.equal((await call('/calificaciones/1','PUT',{tipo_evaluacion:'otro'},'admin')).status,400);
   assert.equal((await call('/calificaciones/1','PUT',{nota:0,observaciones:'Prueba'},'admin')).status,200);
   assert.equal((await call('/calificaciones/1','PUT',{observaciones:null},'admin')).status,200);
   const [rows]=await db.query('SELECT nota,observaciones FROM calificaciones WHERE id=1');assert.equal(Number(rows[0].nota),0);assert.equal(rows[0].observaciones,null);
  });
  await t.test('registro antiguo de notas rechaza matrículas, fechas, tipos e identidades inválidas para todos los roles',async()=>{
   const valid={alumno_id:1,curso_id:1,periodo_academico_id:1,nota:9,fecha_evaluacion:'2026-10-07'};
   const [before]=await db.query('SELECT COUNT(*) n FROM calificaciones');
   for(const extra of [{alumno_id:true},{curso_id:'1x'},{periodo_academico_id:[]},{fecha_evaluacion:'2026-02-30'},{tipo_evaluacion:{}},{observaciones:[]},{evaluacion_id:1},{periodo_grado_curso_id:1}]) {
    assert.equal((await call('/calificaciones','POST',{...valid,...extra},'admin')).status,400);
    assert.equal((await call('/calificaciones/bulk','POST',{calificaciones:[{...valid,...extra}]},'admin')).status,400);
   }
   assert.equal((await call('/calificaciones','POST',{...valid,alumno_id:7},'admin')).status,403);
   assert.equal((await call('/calificaciones','POST',{...valid,fecha_evaluacion:'2025-10-07'},'admin')).status,400);
   assert.equal((await call('/calificaciones/bulk','POST',{calificaciones:[valid,{...valid,alumno_id:7}]},'admin')).status,403);
   const [after]=await db.query('SELECT COUNT(*) n FROM calificaciones');assert.equal(after[0].n,before[0].n);
  });
  await t.test('asistencia antigua actualiza la oferta exacta y no duplica claves con NULL',async()=>{
   const mark={alumno_id:1,curso_id:1,periodo_academico_id:1,fecha:'2026-10-10',estado:'presente'};
   for(let i=0;i<2;i++)assert.equal((await call('/asistencias/bulk','POST',{asistencias:[mark]})).status,201);
   const [rows]=await db.query('SELECT id,periodo_grado_curso_id FROM asistencias WHERE alumno_id=1 AND fecha=?',[mark.fecha]);assert.equal(rows.length,1);assert.equal(rows[0].periodo_grado_curso_id,1);
   assert.equal((await call('/asistencias','POST',{...mark,estado:'ausente'})).status,201);
   const book=await call('/asistencias/oferta/1?fecha='+mark.fecha);assert.equal(book.data.asistencias[0].estado,'ausente');
   assert.equal((await call('/asistencias/bulk','POST',{asistencias:[mark,mark]})).status,400);
   const general={alumno_id:1,curso_id:null,fecha:'2026-10-11',estado:'presente'};
   const concurrent=await Promise.all([call('/asistencias','POST',general,'admin'),call('/asistencias/bulk','POST',{asistencias:[general]},'admin')]);assert.ok(concurrent.every(r=>r.status===201));
   const [generalRows]=await db.query('SELECT id FROM asistencias WHERE alumno_id=1 AND fecha=? AND curso_id IS NULL',[general.fecha]);assert.equal(generalRows.length,1);
   assert.equal((await call('/asistencias','POST',{...mark,alumno_id:7},'admin')).status,403);
   assert.equal((await call('/asistencias','POST',{...mark,alumno_id:true},'admin')).status,400);
   assert.equal((await call('/asistencias','POST',{...mark,minutos_tardanza:[]},'admin')).status,400);
  });
  await t.test('filtros de asistencia respetan el periodo para administración y validan los IDs',async()=>{
   const current=await call('/asistencias/alumno/1?periodo_id=1','GET',undefined,'admin');assert.equal(current.status,200);assert.ok(current.data.asistencias.length);assert.ok(current.data.asistencias.every(a=>a.fecha.startsWith('2026')));
   const historic=await call('/asistencias/alumno/1?periodo_id=2','GET',undefined,'admin');assert.equal(historic.status,200);assert.equal(historic.data.asistencias.length,1);assert.equal(historic.data.asistencias[0].fecha,'2025-10-07');
   for(const path of ['/asistencias/alumno/1?periodo_id=no','/asistencias/alumno/1?fecha_inicio=2026-02-30','/asistencias/curso/1?fecha=bad','/calificaciones/curso/1oops/alumnos','/calificaciones/curso/1/alumnos?periodo_id=bad'])assert.equal((await call(path,'GET',undefined,'admin')).status,400);
  });
  await t.test('asistencia antigua conserva duplicados existentes y no sobrescribe otra oferta en periodos superpuestos',async()=>{
   const duplicate={alumno_id:1,curso_id:null,fecha:'2026-10-12',estado:'presente'};
   await db.query("INSERT INTO asistencias(alumno_id,fecha,estado) VALUES(1,'2026-10-12','presente'),(1,'2026-10-12','presente')");
   assert.equal((await call('/asistencias','POST',duplicate,'admin')).status,409);
   const [preserved]=await db.query("SELECT id FROM asistencias WHERE alumno_id=1 AND fecha='2026-10-12' AND curso_id IS NULL");assert.equal(preserved.length,2);
   await db.query("INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(3,'Superpuesto','2026-01-01','2026-12-31',0)");
   await db.query('INSERT INTO periodo_grados(periodo_academico_id,grado_id) VALUES(3,2)');
   await db.query('INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(6,3,2,1)');
   await db.query("INSERT INTO matriculas(alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,1,2,3,'activa')");
   await db.query("INSERT INTO asistencias(alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,6,'2026-10-13','ausente')");
   const mark={alumno_id:1,curso_id:1,periodo_academico_id:1,fecha:'2026-10-13',estado:'presente'};
   assert.equal((await call('/asistencias','POST',mark,'admin')).status,201);
   const [rows]=await db.query("SELECT periodo_grado_curso_id,estado FROM asistencias WHERE alumno_id=1 AND fecha='2026-10-13' ORDER BY periodo_grado_curso_id");
   assert.deepEqual(rows.map(row=>[row.periodo_grado_curso_id,row.estado]),[[1,'presente'],[6,'ausente']]);
   const ambiguous={...mark};delete ambiguous.periodo_academico_id;
   assert.equal((await call('/asistencias','POST',ambiguous,'admin')).status,409);
  });
  await t.test('resumen de asistencia usa grado de oferta o matrícula y no el caché del alumno',async()=>{
   // The production endpoint reports the current month; keep the fixture independent of the calendar.
   const [today]=await db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') fecha");
   await db.query("INSERT INTO asistencias(alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,1,?,'presente') ON DUPLICATE KEY UPDATE estado='presente'",[today[0].fecha]);
   const own=await call('/asistencias/resumen-grado');assert.equal(own.status,200);assert.deepEqual(own.data.map(row=>row.grado),['Primero']);assert.equal(Number(own.data[0].total_alumnos),1);
   const admin=await call('/asistencias/resumen-grado','GET',undefined,'admin');assert.equal(admin.status,200);assert.ok(admin.data.some(row=>row.grado==='Primero'));
  });
  await t.test('detalle de periodo: históricos, totales sin duplicar alumnos y alcance docente exacto',async()=>{
   const current=await call('/periodos/1','GET',undefined,'admin');assert.equal(current.status,200);assert.equal(current.data.periodo.id,1);assert.equal(current.data.resumen.grados,2);assert.equal(current.data.resumen.ofertas,3);assert.equal(current.data.resumen.cursos,2);
   await db.query("INSERT INTO matriculas(alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,2,1,1,'activa')");
   const updated=await call('/periodos/1','GET',undefined,'admin');assert.equal(updated.data.resumen.alumnos_activos,current.data.resumen.alumnos_activos);assert.equal(updated.data.resumen.inscripciones,current.data.resumen.inscripciones+1);
   const own=await call('/periodos/1');assert.equal(own.status,200);assert.equal(own.data.resumen.alumnos_activos,1);assert.equal(own.data.resumen.ofertas,1);assert.equal(own.data.resumen.grados,1);assert.equal(own.data.resumen.cursos,1);assert.equal(own.data.resumen.profesores,1);assert.equal(own.data.resumen.horarios,1);
   const historical=await call('/periodos/2');assert.equal(historical.status,200);assert.equal(historical.data.periodo.activo,0);assert.equal(historical.data.resumen.alumnos_activos,1);assert.equal(historical.data.resumen.ofertas,1);
   assert.equal((await call('/periodos/1','GET',undefined,'none')).status,404);assert.equal((await call('/periodos/999','GET',undefined,'admin')).status,404);
   for(const id of ['0','1x','bad'])assert.equal((await call('/periodos/'+id,'GET',undefined,'admin')).status,400);
   assert.ok(!JSON.stringify(own.data).match(/monto|pagado|pendiente|email|telefono/));
   await db.query("INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(90,'Vacío','2000-01-01','2000-12-31',0)");
   const empty=await call('/periodos/90','GET',undefined,'admin');assert.equal(empty.status,200);assert.ok(Object.values(empty.data.resumen).every(value=>Number(value)===0));assert.equal((await call('/periodos/90')).status,404);
  });
  await t.test('periodo vencido con bandera activa sigue siendo de consulta y se desactiva sin tocar registros',async()=>{
   await db.query("UPDATE periodos_academicos SET fecha_fin='2026-07-15',activo=1 WHERE id=1");
   const [beforeNotes]=await db.query('SELECT COUNT(*) n FROM calificaciones');const [beforeAttendance]=await db.query('SELECT COUNT(*) n FROM asistencias');
   const offer=await call('/configuracion/ofertas/1');assert.equal(offer.status,200);assert.equal(Number(offer.data.periodo_activo),0);
   const profile=await call('/profesores/me/resumen?periodo_id=1');assert.equal(Number(profile.data.periodo.activo),0);
   assert.equal((await call('/calificaciones/oferta/1/evaluacion/1/bulk','POST',{calificaciones:[{alumno_id:1,nota:8}]})).status,409);
   assert.equal((await call('/calificaciones/1','PUT',{nota:8})).status,409);
   assert.equal((await call('/asistencias/oferta/1/bulk','POST',{fecha:'2026-06-01',asistencias:[{alumno_id:1,estado:'presente'}]})).status,409);
   assert.equal((await call('/asistencias','POST',{alumno_id:1,curso_id:1,periodo_academico_id:1,fecha:'2026-06-01',estado:'presente'})).status,409);
   assert.equal((await call('/evaluaciones/oferta/1','POST',{nombre:'Fuera de vigencia',fecha_evaluacion:'2026-06-01',nota_maxima:20})).status,409);
   const {expirePeriods}=require('../dist/utils/periodoVigencia');assert.equal(await expirePeriods(db),1);assert.equal(await expirePeriods(db),0);
   const periods=await call('/periodos','GET',undefined,'admin');assert.equal(Number(periods.data.find(p=>p.id===1).activo),0);
   const [afterNotes]=await db.query('SELECT COUNT(*) n FROM calificaciones');const [afterAttendance]=await db.query('SELECT COUNT(*) n FROM asistencias');
   assert.equal(afterNotes[0].n,beforeNotes[0].n);assert.equal(afterAttendance[0].n,beforeAttendance[0].n);
  });
  await t.test('rutas administrativas bloqueadas aun llamando directamente',async()=>{
   for(const [path,method] of [['/usuarios','GET'],['/matriculas','GET'],['/mensualidades','GET'],['/sueldos','GET'],['/pagos-matricula','GET'],['/profesores','GET'],['/periodos','POST'],['/configuracion/periodos/1/grados','POST']]) assert.equal((await call(path,method,method==='POST'?{}:undefined)).status,403,path);
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();
  await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();await original.end();
 }
});
