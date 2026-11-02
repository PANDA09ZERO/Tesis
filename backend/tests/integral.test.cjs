const {test}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
let handler, acquire, release=0,rollback=0;
const conn={query:(...a)=>handler(...a),beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{rollback++;},release:()=>{release++;},destroy:()=>{release++;}};
const db={query:(...a)=>handler(...a),getConnection:()=>acquire()};
const dbPath=require.resolve('../dist/config/database');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{__esModule:true,default:db}};
const {authenticate}=require('../dist/middleware/auth');
const {createLoginLimiter}=require('../dist/middleware/loginLimit');
const {credentialVersion}=require('../dist/utils/session');
const {createMatricula,updateMatricula}=require('../dist/controllers/matriculas.controller');
const {createPeriodo,updatePeriodo}=require('../dist/controllers/periodos.controller');
function response(){return {code:200,headers:{},status(n){this.code=n;return this;},json(body){this.body=body;return this;},setHeader(k,v){this.headers[k]=v;}};}
async function invoke(fn,body={},id='1'){const res=response();await fn({body,params:{id},query:{}},res);return res;}
process.env.JWT_SECRET='integral-unit-test';
const token=jwt.sign({userId:1,rol:'administrador',credentialVersion:credentialVersion('hash',process.env.JWT_SECRET)},process.env.JWT_SECRET);
test('rechaza tokens manipulados, vencidos y sin identidad válida antes de consultar',async()=>{
 handler=()=>{throw Error('No debe consultar');};
 for(const value of ['bad',jwt.sign({userId:0,rol:'administrador'},process.env.JWT_SECRET),jwt.sign({userId:1,rol:'administrador'},process.env.JWT_SECRET,{expiresIn:-1}),token.slice(0,-3)+'xxx']){const res=response();await authenticate({headers:{authorization:'Bearer '+value}},res,()=>assert.fail('No debe autorizar'));assert.equal(res.code,401);}
});
test('fallo de DB autenticando devuelve 503, no autoriza ni simula credenciales inválidas',async()=>{handler=async()=>{throw Error('DB unavailable');};const res=response();await authenticate({headers:{authorization:'Bearer '+token}},res,()=>assert.fail('No debe autorizar'));assert.equal(res.code,503);});
test('consulta vigente se hace una vez por petición, nunca se reutiliza entre peticiones',async()=>{let count=0;handler=async()=>{count++;return [[{id:1,email:'admin@test',rol:'administrador',activo:1,password_hash:'hash'}]];};const req={headers:{authorization:'Bearer '+token}};let next=0;await authenticate(req,response(),()=>next++);await authenticate(req,response(),()=>next++);await authenticate({headers:req.headers},response(),()=>next++);assert.equal(next,3);assert.equal(count,2);});
test('limitación por cuenta/IP, ventana temporal y Retry-After',()=>{let now=1000;const limit=createLoginLimiter({windowMs:1000,accountLimit:2,ipLimit:3,now:()=>now});let passes=0;const req=email=>({ip:'127.0.0.1',socket:{},body:{email}});limit(req('A@test'),response(),()=>passes++);limit(req('a@test'),response(),()=>passes++);let res=response();limit(req('a@test'),res,()=>assert.fail());assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'1');limit(req('b@test'),response(),()=>passes++);res=response();limit(req('c@test'),res,()=>assert.fail());assert.equal(res.code,429);now=2000;limit(req('a@test'),response(),()=>passes++);assert.equal(passes,4);});
test('fallo al adquirir conexión se responde en matrículas y periodos',async()=>{acquire=async()=>{throw Error('Pool unavailable');};for(const [fn,body] of [[createMatricula,{alumno_id:1,grado_id:1,periodo_academico_id:1}],[updateMatricula,{estado:'cancelada'}],[createPeriodo,{nombre:'A',fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31'}]]){const res=await invoke(fn,body);assert.equal(res.code,500);assert.equal(res.body.success,false);}});
test('fallo de escritura y rollback no ocultan error original ni impiden liberar conexión',async()=>{acquire=async()=>conn;release=0;rollback=0;conn.rollback=async()=>{rollback++;throw Error('Rollback unavailable');};handler=async(sql)=>{if(sql.includes('INSERT INTO matriculas'))throw Error('Insert unavailable');if(sql.includes('FROM matriculas') && sql.startsWith('SELECT'))return [[]];if(sql.includes('SELECT curso_id'))return [[{curso_id:1}]];return [[{id:1,estado:'matriculado'}]];};const res=await invoke(createMatricula,{alumno_id:1,grado_id:1,periodo_academico_id:1});assert.equal(res.code,500);assert.equal(rollback,1);assert.equal(release,1);conn.rollback=async()=>{rollback++;};});
test('activación fallida revierte y libera bloqueo y conexión',async()=>{conn.rollback=async()=>{rollback++;};acquire=async()=>conn;release=0;rollback=0;let unlocked=false;handler=async(sql)=>{if(sql.includes('GET_LOCK'))return [[{acquired:1}]];if(sql.includes('RELEASE_LOCK')){unlocked=true;return [[]];}if(sql.startsWith('INSERT'))throw Error('Insert failure');return [[]];};const res=await invoke(createPeriodo,{nombre:'A',fecha_inicio:'2026-01-01',fecha_fin:'2026-12-31',activo:1});assert.equal(res.code,500);assert.equal(rollback,1);assert.equal(release,1);assert.ok(unlocked);});
test('actualizar periodo inexistente no desactiva otros',async()=>{acquire=async()=>conn;handler=async(sql)=>{assert.ok(!sql.startsWith('UPDATE'));return [sql.includes('GET_LOCK')?[{acquired:1}]:[]];};assert.equal((await invoke(updatePeriodo,{activo:1},'999')).code,404);});

test('rehash de login no sobrescribe contraseña cambiada concurrentemente',async()=>{
 const {login}=require('../dist/controllers/auth.controller');
 handler=async(sql,params)=>{if(sql.startsWith('SELECT'))return [[{id:1,email:'admin@test',rol_nombre:'administrador',password_hash:'legacyTest'}]];assert.match(sql,/AND password_hash = \?/);assert.equal(params[2],'legacyTest');return [{affectedRows:0}];};
 const res=await invoke(login,{email:'admin@test',password:'legacyTest'});assert.equal(res.code,401);assert.equal(res.body.success,false);
});
