const {test} = require('node:test');
const assert = require('node:assert/strict');
const dbPath = require.resolve('../dist/config/database');
let handler, released, rolledBack;
const connection = { query: (...args)=>handler(...args), beginTransaction:async()=>{}, commit:async()=>{}, rollback:async()=>{rolledBack=true;}, release:()=>{released=true;} };
require.cache[dbPath] = {id:dbPath,filename:dbPath,loaded:true,exports:{__esModule:true,default:{query:(...args)=>handler(...args),getConnection:async()=>connection}}};
const {validarPago,controladoresPago} = require('../dist/utils/pagos');
const valid = {alumno_id:1,periodo_academico_id:1,monto:'150.25',mes:'Octubre',año:2026,estado:'pendiente'};
async function invoke(fn,body={},id='1',query={}) {
 let status=200,result;
 await fn({body,params:{id},query},{status(n){status=n;return this;},json(value){result=value;return value;}});
 return {status,...result};
}
test('valida identidades, importe, mes/año, estado y fechas reales',()=>{
 assert.equal(validarPago('mensualidad',valid).monto,150.25);
 for(const change of [{alumno_id:0},{alumno_id:1.5},{periodo_academico_id:null},{monto:-1},{monto:'abc'},{monto:'1.001'},{monto:Infinity},{monto:100000000},{mes:'Matrícula'},{mes:'13'},{año:0},{año:2156},{año:2026.5},{estado:'activa'},{estado:'pagado'},{estado:'pagado',fecha_pago:'2026-02-30'},{fecha_pago:'2026-10-07'}]) assert.throws(()=>validarPago('mensualidad',{...valid,...change}));
 assert.equal(validarPago('mensualidad',{...valid,estado:'pagado',fecha_pago:'2024-02-29'}).fechaPago,'2024-02-29');
 assert.equal(validarPago('matricula',{alumno_id:1,periodo_academico_id:1,monto:0}).mes,null);
 assert.throws(()=>validarPago('matricula',{alumno_id:1,periodo_academico_id:1,monto:1,estado:'vencido'}));
});
test('rechaza datos inválidos antes de escribir',async()=>{
 handler=()=>{throw Error('No debe consultar');};
 const r=await invoke(controladoresPago('mensualidad').create,{...valid,monto:-1});
 assert.equal(r.status,400); assert.equal(r.success,false);
});
test('no informa éxito si falla INSERT y revierte la transacción',async()=>{
 released=false;rolledBack=false;
 handler=async(sql)=>{
  if(sql.startsWith('INSERT')) throw Object.assign(Error('fallo simulado'),{code:'ER_NO_REFERENCED_ROW_2'});
  return [sql.includes('SELECT id FROM mensualidades') ? [] : [{id:1}]];
 };
 const r=await invoke(controladoresPago('mensualidad').create,valid);
 assert.equal(r.status,400);assert.equal(r.success,false);assert.ok(released);assert.ok(rolledBack);
});
test('duplicado devuelve 409 sin INSERT',async()=>{
 handler=async(sql)=>{assert.ok(!sql.startsWith('INSERT'));return [[{id:1}]];};
 const r=await invoke(controladoresPago('mensualidad').create,valid);assert.equal(r.status,409);
});
test('actualizar un estado no recalcula ni borra el sueldo histórico',async()=>{
 let update;
 handler=async(sql,params)=>{
  if(sql.startsWith('SELECT *'))return [[{id:1,profesor_id:2,monto_total:'450.00',salario_base:'300.00',horas_clase:'2',monto_extra:'50',mes:'Octubre',año:2026,estado:'pendiente',fecha_pago:null}]];
  if(sql.startsWith('SELECT id FROM sueldos'))return [[]];
  if(sql.startsWith('UPDATE')){update={sql,params};return [{affectedRows:1}];}
  return [[{id:2}]];
 };
 const r=await invoke(controladoresPago('sueldo').update,{estado:'pagado',fecha_pago:'2026-10-07'});
 assert.equal(r.status,200);assert.equal(update.params[1],450);assert.ok(!update.sql.includes('horas_clase'));assert.ok(!update.sql.includes('salario_base'));
});
test('404 en modificación y eliminación inexistentes',async()=>{
 handler=async(sql)=>[sql.startsWith('DELETE')?{affectedRows:0}:[]];
 assert.equal((await invoke(controladoresPago('matricula').update,{monto:1})).status,404);
 assert.equal((await invoke(controladoresPago('mensualidad').remove)).status,404);
});
test('resumen filtra concepto, periodo, mes/año, estado y búsqueda',async()=>{
 let seen;
 handler=async(sql,params)=>{seen={sql,params};return [[]];};
 const r=await invoke(controladoresPago('mensualidad').summary,{},'1',{periodo_academico_id:'2',mes:'Octubre',año:'2026',estado:'pagado',search:'Prueba'});
 assert.equal(r.status,200);assert.match(seen.sql,/FROM mensualidades/);assert.ok(!seen.sql.includes('pagos_matricula'));assert.deepEqual(seen.params,['%Prueba%','%Prueba%','%Prueba%',2,'pagado','Octubre',2026]);
});

test('agrupa matrículas por periodo y grado conservando cursos y un pago de referencia',()=>{
 const {agruparMatriculasAlumno}=require('../dist/utils/matriculasAlumno');
 const rows=[{id:3,periodo_academico_id:1,grado_id:1,curso_id:1,curso:'Matemática',pago_id:5,pago_estado:'pagado'},
 {id:2,periodo_academico_id:1,grado_id:1,curso_id:2,curso:'Historia',pago_id:5,pago_estado:'pagado'},
 {id:4,periodo_academico_id:2,grado_id:2,curso_id:3,curso:'Ciencias'},
 {id:6,periodo_academico_id:1,grado_id:2,curso_id:4,curso:'Otro',pago_id:5,pago_estado:'pagado'}];
 const result=agruparMatriculasAlumno(rows);assert.equal(result.length,3);assert.equal(result[0].id,2);assert.equal(result[0].inscripciones.length,2);assert.equal(result[0].pago.id,5);assert.equal(result[1].pago,null);assert.equal(result[2].pago.id,5);
 assert.ok(agruparMatriculasAlumno(rows,false).every(g=>!('pago' in g)));
});
test('alta de pago de matrícula requiere inscripción antes de consultar DB',async()=>{
 handler=()=>{throw Error('No debe consultar');};
 const result=await invoke(controladoresPago('matricula').create,{alumno_id:1,periodo_academico_id:1,monto:100});assert.equal(result.status,400);assert.equal(result.success,false);
});
test('alta y edición del alumno rechazan asignación académica fuera de matrícula',async()=>{
 const {createAlumno,updateAlumno}=require('../dist/controllers/alumnos.controller');
 handler=()=>{throw Error('No debe consultar');};
 assert.equal((await invoke(createAlumno,{grado_id:1})).status,400);
 assert.equal((await invoke(updateAlumno,{periodo_academico_id:1})).status,400);
});
