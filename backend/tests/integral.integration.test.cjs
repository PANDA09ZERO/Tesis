const {test}=require('node:test');const assert=require('node:assert/strict');const mysql=require('mysql2/promise');const express=require('express');const jwt=require('jsonwebtoken');
const original=require('../dist/config/database').default;
test('corrección integral: HTTP y MySQL temporal con esquema real',async t=>{
 const name='integral_test_'+Date.now()+'_'+process.pid;assert.match(name,/^integral_test_\d+_\d+$/);
 const settings={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',charset:'utf8mb4',dateStrings:true};
 const admin=await mysql.createConnection(settings);let db,server;
 try {
  const [source]=await original.query('SELECT DATABASE() name');assert.match(source[0].name,/^[a-zA-Z0-9_]+$/);
  await admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');db=mysql.createPool({...settings,database:name,connectionLimit:6});
  for(const table of ['roles','usuarios','profesores','grados','periodos_academicos','cursos','periodo_grados','periodo_grado_cursos','periodo_grado_curso_profesores','alumnos','matriculas','evaluaciones','calificaciones','asistencias','horarios','pagos_matricula','mensualidades','alertas_academicas','notificaciones','documentos','documentos_historial','documento_categorias','formularios_documentales','formularios_documentales_envios','registro_actividades','apoderados','apoderado_alumno','eventos_calendario','incidencias','tramites_documentales'])await db.query('CREATE TABLE `'+table+'` LIKE `'+source[0].name+'`.`'+table+'`');
  await require('../scripts/migrate-respuestas.cjs').migrateRespuestas(db,{recordVersion:false});
  const {encryptPassword}=require('../dist/utils/encrypt');const passwordHash=encryptPassword('originalTest');
  await db.query("INSERT INTO roles(id,nombre) VALUES(1,'administrador'),(2,'profesor'),(3,'alumno'),(4,'apoderado')");
  for(const [id,role] of [[1,1],[2,2],[11,3],[12,3],[13,3],[14,3],[15,3],[21,4],[22,4],[23,4]])await db.query('INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(?,?,?,?,?,?)',[id,'user'+id+'@test.local',passwordHash,'Usuario',String(id),role]);
  for(const sql of [
   'INSERT INTO profesores(id,usuario_id) VALUES(1,2)',
   "INSERT INTO grados(id,nombre,nivel,orden) VALUES(1,'Primero','Primaria',1),(2,'Segundo','Primaria',2)",
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Actual','2026-01-01','2026-12-31',1),(2,'Anterior','2025-01-01','2025-12-31',0),(3,'Superpuesto','2026-01-01','2026-12-31',0)",
   "INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Compartido','COMP',1),(2,'Segundo curso','SEG',1),(3,'Ajeno','AJ',2)",
   'INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1),(2,1,1,2),(3,1,2,1),(4,2,2,1),(5,3,1,1)',
   "INSERT INTO alumnos(id,usuario_id,codigo_alumno) VALUES(1,11,'A1'),(2,12,'A2'),(3,13,'A3'),(4,14,'A4'),(5,15,'A5')",
   "INSERT INTO matriculas(id,alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,1,1,1,1,'activa'),(2,1,2,1,1,'activa'),(3,1,1,2,2,'activa'),(4,1,1,1,3,'activa'),(5,2,1,2,1,'activa')",
   "INSERT INTO evaluaciones(id,periodo_grado_curso_id,nombre,fecha_evaluacion,nota_maxima) VALUES(1,1,'Diez','2026-10-14',10),(2,1,'Veinte','2026-10-14',20),(3,4,'Histórica','2025-10-14',20)",
   "INSERT INTO calificaciones(id,alumno_id,curso_id,periodo_academico_id,periodo_grado_curso_id,evaluacion_id,nota,fecha_evaluacion) VALUES(1,1,1,1,1,1,9,'2026-10-14'),(2,1,1,1,1,2,18,'2026-10-14'),(3,1,1,1,NULL,NULL,13,'2026-10-01'),(4,1,1,2,4,3,15,'2025-10-14')",
   "INSERT INTO asistencias(id,alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,1,1,'2026-10-14','presente'),(2,1,2,2,'2026-10-14','ausente'),(3,1,1,NULL,'2026-10-13','tardanza'),(4,1,1,NULL,'2025-10-14','presente')",
   "INSERT INTO alertas_academicas(id,alumno_id,estado) VALUES(1,1,'activa')",
   'INSERT INTO apoderados(id,usuario_id) VALUES(1,21),(2,22),(3,23)',
   "INSERT INTO apoderado_alumno(apoderado_id,alumno_id,parentesco) VALUES(1,1,'Padre'),(1,2,'Padre'),(2,3,'Madre')",
   "INSERT INTO documentos(id,titulo,tipo_archivo,usuario_subio,alumno_id) VALUES(1,'Propio','pdf',1,1),(2,'Ajeno','pdf',1,3),(3,'General','pdf',1,NULL)"
  ])await db.query(sql);
  const fields=JSON.stringify([{id:'nombre',etiqueta:'Nombre',tipo:'texto',requerido:true}]);await db.query("INSERT INTO formularios_documentales(id,titulo,campos,estado,creado_por) VALUES(1,'Publicado',?,'publicada',1)",[fields]);
  require.cache[require.resolve('../dist/config/database')].exports.default=db;process.env.JWT_SECRET='integral-test-secret';
  const {credentialVersion}=require('../dist/utils/session');const sign=(userId,rol,hash=passwordHash)=>jwt.sign({userId,rol,credentialVersion:credentialVersion(hash,process.env.JWT_SECRET)},process.env.JWT_SECRET);
  const tokens={admin:sign(1,'administrador'),teacher:sign(2,'profesor'),a1:sign(11,'alumno'),g1:sign(21,'apoderado'),g2:sign(22,'apoderado'),none:sign(23,'apoderado')};
  const app=express();app.use(express.json());const {authenticate}=require('../dist/middleware/auth');const {limitarApoderado}=require('../dist/middleware/apoderado');const {limitarEstudiante}=require('../dist/middleware/estudiante');
  app.use('/api',(req,res,next)=>req.originalUrl.split('?')[0]==='/api/auth/login'?next():authenticate(req,res,()=>limitarApoderado(req,res,()=>limitarEstudiante(req,res,next))));
  for(const [prefix,module] of [['auth','auth'],['periodos','periodos'],['reportes','reportes'],['matriculas','matriculas'],['apoderados','apoderados'],['alumnos','alumnos'],['calificaciones','calificaciones'],['asistencias','asistencias'],['documentos','documentos'],['users','users'],['mensualidades','mensualidades'],['pagos-matricula','pagosMatricula'],['dashboard','dashboard'],['notificaciones','notificaciones'],['incidencias','incidencias']])app.use('/api/'+prefix,require('../dist/routes/'+module+'.routes').default);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  async function call(route,method='GET',body,actor='admin'){const response=await fetch('http://127.0.0.1:'+server.address().port+'/api'+route,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+(tokens[actor]||actor)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};}
  await t.test('usuario activo, desactivado, rol cambiado y eliminado',async()=>{
   assert.equal((await call('/auth/profile')).status,200);await db.query('UPDATE usuarios SET activo=0 WHERE id=1');assert.equal((await call('/auth/profile')).status,401);await db.query('UPDATE usuarios SET activo=1,rol_id=2 WHERE id=1');assert.equal((await call('/auth/profile')).status,401);await db.query('UPDATE usuarios SET rol_id=1 WHERE id=1');assert.equal((await call('/auth/profile','GET',undefined,sign(999,'administrador'))).status,401);
  });
  await t.test('login valida datos y devuelve credencial utilizable',async()=>{assert.equal((await call('/auth/login','POST',{email:{},password:'x'},null)).status,400);assert.equal((await call('/auth/login','POST',{email:'user1@test.local',password:'wrong'},null)).status,401);const r=await call('/auth/login','POST',{email:'user1@test.local',password:'originalTest'},null);assert.equal(r.status,200);assert.equal((await call('/auth/profile','GET',undefined,r.data.token)).status,200);});
  await t.test('periodos: validación, inexistencia y rollback de activación fallida',async()=>{
   for(const body of [{nombre:'',fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31'},{nombre:'A',fecha_inicio:'2026-02-30',fecha_fin:'2026-12-31'},{nombre:'A',fecha_inicio:'2026-12-31',fecha_fin:'2026-01-01'},{nombre:'A',fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31',activo:'false'}])assert.equal((await call('/periodos','POST',body)).status,400);
   assert.equal((await call('/periodos/999','PUT',{activo:1})).status,404);
   await db.query("CREATE TRIGGER reject_period BEFORE UPDATE ON periodos_academicos FOR EACH ROW BEGIN IF NEW.nombre='FALLO' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fallo simulado'; END IF; END");
   assert.equal((await call('/periodos/3','PUT',{nombre:'FALLO',activo:1})).status,500);const [rows]=await db.query('SELECT id FROM periodos_academicos WHERE activo=1');assert.deepEqual(rows.map(r=>r.id),[1]);await db.query('DROP TRIGGER reject_period');
  });
  await t.test('rechaza activar periodos vencidos o futuros sin desactivar el vigente',async()=>{
   assert.equal((await call('/periodos/2','PUT',{activo:1})).status,400);
   assert.equal((await call('/periodos','POST',{nombre:'Futuro',fecha_inicio:'2099-01-01',fecha_fin:'2099-12-31',activo:1})).status,400);
   assert.equal((await call('/periodos','POST',{nombre:'Vencido',fecha_inicio:'2000-01-01',fecha_fin:'2000-12-31',activo:1})).status,400);
   const [rows]=await db.query('SELECT id FROM periodos_academicos WHERE activo=1');assert.deepEqual(rows.map(r=>r.id),[1]);
  });
  await t.test('activaciones concurrentes conservan un único periodo activo',async()=>{const results=await Promise.all([call('/periodos/1','PUT',{activo:1}),call('/periodos/3','PUT',{activo:1})]);assert.deepEqual(results.map(r=>r.status),[200,200]);const [rows]=await db.query('SELECT id FROM periodos_academicos WHERE activo=1');assert.equal(rows.length,1);assert.equal((await call('/periodos/1','PUT',{activo:1})).status,200);});
  await t.test('eliminación protege vínculos, detecta inexistentes y permite periodo vacío',async()=>{assert.equal((await call('/periodos/1','DELETE')).status,409);assert.equal((await call('/periodos/999','DELETE')).status,404);const r=await call('/periodos','POST',{nombre:'Vacío',fecha_inicio:'2028-01-01',fecha_fin:'2028-12-31'});assert.equal(r.status,201);assert.equal((await call('/periodos/'+r.data.id,'DELETE')).status,200);});
  await t.test('rendimiento conserva grado histórico, separa escalas y no multiplica notas',async()=>{
   const r=await call('/reportes/rendimiento');assert.equal(r.status,200);assert.equal(r.data.length,4);assert.equal(r.data.filter(x=>x.periodo_id===1).length,3);assert.ok(r.data.filter(x=>x.periodo_id===1).every(x=>x.grado==='Primero'));assert.equal(r.data.find(x=>x.periodo_id===2).grado,'Segundo');assert.equal(r.data.reduce((n,x)=>n+Number(x.total_notas),0),4);assert.ok(r.data.every(x=>x.aprobados===null));assert.equal(r.data.find(x=>x.periodo_id===1&&x.escala_maxima===null).promedio,null);assert.equal(Number(r.data.find(x=>x.escala_maxima==='10.00').promedio),9);assert.deepEqual(r.data.filter(x=>x.periodo_id===1).map(x=>x.escala_maxima).sort(),[null,'10.00','20.00'].sort());assert.equal((await call('/reportes/rendimiento?periodo_id=1')).data.length,3);assert.equal((await call('/reportes/rendimiento?periodo_id=x')).status,400);
   const student=await call('/calificaciones/alumno/1');assert.equal(student.status,200);assert.equal(student.data.resumen.promedio_general,null);assert.equal(student.data.resumen_por_escala.length,4);const course=await call('/calificaciones/curso/1');assert.equal(course.status,200);assert.equal(course.data.estadisticas.promedio,null);assert.equal(course.data.estadisticas.aprobados,null);
   const risk=await call('/reportes/alumnos-riesgo');assert.equal(risk.status,200);assert.equal(risk.data[0].grado,'Actual / Primero');
   const d=await call('/dashboard/rendimiento');assert.equal(d.status,200);assert.equal(d.data.length,3);assert.ok(d.data.every(x=>x.grado==='Primero'));
  });
  await t.test('asistencia distingue días de registros y mantiene ambigüedad histórica',async()=>{
   const r=await call('/reportes/asistencia?periodo_id=1');assert.equal(r.status,200);assert.equal(r.data.length,1);assert.equal(Number(r.data[0].total_dias),1);assert.equal(Number(r.data[0].total_sesiones),2);assert.equal(Number(r.data[0].porcentaje),50);assert.equal(r.data[0].grado,'Primero');const all=await call('/reportes/asistencia');assert.equal(all.data.find(x=>x.periodo_id===null).total_sesiones,1);assert.equal(all.data.find(x=>x.periodo_id===2).grado,'Segundo');assert.equal((await call('/reportes/asistencia?fecha_inicio=2026-02-30')).status,400);assert.equal((await call('/reportes/asistencia?fecha_inicio=2026-12-31&fecha_fin=2026-01-01')).status,400);
  });
  await t.test('matrícula valida referencias y oferta exacta aun con curso compartido',async()=>{
   const body={alumno_id:5,grado_id:2,curso_id:1,periodo_academico_id:1};assert.equal((await call('/matriculas','POST',{...body,alumno_id:999})).status,404);assert.equal((await call('/matriculas','POST',{...body,periodo_academico_id:999})).status,404);assert.equal((await call('/matriculas','POST',{...body,grado_id:999})).status,404);assert.equal((await call('/matriculas','POST',{...body,curso_id:3})).status,400);assert.equal((await call('/matriculas','POST',{...body,curso_id:[]})).status,400);assert.equal((await call('/matriculas','POST',body)).status,201);assert.equal((await call('/matriculas','POST',body)).status,409);assert.equal((await call('/matriculas/999','PUT',{estado:'activa'})).status,404);assert.equal((await call('/matriculas/999','DELETE')).status,404);assert.equal((await call('/matriculas/1','PUT',{estado:'inventado'})).status,400);assert.equal((await call('/matriculas/1','PUT',{grado_id:999})).status,404);assert.equal((await call('/matriculas/1','PUT',{curso_id:999})).status,404);assert.equal((await call('/matriculas/1','PUT',{grado_id:'1',curso_id:'1'})).status,200);
  });
  await t.test('fallo de segundo curso revierte lote y estado personal, sin pagos',async()=>{
   await db.query("CREATE TRIGGER reject_enrollment BEFORE INSERT ON matriculas FOR EACH ROW BEGIN IF NEW.alumno_id=3 AND NEW.curso_id=2 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fallo simulado'; END IF; END");assert.equal((await call('/matriculas','POST',{alumno_id:3,grado_id:1,periodo_academico_id:1})).status,500);const [rows]=await db.query('SELECT id FROM matriculas WHERE alumno_id=3');assert.equal(rows.length,0);const [student]=await db.query('SELECT grado_id,periodo_academico_id FROM alumnos WHERE id=3');assert.equal(student[0].grado_id,null);assert.equal(student[0].periodo_academico_id,null);const [payments]=await db.query('SELECT id FROM pagos_matricula');assert.equal(payments.length,0);await db.query('DROP TRIGGER reject_enrollment');
  });
  await t.test('lotes concurrentes no duplican cursos; persistencia externa',async()=>{
   const results=await Promise.all([call('/matriculas','POST',{alumno_id:4,grado_id:1,periodo_academico_id:1}),call('/matriculas','POST',{alumno_id:4,grado_id:1,periodo_academico_id:1})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const second=await mysql.createConnection({...settings,database:name});try{const [rows]=await second.query('SELECT curso_id FROM matriculas WHERE alumno_id=4 ORDER BY curso_id');assert.deepEqual(rows.map(r=>r.curso_id),[1,2]);}finally{await second.end();}
  });
  await t.test('cancelar un curso conserva otras inscripciones y el historial',async()=>{assert.equal((await call('/matriculas/1','PUT',{estado:'cancelada'})).status,200);const [rows]=await db.query('SELECT estado FROM alumnos WHERE id=1');assert.equal(rows[0].estado,'matriculado');const [grades]=await db.query('SELECT id FROM calificaciones WHERE alumno_id=1');assert.equal(grades.length,4);assert.equal((await call('/matriculas/1','PUT',{grado_id:2})).status,409);assert.equal((await call('/matriculas/1','PUT',{estado:'activa'})).status,200);});
  await t.test('apoderados: varios alumnos, cuentas separadas y sin vínculos',async()=>{const own=await call('/apoderados/me/alumnos','GET',undefined,'g1');assert.deepEqual(own.data.map(x=>x.id),[1,2]);assert.equal(own.data[0].grado,'Primero');assert.deepEqual((await call('/apoderados/me/alumnos','GET',undefined,'g2')).data.map(x=>x.id),[3]);assert.deepEqual((await call('/apoderados/me/alumnos','GET',undefined,'none')).data,[]);assert.equal((await call('/auth/profile','GET',undefined,'g1')).data.id,21);const detail=await call('/alumnos/1?periodo_id=1','GET',undefined,'g1');assert.equal(detail.status,200);assert.equal(detail.data.calificaciones.length,3);assert.equal(Number(detail.data.resumenAsistencia.total),2);assert.ok(detail.data.matriculas_academicas.every(m=>!('pago' in m)));assert.equal((await call('/alumnos/3','GET',undefined,'g1')).status,404);assert.equal((await call('/calificaciones/alumno/3','GET',undefined,'g1')).status,404);assert.equal((await call('/asistencias/alumno/3','GET',undefined,'g1')).status,404);});
  await t.test('apoderado conserva documentos/formularios propios y bloquea administración/finanzas',async()=>{assert.deepEqual((await call('/documentos','GET',undefined,'g1')).data.map(d=>d.id).sort(),[1,3]);assert.equal((await call('/documentos/2','GET',undefined,'g1')).status,404);assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{nombre:'Prueba'},alumno_id:3},'g1')).status,404);assert.equal((await call('/documentos/formularios/1/envios','POST',{respuestas:{nombre:'Prueba'},alumno_id:1},'g1')).status,201);for(const route of ['/users','/mensualidades','/pagos-matricula','/periodos','/reportes/rendimiento'])assert.equal((await call(route,'GET',undefined,'g1')).status,403);assert.equal((await call('/users/22','PUT',{nombre:'Cambio'},'g1')).status,403);});
  await t.test('inicio familiar: vínculos, periodo académico y ninguna información financiera',async()=>{
   const home=await call('/apoderados/me/inicio','GET',undefined,'g1');assert.equal(home.status,200);assert.deepEqual(home.data.map(x=>x.alumno.id),[1,2]);
   const a=home.data[0];assert.equal(a.alumno.parentesco,'Padre');assert.equal(a.periodo.id,1);assert.equal(a.grado,'Primero');assert.equal(a.resumen.cursos,2);assert.equal(a.resumen.ausencias,1);assert.equal(a.resumen.dias_asistencia,1);assert.equal(a.resumen.asistencias_sin_periodo,1);
   assert.doesNotMatch(JSON.stringify(home.data),/"(?:pago|monto|mensualidades|sueldos|password_hash)"/);
   assert.deepEqual((await call('/apoderados/me/inicio','GET',undefined,'none')).data,[]);
   const own=await call('/apoderados/me/inicio','GET',undefined,'g2');assert.equal(own.data[0].periodo,null);assert.equal(own.data[0].grado,'');
   assert.equal((await call('/apoderados/me/inicio','GET',undefined,'admin')).status,403);
  });
  await t.test('detalle familiar: periodo común, históricos y rechazo de IDs o periodos ajenos',async()=>{
   const route='/apoderados/me/alumnos/1/resumen';const current=await call(route+'?periodo_id=1','GET',undefined,'g1');assert.equal(current.status,200);assert.equal(current.data.calificaciones.length,3);assert.equal(current.data.asistencias.length,2);assert.equal(current.data.pendientes.inasistencias[0].fecha,'2026-10-14');
   assert.equal('documentos' in current.data,false);assert.equal('documentos_pendientes' in current.data.resumen,false);assert.ok(current.data.matriculas.every(m=>!('pago' in m)));
   const history=await call(route+'?periodo_id=2','GET',undefined,'g1');assert.equal(history.status,200);assert.equal(history.data.grado,'Segundo');assert.equal(history.data.calificaciones.length,1);assert.equal(Number(history.data.calificaciones[0].nota),15);assert.equal(history.data.asistencias.length,1);assert.equal(history.data.asistencias[0].fecha,'2025-10-14');
   for(const period of ['0','-1','1.5','bad'])assert.equal((await call(route+'?periodo_id='+period,'GET',undefined,'g1')).status,400);
   assert.equal((await call(route+'?periodo_id=999','GET',undefined,'g1')).status,404);
   assert.equal((await call('/apoderados/me/alumnos/3/resumen','GET',undefined,'g1')).status,404);
   assert.equal((await call(route,'POST',{},'g1')).status,403);
   await db.query("INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin) VALUES(20,'Solo financiero','2024-01-01','2024-12-31')");
   await db.query("INSERT INTO pagos_matricula(alumno_id,periodo_academico_id,monto,estado) VALUES(1,20,123,'pendiente')");
   assert.equal((await call(route+'?periodo_id=20','GET',undefined,'g1')).status,404);
  });
  await t.test('resumen sin documentos y horarios de la matrícula exacta',async()=>{
   await db.query("INSERT INTO horarios(curso_id,profesor_id,periodo_academico_id,periodo_grado_curso_id,dia_semana,hora_inicio,hora_fin) VALUES(1,1,1,1,'Lunes','08:00','09:00'),(1,1,2,4,'Martes','10:00','11:00'),(1,1,1,3,'Lunes','12:00','13:00')");
   const current=(await call('/apoderados/me/alumnos/1/resumen?periodo_id=1','GET',undefined,'g1')).data;
   assert.equal('documentos' in current,false);assert.equal('documentos' in current.pendientes,false);assert.equal(current.horarios.length,1);assert.equal(current.horarios[0].hora_inicio,'08:00:00');
   const history=(await call('/apoderados/me/alumnos/1/resumen?periodo_id=2','GET',undefined,'g1')).data;
   assert.equal(history.horarios.length,1);assert.equal(history.horarios[0].hora_inicio,'10:00:00');assert.equal('documentos' in history,false);
  });
  await t.test('notificación individual: exige destinatario activo y solo la recibe esa persona',async()=>{
   const body={titulo:'Aviso individual',mensaje:'Solo para el alumno 11'};
   assert.equal((await call('/notificaciones','POST',body)).status,400);
   assert.equal((await call('/notificaciones','POST',{...body,usuario_id:'abc'})).status,400);
   assert.equal((await call('/notificaciones','POST',{...body,usuario_id:999999})).status,404);
   assert.equal((await call('/notificaciones','POST',{...body,usuario_id:11},'teacher')).status,403);
   const created=await call('/notificaciones','POST',{...body,usuario_id:11});assert.equal(created.status,201);
   try{
    assert.ok((await call('/notificaciones','GET',undefined,'a1')).data.some(n=>n.id===created.data.id));
    assert.ok(!(await call('/notificaciones','GET',undefined,'g1')).data.some(n=>n.id===created.data.id));
    // El apoderado también recibe las suyas (antes su acceso de solo lectura bloqueaba /notificaciones).
    const guardian=await call('/notificaciones','POST',{...body,mensaje:'Para el apoderado 21',usuario_id:21});assert.equal(guardian.status,201);
    try{
     assert.ok((await call('/notificaciones','GET',undefined,'g1')).data.some(n=>n.id===guardian.data.id));
     assert.ok(!(await call('/notificaciones','GET',undefined,'g2')).data.some(n=>n.id===guardian.data.id));
     assert.equal((await call('/notificaciones/'+guardian.data.id,'GET',undefined,'g2')).status,404);
     assert.equal((await call('/notificaciones/'+guardian.data.id+'/marcar-leida','PUT',undefined,'g1')).status,200);
     assert.equal((await call('/notificaciones','POST',body,'g1')).status,403);
     // Respuestas: el destinatario contesta, la administración se entera y puede responder.
     const thread='/notificaciones/'+guardian.data.id+'/respuestas';
     assert.equal((await call(thread,'POST',{mensaje:'   '},'g1')).status,400);
     assert.equal((await call(thread,'POST',{mensaje:'x'.repeat(2001)},'g1')).status,400);
     assert.equal((await call(thread,'POST',{mensaje:'Asistiré a la reunión'},'g1')).status,201);
     assert.ok((await call('/notificaciones/no-leidas')).data.respuestas_pendientes>=1);
     assert.equal((await call(thread,'GET',undefined,'g2')).status,404);
     assert.equal((await call(thread,'POST',{mensaje:'Intruso'},'g2')).status,404);
     const seen=await call(thread);assert.equal(seen.status,200);assert.deepEqual(seen.data.respuestas.map(r=>[r.mensaje,r.rol]),[['Asistiré a la reunión','apoderado']]);
     let [[row]]=await db.query('SELECT leida,respuesta_pendiente FROM notificaciones WHERE id=?',[guardian.data.id]);assert.equal(Number(row.respuesta_pendiente),0);
     assert.equal((await call(thread,'POST',{mensaje:'Gracias, lo esperamos'})).status,201);
     [[row]]=await db.query('SELECT leida,respuesta_pendiente FROM notificaciones WHERE id=?',[guardian.data.id]);assert.equal(Number(row.leida),0);
     const listed=(await call('/notificaciones?search='+encodeURIComponent('Para el apoderado 21'))).data.find(n=>n.id===guardian.data.id);assert.equal(Number(listed.respuestas),2);
     assert.equal((await call(thread,'GET',undefined,'g1')).data.respuestas.length,2);
     [[row]]=await db.query('SELECT leida FROM notificaciones WHERE id=?',[guardian.data.id]);assert.equal(Number(row.leida),1);
    }finally{await db.query('DELETE FROM notificaciones WHERE id=?',[guardian.data.id]);}
    await db.query('UPDATE usuarios SET activo=0 WHERE id=12');
    assert.equal((await call('/notificaciones','POST',{...body,usuario_id:12})).status,404);
    const found=await call('/users?search=user1&activo=1&limit=50');
    assert.ok(found.data.some(u=>u.id===11));assert.ok(!found.data.some(u=>u.id===12));
   }finally{await db.query('UPDATE usuarios SET activo=1 WHERE id=12');await db.query('DELETE FROM notificaciones WHERE id=?',[created.data.id]);}
  });
  await t.test('avisos automáticos: incidencia y alerta llegan a la familia; contadores por sección según el rol',async()=>{
   const before=(await call('/notificaciones/no-leidas')).data.secciones;assert.deepEqual(Object.keys(before).sort(),['alertas','incidencias','tramites']);
   const created=await call('/incidencias','POST',{alumno_id:1,fecha:'2026-10-14',tipo:'agresion',gravedad:'grave',descripcion:'Empujó a un compañero en el recreo'});assert.equal(created.status,201);
   const {avisarFamilia}=require('../dist/utils/avisos');let alertIds=[];
   try{
    const g1=(await call('/notificaciones','GET',undefined,'g1')).data.find(n=>n.titulo==='Incidencia de conducta: Usuario 11');
    assert.ok(g1);assert.equal(g1.link,'/alumnos/1?vista=incidencias');assert.equal(g1.prioridad,'alta');assert.match(g1.mensaje,/^Agresión \(grave\) registrada el 2026-10-14\. Empujó/);
    assert.ok(!(await call('/notificaciones','GET',undefined,'g2')).data.some(n=>n.titulo==='Incidencia de conducta: Usuario 11'));
    assert.ok(!(await call('/notificaciones','GET',undefined,'a1')).data.some(n=>n.titulo==='Incidencia de conducta: Usuario 11'));
    assert.equal((await call('/notificaciones/no-leidas')).data.secciones.incidencias,before.incidencias+1);
    const own=(await call('/notificaciones/no-leidas','GET',undefined,'a1')).data;assert.deepEqual(own.secciones,{alertas:0,incidencias:0,tramites:0});
    assert.equal(typeof (await call('/notificaciones/no-leidas','GET',undefined,'teacher')).data.secciones.alertas,'number');
    // Alerta nueva: avisa al alumno (enlace a Mis alertas) y a su apoderado (ficha del alumno).
    assert.equal(await avisarFamilia(db,1,{titulo:'Alerta académica (riesgo alto): {alumno}',mensaje:'Faltas reiteradas',prioridad:'alta',linkAlumno:'/alertas',linkApoderado:'/alumnos/1'},{alumno:true,apoderados:true}),2);
    const [rows]=await db.query("SELECT id,usuario_id,link FROM notificaciones WHERE titulo='Alerta académica (riesgo alto): Usuario 11' ORDER BY usuario_id");alertIds=rows.map(r=>r.id);
    assert.deepEqual(rows.map(r=>[r.usuario_id,r.link]),[[11,'/alertas'],[21,'/alumnos/1']]);
    assert.equal(await avisarFamilia(db,999999,{titulo:'x',mensaje:'y'},{alumno:true,apoderados:true}),0);
   }finally{
    await db.query("DELETE FROM notificaciones WHERE titulo='Incidencia de conducta: Usuario 11'");if(alertIds.length)await db.query('DELETE FROM notificaciones WHERE id IN (?)',[alertIds]);
    await db.query('DELETE FROM incidencias WHERE id=?',[created.data.id]);
   }
  });
  await t.test('editar usuario con el formulario completo: campos vacíos como NULL y contraseña restablecida',async()=>{
   const [[before]]=await db.query('SELECT password_hash,fecha_nacimiento,dni,telefono,genero FROM usuarios WHERE id=12');
   try{
    // Así lo envía Administración de usuarios: todos los campos, los opcionales vacíos como "".
    const body={email:'user12@test.local',nombre:'Usuario',apellido:'12',dni:'',telefono:'',direccion:'',fecha_nacimiento:'',genero:before.genero||'M',rol_id:'3',password:'ClaveNueva2026'};
    const updated=await call('/users/12','PUT',body);assert.equal(updated.status,200);
    const [[row]]=await db.query('SELECT fecha_nacimiento,dni,telefono,direccion,genero,debe_cambiar_password FROM usuarios WHERE id=12');
    assert.equal(row.fecha_nacimiento,null);assert.equal(row.dni,null);assert.equal(row.telefono,null);assert.equal(row.direccion,null);assert.equal(row.genero,before.genero||'M');assert.equal(Number(row.debe_cambiar_password),1);
    assert.equal((await call('/auth/login','POST',{email:'user12@test.local',password:'ClaveNueva2026'},null)).status,200);
    assert.equal((await call('/users/12','PUT',{fecha_nacimiento:'2010-05-04'})).status,200);
    const [[dated]]=await db.query("SELECT DATE_FORMAT(fecha_nacimiento,'%Y-%m-%d') f FROM usuarios WHERE id=12");assert.equal(dated.f,'2010-05-04');
   }finally{
    await db.query('UPDATE usuarios SET password_hash=?,fecha_nacimiento=?,dni=?,telefono=?,genero=?,debe_cambiar_password=0 WHERE id=12',[before.password_hash,before.fecha_nacimiento,before.dni,before.telefono,before.genero]);
   }
  });
  await t.test('contraseña propia cierra todas las sesiones, exige reautenticación y no modifica otro usuario',async()=>{const another=sign(21,'apoderado');assert.equal((await call('/auth/change-password','PUT',{currentPassword:'originalTest',newPassword:'nuevaTest',userId:22},'g1')).status,200);assert.equal((await call('/auth/profile','GET',undefined,'g1')).status,401);assert.equal((await call('/auth/profile','GET',undefined,another)).status,401);assert.equal((await call('/auth/profile','GET',undefined,'g2')).status,200);assert.equal((await call('/auth/login','POST',{email:'user21@test.local',password:'originalTest'},null)).status,401);const r=await call('/auth/login','POST',{email:'user21@test.local',password:'nuevaTest'},null);assert.equal(r.status,200);assert.equal((await call('/auth/profile','GET',undefined,r.data.token)).status,200);});
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();await original.end();}
});
