const {test}=require('node:test');const assert=require('node:assert/strict');
const dbPath=require.resolve('../dist/config/database');let handler;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{__esModule:true,default:{query:(...args)=>handler(...args)}}};
const {idEstudiante,alumnoDeCuenta,periodoDelAlumno}=require('../dist/utils/estudianteAlcance');
const {getContextoEstudiante,getPeriodoEstudiante}=require('../dist/controllers/estudiante.controller');
async function invoke(fn,query={}){let status=200,result;await fn({user:{userId:11,rol:'alumno'},query},{status(n){status=n;return this;},json(value){result=value;return value;}});return {status,...result};}
test('identificadores académicos enteros positivos seguros',()=>{for(const v of [null,undefined,0,-1,'1.5','2x',[],['1'],true,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>idEstudiante(v,'Periodo'));assert.equal(idEstudiante('12','Periodo'),12);});
test('identidad ausente no se sustituye por otro alumno',async()=>{handler=async(sql,params)=>{assert.deepEqual(params,[11]);return [[]];};await assert.rejects(alumnoDeCuenta(11),e=>e.status===404);const r=await invoke(getContextoEstudiante);assert.equal(r.status,404);assert.equal(r.success,false);});
test('periodos propios: defecto y rechazo de ajenos',async()=>{handler=async(sql,params)=>{assert.deepEqual(params,[1,1,1,1,1]);return [[{id:2,activo:1},{id:1,activo:0}]];};assert.equal((await periodoDelAlumno(1,undefined)).id,2);assert.equal((await periodoDelAlumno(1,'1')).id,1);await assert.rejects(periodoDelAlumno(1,'3'),e=>e.status===404);});
test('fallo de base de datos produce error, sin datos ni éxito de respaldo',async()=>{handler=async()=>{throw Error('Fallo de consulta simulado');};for(const fn of [getContextoEstudiante,getPeriodoEstudiante]){const r=await invoke(fn);assert.equal(r.status,500);assert.equal(r.success,false);assert.equal(r.data,undefined);}});
