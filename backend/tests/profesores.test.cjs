const {test}=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../dist/config/database');
let handler,committed,rolledBack,released;
const connection={query:(...args)=>handler(...args),beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;}};
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{__esModule:true,default:{query:(...args)=>handler(...args),getConnection:async()=>connection}}};
const {validarRegistroProfesor}=require('../dist/utils/profesorAlcance');
const {bulkRegisterAsistencias}=require('../dist/controllers/asistencias.controller');
async function invoke(fn,body){let status=200,result;await fn({user:{userId:2,rol:'profesor'},body,params:{ofertaId:'1'}},{status(n){status=n;return this;},json(value){result=value;return value;}});return {status,...result};}
test('validación de inscripción, cierre histórico y fechas, sin escrituras',async()=>{
 handler=async sql=>{assert.ok(!sql.startsWith('INSERT'));return [[]];};
 assert.equal((await validarRegistroProfesor({query:handler},2,1,1,1)).status,403);
 handler=async()=>[[{activo:0,fecha_inicio:'2025-01-01',fecha_fin:'2025-12-31'}]];
 assert.equal((await validarRegistroProfesor({query:handler},2,1,1,2)).status,409);
 handler=async()=>[[{activo:1,fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31'}]];
 assert.equal(await validarRegistroProfesor({query:handler},2,1,1,1,'2026-10-07'),null);
 for(const date of ['2026-02-30','2025-10-07','2026-13-01',false]) assert.equal((await validarRegistroProfesor({query:handler},2,1,1,1,date)).status,400);
 assert.equal((await validarRegistroProfesor({query:handler},2,0,1,1)).status,400);
});
test('fallo durante lote de asistencia revierte todo y responde error',async()=>{
 let inserts=0;committed=false;rolledBack=false;released=false;
 handler=async(sql)=>{
  if(sql.startsWith('INSERT') && ++inserts===2)throw Error('Fallo de escritura simulado');
  if(sql.includes('DATE_FORMAT'))return [[{activo:1,fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31'}]];
  if(sql.includes('SELECT id FROM asistencias'))return [[]];
  return [[{id:1}]];
 };
 const item={alumno_id:1,curso_id:1,periodo_academico_id:1,fecha:'2026-10-07',estado:'presente'};
 const result=await invoke(bulkRegisterAsistencias,{asistencias:[item,{...item,alumno_id:2}]});
 assert.equal(result.status,500);assert.equal(result.success,false);assert.equal(inserts,2);assert.equal(committed,false);assert.ok(rolledBack);assert.ok(released);
});
test('no transforma lote inválido en asistencia registrada',async()=>{
 handler=()=>{throw Error('No debe consultar DB');};
 for(const items of [[],[null],[{fecha:'2026-02-30',estado:'presente'}],[{fecha:'2026-10-07',estado:'tardanza',minutos_tardanza:0}]]){
  const result=await invoke(bulkRegisterAsistencias,{asistencias:items});assert.equal(result.status,400);assert.equal(result.success,false);
 }
});

const {getMiPerfil,getMiResumen}=require('../dist/controllers/profesorPersonal.controller');
async function invokePersonal(fn,query={}){let status=200,result;await fn({user:{userId:2,rol:'profesor'},query},{status(n){status=n;return this;},json(value){result=value;return value;}});return {status,...result};}
test('perfil ausente devuelve 404 sin usar otro profesor',async()=>{handler=async(sql,params)=>{assert.deepEqual(params,[2]);return [[]];};for(const fn of [getMiPerfil,getMiResumen]){const r=await invokePersonal(fn);assert.equal(r.status,404);assert.equal(r.success,false);}});
test('fallo de consulta personal produce error, sin éxito de respaldo',async()=>{handler=async()=>{throw Error('Fallo de consulta simulado');};for(const fn of [getMiPerfil,getMiResumen]){const r=await invokePersonal(fn);assert.equal(r.status,500);assert.equal(r.success,false);assert.equal(r.data,undefined);}});

const {bulkRegisterCalificacionesOferta}=require('../dist/controllers/calificaciones.controller');
const {bulkRegisterAsistenciasOferta}=require('../dist/controllers/asistencias.controller');
test('fallo de conexión responde error en ambos lotes de oferta',async()=>{
 const db=require('../dist/config/database').default;const previous=db.getConnection;
 db.getConnection=async()=>{throw Error('Conexión no disponible');};
 try{for(const fn of [bulkRegisterCalificacionesOferta,bulkRegisterAsistenciasOferta]){const r=await invokePersonal(fn);assert.equal(r.status,500);assert.equal(r.success,false);}}
 finally{db.getConnection=previous;}
});
test('segundo INSERT de notas fallido revierte el lote completo',async()=>{
 let inserts=0;committed=false;rolledBack=false;released=false;
 handler=async sql=>{
  if(sql.includes('FROM periodo_grado_cursos pgc'))return [[{periodo_grado_curso_id:1,periodo_academico_id:1,grado_id:1,curso_id:1,periodo_activo:1}]];
  if(sql.includes('FROM evaluaciones'))return [[{id:1,estado:'activa',nota_maxima:20,fecha_evaluacion:'2026-10-14',tipo:'practica'}]];
  if(sql.includes('FROM matriculas'))return [[{alumno_id:1},{alumno_id:2}]];
  if(sql.includes('INSERT INTO calificaciones')&&++inserts===2)throw Error('Fallo de escritura simulado');
  return [[{id:1}]];
 };
 let status=200,result;await bulkRegisterCalificacionesOferta({user:{userId:2,rol:'profesor'},params:{ofertaId:'1',evaluacionId:'1'},body:{calificaciones:[{alumno_id:1,nota:12},{alumno_id:2,nota:14}]}},{status(n){status=n;return this;},json(v){result=v;return v;}});
 assert.equal(status,500);assert.equal(result.success,false);assert.equal(inserts,2);assert.equal(committed,false);assert.ok(rolledBack);assert.ok(released);
});

const {validGrade}=require('../dist/utils/academicValidation');
test('escala DECIMAL(4,2): cero válido, sin redondeos silenciosos ni coerción de booleanos',()=>{
 for(const value of [0,0.01,0.29,10.1,20])assert.ok(validGrade(value));
 for(const value of [null,true,[],{},'10',NaN,Infinity,-1,21,0.001,1.234])assert.equal(validGrade(value),false);
 for(const value of ['0','10.00',' 0.29 '])assert.ok(validGrade(value,true));
 for(const value of ['', ' ', '0.001',true,[]])assert.equal(validGrade(value,true),false);
});

const {getAllProfesores}=require('../dist/controllers/profesores.controller');
test('listado de profesores mantiene el filtro activo por defecto y permite incluir inactivos',async()=>{
 const previousQueries=[];
 handler=async(sql,params)=>{previousQueries.push({sql,params});return sql.startsWith('SELECT COUNT')?[[{total:0}]]:[[]];};
 async function listar(query={}) {
  let result;
  await getAllProfesores({query},{status(){return this;},json(value){result=value;return value;}});
  return result;
 }
 await listar();
 assert.match(previousQueries[0].sql,/WHERE u\.activo = 1/);
 previousQueries.length=0;
 await listar({incluir_inactivos:'true'});
 assert.doesNotMatch(previousQueries[0].sql,/u\.activo = 1/);
});
