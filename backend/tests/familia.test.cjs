const {test}=require('node:test');const assert=require('node:assert/strict');
let query;
const dbPath=require.resolve('../dist/config/database');require.cache[dbPath]={exports:{__esModule:true,default:{query:(...args)=>query(...args)}}};
const {getInicioFamilia,getDetalleFamilia}=require('../dist/controllers/familia.controller');
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('datos inválidos se rechazan antes de consultar vínculos',async()=>{
 query=()=>assert.fail('No debe consultar SQL');
 for(const [alumnoId,periodo_id]of [['0',undefined],['bad','1'],['1','-1'],['1',['1']]]){const res=response();await getDetalleFamilia({user:{userId:21},params:{alumnoId},query:periodo_id===undefined?{}:{periodo_id}},res);assert.equal(res.code,400);}
});
test('estudiante ajeno o sin vínculo devuelve 404 sin consultar su expediente',async()=>{
 let calls=0;query=async(sql,args)=>{calls++;assert.ok(sql.includes('ap.usuario_id=?'));assert.deepEqual(args,[21,3]);return [[]];};
 const res=response();await getDetalleFamilia({user:{userId:21},params:{alumnoId:'3'},query:{}},res);assert.equal(res.code,404);assert.equal(calls,1);
});
test('inicio vacío es un vacío legítimo, no registros inventados',async()=>{
 query=async()=>[[]];const res=response();await getInicioFamilia({user:{userId:23}},res);assert.equal(res.code,200);assert.deepEqual(res.body.data,[]);
});
test('fallos de base de datos no se convierten en resumen vacío ni respuesta exitosa',async()=>{
 query=async()=>{throw Error('Fallo sintético');};
 for(const fn of [getInicioFamilia,getDetalleFamilia]){const res=response();await fn({user:{userId:21},params:{alumnoId:'1'},query:{}},res);assert.equal(res.code,500);assert.equal(res.body.success,false);assert.equal('data' in res.body,false);}
});
