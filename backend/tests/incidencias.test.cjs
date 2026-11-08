const {test}=require('node:test');const assert=require('node:assert/strict');
let query;
const dbPath=require.resolve('../dist/config/database');require.cache[dbPath]={exports:{__esModule:true,default:{query:(...args)=>query(...args)}}};
const c=require('../dist/controllers/incidencias.controller');
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const admin={userId:1,rol:'administrador'},profesor={userId:7,rol:'profesor'};
const valida={alumno_id:3,fecha:'2026-10-01',tipo:'derivacion_direccion',gravedad:'moderada',descripcion:'Interrumpió la clase reiteradamente.'};

test('datos inválidos se rechazan antes de consultar la base',async()=>{
 query=()=>assert.fail('No debe consultar SQL');
 for(const body of [{},{...valida,alumno_id:'x'},{...valida,fecha:'2999-01-01'},{...valida,fecha:'2026-02-30'},{...valida,tipo:'pelea'},{...valida,gravedad:'alta'},{...valida,descripcion:'   '},{...valida,hora:'25:00'},{...valida,apoderado_notificado:'si'}]){
  const res=response();await c.createIncidencia({user:admin,body},res);assert.equal(res.code,400,JSON.stringify(body));}
});
test('administración registra una incidencia y queda auditada',async()=>{
 const sqls=[];query=async(sql,args)=>{sqls.push(sql);if(sql.startsWith('SELECT id FROM alumnos'))return [[{id:3}]];if(sql.includes('periodos_academicos'))return [[{id:5}]];if(sql.startsWith('INSERT INTO incidencias')){assert.equal(args[0],3);assert.equal(args[1],5);assert.equal(args[2],1);assert.equal(args[10],0);return [{insertId:11}];}return [{}];};
 const res=response();await c.createIncidencia({user:admin,body:valida},res);
 assert.equal(res.code,201);assert.equal(res.body.data.id,11);assert.ok(sqls.some(s=>s.includes('registro_actividades')));
});
test('un profesor no registra incidencias de alumnos fuera de su asignación',async()=>{
 query=async sql=>sql.startsWith('SELECT id FROM alumnos')?[[{id:3}]]:[[]];
 const res=response();await c.createIncidencia({user:profesor,body:valida},res);assert.equal(res.code,403);
});
test('un profesor no edita incidencias de otro docente ni cerradas',async()=>{
 query=async sql=>sql.startsWith('SELECT id, alumno_id')?[[{id:2,alumno_id:3,reportado_por:99,estado:'abierta'}]]:[[{1:1}]];
 let res=response();await c.updateIncidencia({user:profesor,params:{id:'2'},body:{gravedad:'leve'}},res);assert.equal(res.code,403);
 query=async sql=>sql.startsWith('SELECT id, alumno_id')?[[{id:2,alumno_id:3,reportado_por:7,estado:'cerrada'}]]:[[{1:1}]];
 res=response();await c.updateIncidencia({user:profesor,params:{id:'2'},body:{gravedad:'leve'}},res);assert.equal(res.code,409);
});
test('cerrar exige la resolución',async()=>{
 query=()=>assert.fail('No debe consultar SQL');
 const res=response();await c.updateEstadoIncidencia({user:admin,params:{id:'2'},body:{estado:'cerrada'}},res);assert.equal(res.code,400);
});
test('cerrar una incidencia inexistente devuelve 404',async()=>{
 query=async()=>[{affectedRows:0}];
 const res=response();await c.updateEstadoIncidencia({user:admin,params:{id:'2'},body:{estado:'cerrada',resolucion:'Se conversó con el apoderado.'}},res);assert.equal(res.code,404);
});
test('el listado del profesor se limita a sus alumnos y valida filtros',async()=>{
 let res=response();query=()=>assert.fail('No debe consultar SQL');await c.getIncidencias({user:profesor,query:{estado:'otra'}},res);assert.equal(res.code,400);
 const sqls=[];query=async(sql)=>{sqls.push(sql);return sql.includes('COUNT(*)')?[[{total:0}]]:[[]];};
 res=response();await c.getIncidencias({user:profesor,query:{}},res);assert.equal(res.code,200);assert.ok(sqls.every(s=>s.includes('scope_m')));
});
test('el apoderado no ve quién registró la incidencia',async()=>{
 query=async()=>[[{id:1,descripcion:'x',reportado_por:7,reportado_nombre:'Ana',reportado_apellido:'Ríos',cerrada_nombre:null,cerrada_apellido:null}]];
 const res=response();await c.getIncidenciasAlumno({user:{userId:21,rol:'apoderado'},params:{alumnoId:'3'}},res);
 assert.equal(res.code,200);assert.equal('reportado_nombre' in res.body.data[0],false);assert.equal(res.body.data[0].descripcion,'x');
});
test('fallos de base de datos no se presentan como éxito',async()=>{
 query=async()=>{throw Error('Fallo sintético');};
 const res=response();await c.getIncidencias({user:admin,query:{}},res);assert.equal(res.code,500);assert.equal(res.body.success,false);
});
