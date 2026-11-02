const {test} = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const express = require('express');
const jwt = require('jsonwebtoken');
const original = require('../dist/config/database').default;
const {migratePayments} = require('../scripts/migrate-payments.cjs');

test('pagos HTTP y persistencia en MySQL aislado',async t=>{
 const database = 'payments_test_'+Date.now()+'_'+process.pid;
 assert.match(database,/^payments_test_\d+_\d+$/);
 const settings = {host:process.env.DB_HOST || 'localhost',port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',charset:'utf8mb4',dateStrings:true};
 const admin = await mysql.createConnection(settings);
 let db,server;
 try {
  await admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=mysql.createPool({...settings,database,connectionLimit:5});
  for(const sql of [
   "CREATE TABLE roles(id INT PRIMARY KEY,nombre VARCHAR(50))",
   'CREATE TABLE usuarios (id INT AUTO_INCREMENT PRIMARY KEY,nombre VARCHAR(50),apellido VARCHAR(50),telefono VARCHAR(30),email VARCHAR(100),dni VARCHAR(20),direccion VARCHAR(100),fecha_nacimiento DATE,genero VARCHAR(20),foto_url VARCHAR(100),password_hash VARCHAR(255) DEFAULT \'hash\',debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0,rol_id INT,activo TINYINT DEFAULT 1)',
   "CREATE TABLE alumnos (id INT AUTO_INCREMENT PRIMARY KEY,usuario_id INT,codigo_alumno VARCHAR(20),grado_id INT,periodo_academico_id INT,estado VARCHAR(20) DEFAULT 'matriculado')",
   'CREATE TABLE profesores (id INT PRIMARY KEY,usuario_id INT)',
   'CREATE TABLE periodos_academicos (id INT PRIMARY KEY,nombre VARCHAR(50),fecha_inicio DATE,fecha_fin DATE,activo TINYINT DEFAULT 0)',
   'CREATE TABLE cursos (id INT PRIMARY KEY,nombre VARCHAR(50),codigo VARCHAR(20),grado_id INT)',
    'CREATE TABLE grados (id INT PRIMARY KEY,nombre VARCHAR(50),nivel VARCHAR(20))',
   'CREATE TABLE matriculas (id INT AUTO_INCREMENT PRIMARY KEY,alumno_id INT,curso_id INT NULL,grado_id INT NULL,periodo_academico_id INT,estado VARCHAR(20),fecha_matricula DATE,observaciones TEXT,UNIQUE KEY unique_matricula(alumno_id,curso_id,periodo_academico_id))',
   'CREATE TABLE periodo_grado_cursos (id INT AUTO_INCREMENT PRIMARY KEY,periodo_academico_id INT,grado_id INT,curso_id INT)',
   'CREATE TABLE profesor_curso (profesor_id INT,curso_id INT,origen VARCHAR(20))',
   'CREATE TABLE periodo_grado_curso_profesores (periodo_grado_curso_id INT,profesor_id INT)',
   'CREATE TABLE evaluaciones (id INT PRIMARY KEY,nota_maxima DECIMAL(4,2))',
   'CREATE TABLE calificaciones (id INT PRIMARY KEY,alumno_id INT,curso_id INT,periodo_academico_id INT,fecha_evaluacion DATE,nota DECIMAL(4,2),evaluacion_id INT)',
   'CREATE TABLE asistencias (id INT PRIMARY KEY,alumno_id INT,curso_id INT,periodo_grado_curso_id INT,fecha DATE,estado VARCHAR(20))',
   "CREATE TABLE mensualidades (id INT AUTO_INCREMENT PRIMARY KEY,alumno_id INT NOT NULL,curso_id INT NOT NULL,periodo_academico_id INT NOT NULL,monto DECIMAL(10,2),mes VARCHAR(20),año YEAR,estado ENUM('pendiente','pagado','vencido','descuento') DEFAULT 'pendiente',fecha_pago DATE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(alumno_id) REFERENCES alumnos(id),FOREIGN KEY(periodo_academico_id) REFERENCES periodos_academicos(id))",
   "CREATE TABLE sueldos (id INT AUTO_INCREMENT PRIMARY KEY,profesor_id INT NOT NULL,curso_id INT NOT NULL,periodo_academico_id INT NOT NULL,salario_base DECIMAL(10,2),horas_clase DECIMAL(5,2),monto_extra DECIMAL(10,2),monto_total DECIMAL(10,2),mes VARCHAR(20),año YEAR,estado ENUM('pendiente','pagado','rechazado') DEFAULT 'pendiente',fecha_pago DATE,observaciones TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(profesor_id) REFERENCES profesores(id))",
   "INSERT INTO roles VALUES(1,'administrador'),(2,'profesor'),(3,'alumno')",
   "INSERT INTO usuarios(id,nombre,apellido,telefono,rol_id) VALUES(1,'Alumno','Prueba','',3),(2,'Profesor','Prueba','',2),(3,'Admin','Prueba','',1),(4,'Ajeno','Alumno','',3),(999,'Sin','Asignación','',2)",
   "INSERT INTO alumnos(id,usuario_id,codigo_alumno) VALUES(1,1,'TEST')", 'INSERT INTO profesores VALUES(1,2)',
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Periodo A','2026-03-01','2026-12-31',1),(2,'Periodo B','2027-03-01','2027-12-31',0)",
   "INSERT INTO grados VALUES(1,'Primero','Secundaria'),(2,'Segundo','Secundaria')",
   "INSERT INTO cursos VALUES(1,'Matemática','MAT',1),(2,'Historia','HIS',1),(3,'Ciencias','CIE',2)",
   "INSERT INTO matriculas(alumno_id,curso_id,grado_id,periodo_academico_id,estado,fecha_matricula) VALUES(1,1,1,1,'activa','2026-03-01'),(1,2,1,1,'activa','2026-03-01'),(1,3,2,2,'activa','2027-03-01')",
   "INSERT INTO periodo_grado_cursos(periodo_academico_id,grado_id,curso_id) VALUES(1,1,1),(1,1,2)"
   ,"INSERT INTO profesor_curso VALUES(1,1,'manual')"
   ,"INSERT INTO periodo_grado_curso_profesores VALUES(1,1)"
  ]) await db.query(sql);
  await migratePayments(db);await migratePayments(db);
  // Controladores y rutas reales, conectados exclusivamente a la base temporal.
  require.cache[require.resolve('../dist/config/database')].exports.default=db;
  process.env.JWT_SECRET='payments-test-only-secret';
  const app=express();app.use(express.json());
  app.use('/mensualidades',require('../dist/routes/mensualidades.routes').default);
  app.use('/sueldos',require('../dist/routes/sueldos.routes').default);
  app.use('/alumnos',require('../dist/routes/alumnos.routes').default);
  app.use('/matriculas',require('../dist/routes/matriculas.routes').default);
  app.use('/pagos-matricula',require('../dist/routes/pagosMatricula.routes').default);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const {credentialVersion}=require('../dist/utils/session');
  const [accounts]=await db.query('SELECT id,password_hash FROM usuarios');
  const hashes=new Map(accounts.map(u=>[u.id,u.password_hash]));
  const sign=claims=>jwt.sign({...claims,credentialVersion:credentialVersion(hashes.get(claims.userId),process.env.JWT_SECRET)},process.env.JWT_SECRET);
  const token=sign({userId:3,rol:'administrador'});
  async function call(route,method='GET',body,auth=token) {
   const res=await fetch('http://127.0.0.1:'+server.address().port+route,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return {status:res.status,...await res.json()};
  }
  const monthly={alumno_id:1,periodo_academico_id:1,mes:'Octubre',año:2026,monto:200};
  let matriculaId,monthlyId;
  await t.test('autorización administrativa',async()=>{assert.equal((await call('/mensualidades','GET',undefined,null)).status,401);const student=sign({userId:1,rol:'alumno'});assert.equal((await call('/pagos-matricula','GET',undefined,student)).status,403);});
  await t.test('matrícula pagada no paga mensualidad',async()=>{
   const m=await call('/pagos-matricula','POST',{alumno_id:1,matricula_id:1,monto:100,estado:'pagado',fecha_pago:'2026-10-07'});assert.equal(m.status,201);matriculaId=m.data.id;
   const r=await call('/mensualidades','POST',monthly);assert.equal(r.status,201);monthlyId=r.data.id;
   const [rows]=await db.query('SELECT estado,curso_id FROM mensualidades WHERE id=?',[monthlyId]);assert.equal(rows[0].estado,'pendiente');assert.equal(rows[0].curso_id,null);
   assert.equal((await call('/mensualidades/resumen?estado=pagado')).data.length,0);
   assert.equal(Number((await call('/pagos-matricula/resumen')).data[0].total_pagado),100);
  });
  await t.test('unicidad por concepto, alumno, periodo y mes/año',async()=>{
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:1,matricula_id:1,monto:100})).status,409);
   assert.equal((await call('/mensualidades','POST',monthly)).status,409);
   assert.equal((await call('/mensualidades','POST',{...monthly,periodo_academico_id:2})).status,201);
   assert.equal((await call('/mensualidades','POST',{...monthly,mes:'Noviembre'})).status,201);
   assert.equal((await call('/mensualidades','POST',{...monthly,año:2027})).status,201);
   const filtered=await call('/mensualidades?periodo_academico_id=1&mes=Octubre&a%C3%B1o=2026');assert.equal(filtered.total,1);
  });
  await t.test('mensualidad pagada no paga matrícula y cambio de estado conserva monto',async()=>{
   assert.equal((await call('/pagos-matricula/'+matriculaId,'PUT',{estado:'pendiente'})).status,200);
   assert.equal((await call('/mensualidades/'+monthlyId,'PUT',{estado:'pagado',fecha_pago:'2026-10-08'})).status,200);
   const r=await call('/mensualidades/'+monthlyId);assert.equal(Number(r.data.monto),200);assert.equal(r.data.fecha_pago,'2026-10-08');
   assert.equal((await call('/pagos-matricula/'+matriculaId)).data.estado,'pendiente');
  });
  await t.test('deuda respeta periodo, estado, mes/año y búsqueda',async()=>{
   const debt=await call('/mensualidades/alumnos-con-deuda?periodo_academico_id=2&mes=Octubre&a%C3%B1o=2026&estado=pendiente&search=TEST');
   assert.equal(debt.status,200);assert.equal(debt.data.length,1);assert.equal(Number(debt.data[0].total_deuda),200);
   assert.equal((await call('/mensualidades/alumnos-con-deuda?estado=pagado')).data.length,0);
   assert.equal((await call('/mensualidades/alumnos-con-deuda?mes=Matricula')).status,400);
  });
  await t.test('validación y existencia de referencias',async()=>{
   for(const body of [{...monthly,monto:-1},{...monthly,mes:'Matrícula'},{...monthly,periodo_academico_id:null},{...monthly,estado:'pagado',fecha_pago:'2026-02-30'},{...monthly,año:0}]) assert.equal((await call('/mensualidades','POST',body)).status,400);
   assert.equal((await call('/mensualidades','POST',{...monthly,alumno_id:999})).status,404);
   assert.equal((await call('/mensualidades/999','PUT',{estado:'pagado',fecha_pago:'2026-10-07'})).status,404);
  });
  await t.test('profesor consulta solo cursos de su alcance sin datos financieros',async()=>{
   const teacher=sign({userId:2,rol:'profesor'});
   const response=await call('/alumnos/1/matriculas','GET',undefined,teacher);assert.equal(response.status,200);assert.equal(response.data.length,1);assert.equal(response.data[0].inscripciones.length,1);assert.equal(response.data[0].inscripciones[0].curso_id,1);assert.ok(!('pago' in response.data[0]));
   const unassigned=sign({userId:999,rol:'profesor'});
   assert.equal((await call('/alumnos/1/matriculas','GET',undefined,unassigned)).status,404);
  });
  await t.test('pago deriva periodo y valida pertenencia, detalle refleja cursos y estado',async()=>{
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:1,monto:1,periodo_academico_id:1})).status,400);
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:1,monto:1,matricula_id:999})).status,400);
   const created=await call('/pagos-matricula','POST',{alumno_id:1,matricula_id:3,periodo_academico_id:999,monto:150});assert.equal(created.status,201);
   assert.equal((await call('/pagos-matricula/'+created.data.id)).data.periodo_academico_id,2);
   const ownToken=sign({userId:1,rol:'alumno'});
   const before=await call('/alumnos/1','GET',undefined,ownToken);assert.equal(before.status,200);
   const groups=before.data.matriculas_academicas;
   assert.equal(groups.length,2);assert.equal(groups.find(g=>g.periodo_academico_id===1).inscripciones.length,2);
   assert.equal(groups.find(g=>g.periodo_academico_id===2).inscripciones[0].curso,'Ciencias');
   assert.equal(groups.find(g=>g.periodo_academico_id===2).pago.estado,'pendiente');
   await call('/pagos-matricula/'+created.data.id,'PUT',{estado:'pagado',fecha_pago:'2027-03-01'});
   const after=await call('/alumnos/1','GET',undefined,ownToken);
   assert.equal(after.data.matriculas_academicas.find(g=>g.periodo_academico_id===2).pago.estado,'pagado');
   assert.equal(after.data.matriculas_academicas.find(g=>g.periodo_academico_id===1).pago.estado,'pendiente');
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:1,matricula_id:2,monto:1})).status,409);
   assert.equal((await call('/pagos-matricula/'+created.data.id,'PUT',{matricula_id:1})).status,400);
   const otherToken=sign({userId:4,rol:'alumno'});
   assert.equal((await call('/alumnos/1/matriculas','GET',undefined,otherToken)).status,404);
  });
  await t.test('alta personal sin grado/periodo, matrícula asigna cursos y pago exige esa inscripción',async()=>{
   const personal={password:'Synthetic-2026!',nombre:'Nuevo',apellido:'Alumno',email:'nuevo@example.test',genero:'Otro'};
   assert.equal((await call('/alumnos','POST',{...personal,grado_id:1})).status,400);
   const student=await call('/alumnos','POST',personal);assert.equal(student.status,201);const alumnoId=student.data.id;
   const [initial]=await db.query('SELECT grado_id,periodo_academico_id FROM alumnos WHERE id=?',[alumnoId]);assert.equal(initial[0].grado_id,null);assert.equal(initial[0].periodo_academico_id,null);
   assert.equal((await call('/alumnos/'+alumnoId,'PUT',{grado_id:2})).status,400);
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:alumnoId,matricula_id:1,monto:1})).status,400);
   assert.equal((await call('/matriculas','POST',{alumno_id:alumnoId,periodo_academico_id:1})).status,400);
   const enrollment=await call('/matriculas','POST',{alumno_id:alumnoId,periodo_academico_id:1,grado_id:1});assert.equal(enrollment.status,201);assert.equal(enrollment.data.cursos_inscritos,2);
   const [newAccount]=await db.query('SELECT password_hash FROM usuarios WHERE id=?',[student.data.usuario_id]);hashes.set(student.data.usuario_id,newAccount[0].password_hash);
   const own=sign({userId:student.data.usuario_id,rol:'alumno'});
   const detail=await call('/alumnos/'+alumnoId,'GET',undefined,own);assert.equal(detail.status,200);assert.equal(detail.data.grado_id,1);assert.equal(detail.data.periodo_academico_id,1);assert.equal(detail.data.matriculas_academicas[0].inscripciones.length,2);assert.equal(detail.data.matriculas_academicas[0].pago,null);
   const paid=await call('/pagos-matricula','POST',{alumno_id:alumnoId,matricula_id:enrollment.data.id,monto:120,estado:'pagado',fecha_pago:'2026-10-07'});assert.equal(paid.status,201);
   const refreshed=await call('/alumnos/'+alumnoId,'GET',undefined,own);assert.equal(refreshed.data.matriculas_academicas[0].pago.estado,'pagado');
   assert.equal((await call('/pagos-matricula','POST',{alumno_id:alumnoId,matricula_id:enrollment.data.ids[1],monto:120})).status,409);
  });
  await t.test('profesor con tres campos, pagado, sin curso ni periodo académico',async()=>{
   const r=await call('/sueldos','POST',{profesor_id:1,mes:'Octubre',año:2026,monto:700});assert.equal(r.status,201);
   const row=(await call('/sueldos/'+r.data.id)).data;assert.equal(row.estado,'pagado');assert.match(row.fecha_pago,/^\d{4}-\d{2}-\d{2}$/);assert.equal(row.curso_id,null);assert.equal(row.periodo_academico_id,null);assert.equal(Number(row.monto_total),700);
   assert.equal((await call('/sueldos','POST',{profesor_id:1,mes:'Octubre',año:2026,monto:800})).status,409);
   assert.equal((await call('/sueldos','POST',{profesor_id:1,mes:'Octubre',año:2027,monto:800})).status,201);
   assert.equal((await call('/sueldos/'+r.data.id,'PUT',{monto:750})).status,200);assert.equal(Number((await call('/sueldos/'+r.data.id)).data.monto_total),750);
  });
  await t.test('altas concurrentes no duplican conceptos',async()=>{
   for(const [path,body] of [['/mensualidades',{...monthly,mes:'Diciembre'}],['/sueldos',{profesor_id:1,mes:'Diciembre',año:2026,monto:900}]]) {
    const results=await Promise.all([call(path,'POST',body),call(path,'POST',body)]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
   }
  });
  await t.test('índices impiden duplicados por SQL directo',async()=>{
   await assert.rejects(db.query("INSERT INTO mensualidades(alumno_id,periodo_academico_id,monto,mes,año) VALUES(1,1,1,'Octubre',2026)"),e=>e.code==='ER_DUP_ENTRY');
   await assert.rejects(db.query('INSERT INTO pagos_matricula(alumno_id,periodo_academico_id,monto) VALUES(1,1,1)'),e=>e.code==='ER_DUP_ENTRY');
  });
  await t.test('migración conserva sueldos históricos duplicados y bloqueo evita nuevas altas duplicadas',async()=>{
   await db.query('ALTER TABLE sueldos ADD INDEX idx_profesor_historial(profesor_id), DROP INDEX unique_sueldo_mensual');
   await db.query("INSERT INTO sueldos(profesor_id,curso_id,periodo_academico_id,salario_base,horas_clase,monto_extra,monto_total,mes,año) VALUES(1,1,1,100,2,50,250,'Enero',2025),(1,2,1,200,0,0,200,'Enero',2025)");
   const [before]=await db.query("SELECT * FROM sueldos WHERE mes='Enero' AND año=2025 ORDER BY id");
   await migratePayments(db);
   const [after]=await db.query("SELECT * FROM sueldos WHERE mes='Enero' AND año=2025 ORDER BY id");assert.deepEqual(after,before);
   assert.equal((await call('/sueldos','POST',{profesor_id:1,mes:'Enero',año:2025,monto:300})).status,409);
   const concurrent=await Promise.all([call('/sueldos','POST',{profesor_id:1,mes:'Febrero',año:2025,monto:300}),call('/sueldos','POST',{profesor_id:1,mes:'Febrero',año:2025,monto:300})]);
   assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
   assert.equal((await call('/sueldos/'+after[0].id,'PUT',{estado:'pagado',fecha_pago:'2025-01-31'})).status,200);
   const saved=(await call('/sueldos/'+after[0].id)).data;
   assert.equal(Number(saved.monto_total),250);assert.equal(Number(saved.horas_clase),2);assert.equal(Number(saved.monto_extra),50);assert.equal(saved.curso_id,1);
  });
  await t.test('persistencia comprobada en una conexión independiente',async()=>{
   const second=await mysql.createConnection({...settings,database});try{const [r]=await second.query('SELECT estado,monto FROM mensualidades WHERE id=?',[monthlyId]);assert.equal(r[0].estado,'pagado');assert.equal(Number(r[0].monto),200);}finally{await second.end();}
  });
 } finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(db)await db.end();
  await admin.query('DROP DATABASE IF EXISTS `'+database+'`');await admin.end();await original.end();
 }
});
