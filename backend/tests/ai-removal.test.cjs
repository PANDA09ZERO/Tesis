const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const {credentialVersion}=require('../dist/utils/session');
process.env.JWT_SECRET='test-only-ai-removal-secret';
const account={id:1,email:'admin@test.local',rol:'administrador',activo:1,password_hash:'synthetic-hash'};
const dbPath=require.resolve('../dist/config/database');
const pool={query:async(sql)=>{
 // The shared lifecycle may expire periods; no prediction-related writes are allowed.
 if(sql==='UPDATE periodos_academicos SET activo = 0 WHERE activo = 1 AND fecha_fin < ?')return [{affectedRows:0}];
 if(sql.includes('FROM usuarios u JOIN roles r'))return [[account]];
 if(sql.includes('SELECT COUNT(*) as total FROM alertas_academicas'))return [[{total:1}]];
 if(sql.includes('SELECT aa.*, u.nombre'))return [[{id:42,alumno_id:1,estado:'activa',tipo_riesgo:'medio',descripcion:'Alerta histórica sintética'}]];
 throw new Error('Consulta inesperada: no debe ejecutar un predictor ni modificar datos');
}};
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{__esModule:true,default:pool}};
test('aplicación completa sin rutas de predicción, con salud y alertas existentes',async t=>{
 const app=require('../dist/app').default;
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const token=jwt.sign({userId:account.id,rol:account.rol,credentialVersion:credentialVersion(account.password_hash,process.env.JWT_SECRET)},process.env.JWT_SECRET);
 const base='http://127.0.0.1:'+server.address().port;
 try {
  await t.test('endpoints antiguos devuelven 404 para administrador autenticado',async()=>{
   for(const [method,path] of [['GET','/api/ai/health'],['GET','/api/ai/predict/1'],['POST','/api/ai/predict-batch'],['POST','/api/ai/analyze-all'],['POST','/api/ai/train']]){
    const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
    assert.equal(response.status,404,path);
   }
  });
  await t.test('salud de la aplicación disponible sin servicio Python',async()=>{const response=await fetch(base+'/api/health');assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');});
  await t.test('alertas históricas siguen disponibles mediante su API existente',async()=>{const response=await fetch(base+'/api/alertas',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);const body=await response.json();assert.equal(body.success,true);assert.equal(body.data[0].id,42);assert.equal(body.data[0].descripcion,'Alerta histórica sintética');});
 }finally{await new Promise(resolve=>server.close(resolve));}
});
