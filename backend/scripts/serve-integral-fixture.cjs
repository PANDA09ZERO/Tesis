if(process.env.NODE_ENV==='production')throw new Error('Fixture bloqueado en producción');
// Prueba manual: solo estructura real y datos sintéticos en integral_test_*. Nunca usa filas de la base real.
const assert=require('node:assert/strict');const mysql=require('mysql2/promise');const express=require('express');const jwt=require('jsonwebtoken');
const original=require('../dist/config/database').default;
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
(async()=>{
 const name='integral_test_'+Date.now()+'_'+process.pid;assert.match(name,/^integral_test_\d+_\d+$/);
 const settings={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',charset:'utf8mb4',dateStrings:true};
 const admin=await mysql.createConnection(settings);let db,server;const uploads=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-e2e-uploads-'));
 try {
  const [source]=await original.query('SELECT DATABASE() name');assert.match(source[0].name,/^[a-zA-Z0-9_]+$/);
  await admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');db=mysql.createPool({...settings,database:name,connectionLimit:6});
  for(const table of ['roles','usuarios','profesores','grados','periodos_academicos','cursos','periodo_grados','periodo_grado_cursos','periodo_grado_curso_profesores','profesor_curso','alumnos','matriculas','evaluaciones','calificaciones','asistencias','horarios','pagos_matricula','mensualidades','sueldos','alertas_academicas','notificaciones','documentos','documentos_historial','documento_categorias','formularios_documentales','formularios_documentales_envios','registro_actividades','apoderados','apoderado_alumno','eventos_calendario'])await db.query('CREATE TABLE `'+table+'` LIKE `'+source[0].name+'`.`'+table+'`');
  await require('./migrate-report-rules.cjs').migrateReportRules(db);
  const [passwordChangeColumn]=await db.query("SHOW COLUMNS FROM usuarios LIKE 'debe_cambiar_password'");
  if(!passwordChangeColumn.length)await db.query('ALTER TABLE usuarios ADD COLUMN debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0');
  const {encryptPassword}=require('../dist/utils/encrypt');const passwordHash=encryptPassword('originalTest');
  await db.query("INSERT INTO roles(id,nombre) VALUES(1,'administrador'),(2,'profesor'),(3,'alumno'),(4,'apoderado'),(5,'superadministrador')");
  for(const [id,role] of [[31,5],[1,1],[2,2],[3,2],[11,3],[12,3],[13,3],[14,3],[15,3],[21,4],[22,4],[23,4]])await db.query('INSERT INTO usuarios(id,email,password_hash,nombre,apellido,rol_id) VALUES(?,?,?,?,?,?)',[id,'user'+id+'@test.local',passwordHash,'Usuario',String(id),role]);
  for(const sql of [
   'INSERT INTO profesores(id,usuario_id) VALUES(1,2),(2,3)',
   "INSERT INTO grados(id,nombre,nivel,orden) VALUES(1,'Primero','Primaria',1),(2,'Segundo','Primaria',2)",
   "INSERT INTO periodos_academicos(id,nombre,fecha_inicio,fecha_fin,activo) VALUES(1,'Actual','2026-01-01','2026-12-31',1),(2,'Anterior','2025-01-01','2025-12-31',0),(3,'Superpuesto','2026-01-01','2026-12-31',0)",
   "INSERT INTO cursos(id,nombre,codigo,grado_id) VALUES(1,'Compartido','COMP',1),(2,'Segundo curso','SEG',1),(3,'Ajeno','AJ',2)",
   'INSERT INTO periodo_grados(periodo_academico_id,grado_id) VALUES(1,1),(1,2),(2,2),(3,1)',
   'INSERT INTO periodo_grado_cursos(id,periodo_academico_id,grado_id,curso_id) VALUES(1,1,1,1),(2,1,1,2),(3,1,2,1),(4,2,2,1),(5,3,1,1)',
   'INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(1,1),(2,1),(4,1)',
   "INSERT INTO alumnos(id,usuario_id,codigo_alumno) VALUES(1,11,'A1'),(2,12,'A2'),(3,13,'A3'),(4,14,'A4'),(5,15,'A5')",
   "INSERT INTO matriculas(id,alumno_id,curso_id,grado_id,periodo_academico_id,estado) VALUES(1,1,1,1,1,'activa'),(2,1,2,1,1,'activa'),(3,1,1,2,2,'activa'),(4,1,1,1,3,'activa'),(5,2,1,2,1,'activa')",
   "INSERT INTO evaluaciones(id,periodo_grado_curso_id,nombre,fecha_evaluacion,nota_maxima) VALUES(1,1,'Diez','2026-10-14',10),(2,1,'Veinte','2026-10-14',20),(3,4,'Histórica','2025-10-14',20)",
   "INSERT INTO calificaciones(id,alumno_id,curso_id,periodo_academico_id,periodo_grado_curso_id,evaluacion_id,nota,fecha_evaluacion) VALUES(1,1,1,1,1,1,9,'2026-10-14'),(2,1,1,1,1,2,18,'2026-10-14'),(3,1,1,1,NULL,NULL,13,'2026-10-01'),(4,1,1,2,4,3,15,'2025-10-14')",
   "INSERT INTO asistencias(id,alumno_id,curso_id,periodo_grado_curso_id,fecha,estado) VALUES(1,1,1,1,'2026-10-14','presente'),(2,1,2,2,'2026-10-14','ausente'),(3,1,1,NULL,'2026-10-13','tardanza'),(4,1,1,NULL,'2025-10-14','presente')",
   'INSERT INTO apoderados(id,usuario_id) VALUES(1,21),(2,22),(3,23)',
   "INSERT INTO apoderado_alumno(apoderado_id,alumno_id,parentesco) VALUES(1,1,'Padre'),(1,2,'Padre'),(2,3,'Madre')",
   "INSERT INTO documentos(id,titulo,tipo_archivo,usuario_subio,alumno_id) VALUES(1,'Propio','pdf',1,1),(2,'Ajeno','pdf',1,3),(3,'General','pdf',1,NULL)"
  ])await db.query(sql);
  const fields=JSON.stringify([{id:'nombre',etiqueta:'Nombre',tipo:'texto',requerido:true}]);await db.query("INSERT INTO formularios_documentales(id,titulo,campos,estado,creado_por) VALUES(1,'Publicado',?,'publicada',1)",[fields]);
  require.cache[require.resolve('../dist/config/database')].exports.default=db;process.env.JWT_SECRET='integral-test-secret';
  const {credentialVersion}=require('../dist/utils/session');const sign=(userId,rol,hash=passwordHash)=>jwt.sign({userId,rol,credentialVersion:credentialVersion(hash,process.env.JWT_SECRET)},process.env.JWT_SECRET);
  const tokens={admin:sign(1,'administrador'),teacher:sign(2,'profesor'),a1:sign(11,'alumno'),g1:sign(21,'apoderado'),g2:sign(22,'apoderado'),none:sign(23,'apoderado')};
  let finish;const completed=new Promise(resolve=>finish=resolve);
  const app=express();app.use(express.json());
  app.get('/__test__/health',(_req,res)=>res.json({ready:true}));
  app.post('/__test__/shutdown',(req,res)=>{if(process.env.NODE_ENV!=='test'||req.get('X-Test-Key')!==process.env.FIXTURE_SHUTDOWN_KEY)return res.sendStatus(403);res.json({stopping:true});finish();});process.env.CORS_ORIGINS='http://127.0.0.1:5183';process.env.UPLOAD_DIRECTORY=uploads;process.env.OPERATIONS_DIRECTORY=path.join(uploads,'../'+path.basename(uploads)+'-operations');process.env.OPERATIONS_SINGLE_INSTANCE='false';
  app.use(require('../dist/app').default);
  server=await new Promise(resolve=>{const s=app.listen(Number(process.env.FIXTURE_PORT||4011),'127.0.0.1',()=>resolve(s));});
  if(process.send)process.send({ready:true});
  process.on('message',message=>{if(message.stop)finish();});
  async function call(route,method='GET',body,actor='admin'){const response=await fetch('http://127.0.0.1:'+server.address().port+'/api'+route,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+(tokens[actor]||actor)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};}
  console.log('Fixture sintético listo en puerto '+server.address().port+'; cierre controlado por IPC.');
  console.log('Base temporal:',name,'PID:',process.pid);
  process.stdin.once('data',finish);process.once('SIGINT',finish);process.once('SIGTERM',finish);await completed;
  process.stdin.pause();if(process.connected)process.disconnect();
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();await original.end();await fs.rm(uploads,{recursive:true,force:true});if(process.env.OPERATIONS_DIRECTORY){assert.ok(path.resolve(process.env.OPERATIONS_DIRECTORY).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(process.env.OPERATIONS_DIRECTORY,{recursive:true,force:true});}}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
