const {test}=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../dist/config/database');
require.cache[dbPath]={exports:{__esModule:true,default:{}}};
const {academicToday,withinPeriod,expirePeriods,ensurePeriodsCurrent,synchronizePeriodLifecycle}=require('../dist/utils/periodoVigencia');

test('fecha institucional de Lima y límites inclusivos del periodo',()=>{
 assert.equal(academicToday(new Date('2026-10-24T04:59:59Z')),'2026-10-23');
 assert.equal(academicToday(new Date('2026-10-24T05:00:00Z')),'2026-10-24');
 for(const day of ['2026-03-01','2026-07-15'])assert.ok(withinPeriod('2026-03-01','2026-07-15',day));
 for(const day of ['2026-02-28','2026-07-16','2026-10-23'])assert.equal(withinPeriod('2026-03-01','2026-07-15',day),false);
});
test('desactivación solo actualiza la bandera de periodos vencidos y es idempotente',async()=>{
 const db={query:async(sql,params)=>{assert.equal(sql,'UPDATE periodos_academicos SET activo = 0 WHERE activo = 1 AND fecha_fin < ?');assert.deepEqual(params,['2026-10-23']);return [{affectedRows:1}];}};
 assert.equal(await expirePeriods(db,'2026-10-23'),1);
});
test('sincroniza una vez por día y pool, comparte llamadas concurrentes y reintenta errores',async()=>{
 let calls=0;const db={query:async()=>{calls++;return [{affectedRows:0}];}};
 await Promise.all([ensurePeriodsCurrent(db,'2026-10-23'),ensurePeriodsCurrent(db,'2026-10-23')]);assert.equal(calls,1);
 await ensurePeriodsCurrent(db,'2026-10-24');assert.equal(calls,2);
 let attempts=0;const failing={query:async()=>{if(++attempts===1)throw Error('Fallo simulado');return [{affectedRows:0}];}};
 await assert.rejects(()=>ensurePeriodsCurrent(failing,'2026-10-23'));await ensurePeriodsCurrent(failing,'2026-10-23');assert.equal(attempts,2);
});
test('un fallo de sincronización responde 503 sin continuar; rutas públicas no consultan',async()=>{
 let next=0;const res={status(code){this.code=code;return this;},json(body){this.body=body;}};
 synchronizePeriodLifecycle({},res,()=>next++);assert.equal(next,1);
 require.cache[dbPath].exports.default.query=async()=>{throw Error('Fallo simulado');};
 await new Promise(resolve=>{res.json=function(body){this.body=body;resolve();};synchronizePeriodLifecycle({user:{userId:1}},res,()=>assert.fail('No debe continuar'));});
 assert.equal(res.code,503);assert.equal(res.body.success,false);
});

const {getDetallePeriodo}=require('../dist/controllers/periodoDetalle.controller');
test('detalle de periodo: ID inválido, ausencia y fallo real sin resumen de respaldo',async()=>{
 const db=require.cache[dbPath].exports.default;
 const invoke=async(id)=>{const res={status(n){this.code=n;return this;},json(body){this.body=body;}};await getDetallePeriodo({params:{id},user:{userId:1,rol:'administrador'}},res);return res;};
 db.query=async()=>{throw Error('No debe consultar');};assert.equal((await invoke('1x')).code,400);
 db.query=async sql=>[sql.startsWith('UPDATE')?{affectedRows:0}:[]];assert.equal((await invoke('99')).code,404);
 db.query=async()=>{throw Error('Consulta no disponible');};const failed=await invoke('1');assert.equal(failed.code,500);assert.equal(failed.body.success,false);assert.equal(failed.body.data,undefined);
});
