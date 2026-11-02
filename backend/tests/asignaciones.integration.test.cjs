'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),mysql=require('mysql2/promise'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),jwt=require('jsonwebtoken');
const {databaseSettings}=require('../dist/config/environment'),{install}=require('../scripts/database.cjs');
test('asignación única: API, estructura, permisos, concurrencia e historial en MySQL aislado',async t=>{
 const settings=databaseSettings(),name='assignments_test_'+Date.now()+'_'+process.pid;assert.match(name,/^assignments_test_\d+_\d+$/);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-assignments-')),original=require('../dist/config/database').default,admin=await mysql.createConnection({...settings,database:undefined});let db,server;
 try{
  await admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');db=mysql.createPool({...settings,database:name});await install(db);
  for(const sql of [
   "INSERT INTO roles(id,nombre) VALUES(5,'superadministrador')",
   "INSERT INTO usuarios(id,nombre,apellido,email,password_hash,rol_id,activo) VALUES(1,'Admin','Prueba','admin@test.local','synthetic',1,1),(2,'Docente','Uno','p1@test.local','synthetic',2,1),(3,'Docente','Dos','p2@test.local','synthetic',2,1),(4,'Docente','Manual','p3@test.local','synthetic',2,1),(5,'Docente','Inactivo','p4@test.local','synthetic',2,0),(6,'Alumno','Uno','s1@test.local','synthetic',3,1),(7,'Apoderado','Uno','g1@test.local','synthetic',4,1),(8,'Propietario','Prueba','owner@test.local','synthetic',5,1),(10,'Alumno','Dos','s2@test.local','synthetic',3,1)",
   'INSERT INTO profesores(id,usuario_id) VALUES(1,2),(2,3),(3,4),(4,5)',
   "INSERT INTO grados(id,nombre,nivel,orden) VALUES(1,'Primero','Primaria',1),(2,'Segundo','Primaria',2)",
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Actual','2026-01-01','2026-12-31',1),(2,'Histórico','2025-01-01','2025-12-31',0)",
   "INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Compartido','COMP',1),(2,'Otro','OTRO',1)",
   'INSERT INTO periodo_grados(periodo_academico_id,grado_id) VALUES(1,1),(1,2),(2,1)',
   'INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1),(2,1,2,1),(3,2,1,1),(4,1,1,2),(5,1,2,2)',
   'INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(1,1),(2,2),(3,1)',
   "INSERT INTO profesor_curso(profesor_id,curso_id,origen) VALUES(3,1,'manual')",
   "INSERT INTO alumnos(id,usuario_id,codigo_alumno) VALUES(1,6,'S1'),(2,10,'S2')",
   "INSERT INTO matriculas(alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,1,1,1,'activa'),(2,1,2,1,'activa')",
   'INSERT INTO apoderados(id,usuario_id) VALUES(1,7)',
   "INSERT INTO apoderado_alumno(apoderado_id,alumno_id,parentesco) VALUES(1,1,'Padre')"
  ])await db.query(sql);
  Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:'assignment-test-secret',OPERATIONS_DIRECTORY:path.join(directory,'operations'),UPLOAD_DIRECTORY:directory});require.cache[require.resolve('../dist/config/database')].exports.default=db;
  const {credentialVersion}=require('../dist/utils/session');const tokens={};for(const [actor,id,rol]of [['admin',1,'administrador'],['p1',2,'profesor'],['p2',3,'profesor'],['manual',4,'profesor'],['student',6,'alumno'],['guardian',7,'apoderado'],['owner',8,'superadministrador']])tokens[actor]=jwt.sign({userId:id,rol,credentialVersion:credentialVersion('synthetic',process.env.JWT_SECRET)},process.env.JWT_SECRET);
  server=await new Promise(resolve=>{const s=require('../dist/app').default.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port+'/api';
  async function call(route,method='GET',body,actor='admin'){const response=await fetch(base+route,{method,headers:{Authorization:'Bearer '+tokens[actor],'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {...await response.json(),status:response.status};}
  const root='/configuracion-academica',schedule={periodo_grado_curso_id:1,dia_semana:'Lunes',hora_inicio:'08:00',hora_fin:'09:00',aula:'A1'};let scheduleId;
  await t.test('una asignación específica se refleja en profesor, curso y oferta aun sin horario',async()=>{
   const teacher=(await call('/profesores/1')).data;assert.equal(teacher.cursos_asignados.length,2);assert.deepEqual(teacher.cursos,[1]);assert.deepEqual(teacher.cursos_asignados.map(c=>c.periodo_academico_id),[1,2]);
   assert.deepEqual((await call(root+'/ofertas/1')).data.profesores.map(p=>p.id),[1]);assert.deepEqual((await call(root+'/ofertas/2')).data.profesores.map(p=>p.id),[2]);
   const course=(await call('/cursos/1')).data;assert.deepEqual(course.profesores.map(p=>p.id).sort(),[1,2]);
  });
  await t.test('manual no concede acceso global, ni a alumnos, notas, calendario, estructura u ofertas',async()=>{
   for(const route of [root+'/ofertas','/alumnos','/horarios','/horarios/calendario?fecha_inicio=2026-10-01&fecha_fin=2026-10-20&periodo_id=1'])assert.deepEqual((await call(route,'GET',undefined,'manual')).data,[]);
   for(const route of [root+'/ofertas/1',root+'/ofertas/2','/alumnos/1'])assert.equal((await call(route,'GET',undefined,'manual')).status,404);
   assert.equal((await call('/calificaciones/oferta/1','GET',undefined,'manual')).status,404);
   assert.equal((await call('/profesores/3')).data.cursos_asignados.length,0);
  });
  await t.test('editar perfil no toca asignaciones; payload heredado se rechaza sin borrar datos',async()=>{
   assert.equal((await call('/profesores/1','PUT',{especialidad:'Actualizada'})).status,200);
   assert.equal((await call('/profesores/1','PUT',{cursos:[]})).status,400);assert.equal((await call('/profesores','POST',{cursos:[1]})).status,400);
   const [rows]=await db.query('SELECT COUNT(*) total FROM periodo_grado_curso_profesores');assert.equal(rows[0].total,3);const [legacy]=await db.query('SELECT COUNT(*) total FROM profesor_curso');assert.equal(legacy[0].total,1);
  });
  await t.test('horario resuelve docente único y deriva identidad; rechaza IDs, docente ajeno y contradicciones',async()=>{
   const created=await call('/horarios','POST',schedule);assert.equal(created.status,201);scheduleId=created.data.id;
   const [rows]=await db.query('SELECT profesor_id,curso_id,periodo_academico_id FROM horarios WHERE id=?',[scheduleId]);assert.equal(rows[0].profesor_id,1);assert.equal(rows[0].curso_id,1);
   for(const invalid of [{profesor_id:2},{profesor_id:0},{profesor_id:[1]},{periodo_academico_id:2},{grado_id:2},{curso_id:2}])assert.equal((await call('/horarios','POST',{...schedule,...invalid})).status,400);
   assert.equal((await call('/horarios','POST',{...schedule,periodo_grado_curso_id:4})).status,400);
   assert.equal((await call('/horarios/'+scheduleId,'PUT',{aula:'A2'})).status,200);const [updated]=await db.query('SELECT profesor_id FROM horarios WHERE id=?',[scheduleId]);assert.equal(updated[0].profesor_id,1);
  });
  await t.test('estructura valida selección, mantiene unicidad y no crea relaciones generales',async()=>{
   for(const body of [{profesor_ids:[]},{profesor_ids:[2,2]},{profesor_ids:[4]},{profesor_ids:[999]}])assert.equal((await call(root+'/cursos/1/profesores','POST',body)).status,400);
   const result=await Promise.all([call(root+'/cursos/1/profesores','POST',{profesor_ids:[2]}),call(root+'/cursos/1/profesores','POST',{profesor_ids:[2]})]);assert.ok(result.every(r=>r.status===201));
   const [rows]=await db.query('SELECT COUNT(*) total FROM periodo_grado_curso_profesores WHERE periodo_grado_curso_id=1 AND profesor_id=2');assert.equal(rows[0].total,1);
   const [legacy]=await db.query('SELECT COUNT(*) total FROM profesor_curso');assert.equal(legacy[0].total,1);
  });
  await t.test('varios docentes requieren elección y editar no reemplaza al responsable',async()=>{
   assert.equal((await call('/horarios','POST',{...schedule,dia_semana:'Martes',hora_inicio:'10:00',hora_fin:'11:00'})).status,400);
   assert.equal((await call('/horarios','POST',{...schedule,profesor_id:2,dia_semana:'Martes',hora_inicio:'10:00',hora_fin:'11:00'})).status,201);
   assert.equal((await call('/horarios/'+scheduleId,'PUT',{hora_inicio:'07:00',hora_fin:'08:00'})).status,200);
   const [rows]=await db.query('SELECT profesor_id FROM horarios WHERE id=?',[scheduleId]);assert.equal(rows[0].profesor_id,1);
   assert.equal((await call('/horarios','POST',{...schedule,periodo_grado_curso_id:2,profesor_id:2,dia_semana:'Martes',hora_inicio:'10:30',hora_fin:'11:30'})).status,409);
   assert.equal((await call('/horarios','POST',{...schedule,profesor_id:1,dia_semana:'Martes',hora_inicio:'10:30',hora_fin:'11:30'})).status,409);
  });
  await t.test('asignación y alumno se mantienen separados por oferta y periodo',async()=>{
   assert.equal((await call(root+'/ofertas/2','GET',undefined,'p1')).status,404);
   assert.deepEqual((await call('/estudiante/periodo?periodo_id=1','GET',undefined,'student')).data?.cursos?.[0]?.profesores?.map(p=>p.id)?.sort(),[1,2]);
   const family=await call('/apoderados/me/alumnos/1/resumen?periodo_id=1','GET',undefined,'guardian');assert.equal(family.status,200);assert.equal(family.data.resumen.cursos,1);
   assert.equal((await call(root+'/cursos/4/profesores','POST',{profesor_ids:[3]},'owner')).status,201);
   assert.equal((await call(root+'/cursos/1/profesores','POST',{profesor_ids:[3]},'p1')).status,403);
  });
  await t.test('conserva historial: no retira responsable con horario, oferta con matrícula ni catálogo utilizado',async()=>{
   assert.equal((await call(root+'/cursos/1/profesores/1','DELETE')).status,409);
   assert.equal((await call(root+'/cursos/1','DELETE')).status,409);
   assert.equal((await call(root+'/periodos/1/grados/1','DELETE')).status,409);
   assert.equal((await call('/cursos/1','DELETE')).status,409);
   assert.equal((await call('/horarios')).data.some(h=>h.id===scheduleId),true);
  });
  await t.test('cruces de aula y altas concurrentes se resuelven en servidor',async()=>{
   assert.equal((await call('/horarios','POST',{...schedule,periodo_grado_curso_id:4,dia_semana:'Miercoles',hora_inicio:'12:00',hora_fin:'13:00',aula:'Compartida'})).status,201);
   assert.equal((await call('/horarios','POST',{...schedule,periodo_grado_curso_id:2,profesor_id:2,dia_semana:'Miercoles',hora_inicio:'12:30',hora_fin:'13:30',aula:'Compartida'})).status,409);
   const request={...schedule,periodo_grado_curso_id:2,profesor_id:2,dia_semana:'Jueves',hora_inicio:'10:00',hora_fin:'11:00'};
   assert.deepEqual((await Promise.all([call('/horarios','POST',request),call('/horarios','POST',request)])).map(r=>r.status).sort(),[201,409]);
  });
  await t.test('retirar asignación concurrentemente con alta de horario no deja una sesión huérfana',async()=>{
   for(let attempt=0;attempt<8;attempt++){
    assert.equal((await call(root+'/cursos/5/profesores','POST',{profesor_ids:[2]})).status,201);
    const request={...schedule,periodo_grado_curso_id:5,profesor_id:2,dia_semana:'Viernes'};
    const [created,removed]=await Promise.all([call('/horarios','POST',request),call(root+'/cursos/5/profesores/2','DELETE')]);
    assert.ok((created.status===201&&removed.status===409)||([400,409].includes(created.status)&&removed.status===200),JSON.stringify({created,removed}));
    const [orphans]=await db.query('SELECT COUNT(*) total FROM horarios h WHERE h.periodo_grado_curso_id=5 AND NOT EXISTS(SELECT 1 FROM periodo_grado_curso_profesores a WHERE a.periodo_grado_curso_id=h.periodo_grado_curso_id AND a.profesor_id=h.profesor_id)');assert.equal(orphans[0].total,0);
    if(created.status===201){assert.equal((await call('/horarios/'+created.data.id,'DELETE')).status,200);assert.equal((await call(root+'/cursos/5/profesores/2','DELETE')).status,200);}
   }

  });
  await t.test('docente inactivo no recibe sesiones nuevas; editar su registro existente conserva responsable e historial',async()=>{
   await db.query('UPDATE usuarios SET activo=0 WHERE id=2');
   try{assert.equal((await call('/horarios','POST',{...schedule,profesor_id:1,dia_semana:'Sabado'})).status,400);assert.equal((await call('/horarios/'+scheduleId,'PUT',{aula:'Historial conservado'})).status,200);const [rows]=await db.query('SELECT profesor_id FROM horarios WHERE id=?',[scheduleId]);assert.equal(rows[0].profesor_id,1);}finally{await db.query('UPDATE usuarios SET activo=1 WHERE id=2');}
  });
  await t.test('clonado reutiliza asignaciones específicas, omite inactivos, valida periodos y no duplica ni sincroniza catálogo',async()=>{
   await db.query("INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(3,'Destino','2027-01-01','2027-12-31',0)");
   await db.query('UPDATE usuarios SET activo=0 WHERE id=4');
   try{const cloned=await call(root+'/periodos/3/clonar','POST',{periodo_origen_id:1});assert.equal(cloned.status,200);assert.ok(cloned.data.profesores_omitidos.includes(3));const again=await call(root+'/periodos/3/clonar','POST',{periodo_origen_id:1});assert.equal(again.data.profesores_asignados,0);const [legacy]=await db.query('SELECT COUNT(*) total FROM profesor_curso');assert.equal(legacy[0].total,1);}
   finally{await db.query('UPDATE usuarios SET activo=1 WHERE id=4');}
   assert.equal((await call(root+'/periodos/999/clonar','POST',{periodo_origen_id:1})).status,404);
   assert.equal((await call(root+'/ofertas?periodo_id=bad')).status,400);
  });
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();await original.end();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(directory,{recursive:true,force:true});}
});
