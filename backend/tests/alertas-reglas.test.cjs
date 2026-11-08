const {test}=require('node:test');const assert=require('node:assert/strict');
const {evaluarAlumno,evaluarAlertas}=require('../dist/utils/alertasReglas');
const base={faltas:0,tardanzas:0,cursosDesaprobados:[],incidencias:0,incidenciasGraves:0};

test('sin señales no hay alerta',()=>{assert.equal(evaluarAlumno(base),null);assert.equal(evaluarAlumno({...base,faltas:2,tardanzas:2}),null);});
test('faltas: 3 días es riesgo medio y 5 es alto',()=>{
 assert.equal(evaluarAlumno({...base,faltas:3}).tipo_riesgo,'medio');assert.equal(evaluarAlumno({...base,faltas:5}).tipo_riesgo,'alto');
 assert.match(evaluarAlumno({...base,faltas:5}).recomendacion,/^Citar al apoderado/);
});
test('tardanzas solas son riesgo bajo o medio, nunca alto',()=>{assert.equal(evaluarAlumno({...base,tardanzas:3}).tipo_riesgo,'bajo');assert.equal(evaluarAlumno({...base,tardanzas:9}).tipo_riesgo,'medio');});
test('notas: describe los cursos desaprobados',()=>{
 const e=evaluarAlumno({...base,cursosDesaprobados:[{curso:'Matemática',promedio:9.5},{curso:'Comunicación',promedio:10.25}]});
 assert.equal(e.tipo_riesgo,'alto');assert.match(e.descripcion,/Matemática \(9\.5\), Comunicación \(10\.3\)/);
});
test('una incidencia grave sube a riesgo alto; se combinan factores',()=>{
 assert.equal(evaluarAlumno({...base,incidencias:1,incidenciasGraves:1}).tipo_riesgo,'alto');
 const e=evaluarAlumno({...base,faltas:3,tardanzas:3,incidencias:1});assert.equal(e.tipo_riesgo,'medio');assert.equal(e.indicadores.length,3);assert.equal(e.nivel_riesgo,65);
});

function fakePool(data){const writes=[];return {writes,getConnection:async()=>({release(){},query:async(sql,args)=>{
 if(sql.includes('GET_LOCK'))return [[{ok:1}]];if(sql.includes('RELEASE_LOCK'))return [[{}]];
 if(sql.includes('FROM periodos_academicos'))return [data.periodo?[{id:4,nombre:'2026',inicio:'2026-03-01'}]:[]];
 if(sql.includes('FROM matriculas'))return [data.alumnos.map(alumno_id=>({alumno_id}))];
 if(sql.includes('FROM asistencias'))return [data.asis||[]];
 if(sql.includes('FROM calificaciones'))return [data.notas||[]];
 if(sql.includes('FROM incidencias'))return [data.inc||[]];
 if(sql.includes("estado IN ('activa','atendida')"))return [data.abiertas||[]];
 if(sql.includes("estado = 'resuelta'"))return [data.resueltas||[]];
 writes.push({sql,args});return [{insertId:1,affectedRows:1}];}})};}

test('crea, actualiza y da por superadas las alertas automáticas',async()=>{
 const pool=fakePool({periodo:true,alumnos:[1,2,3,4],asis:[{alumno_id:1,faltas:5,tardanzas:0},{alumno_id:2,faltas:3,tardanzas:0}],
  abiertas:[{id:20,alumno_id:2,tipo_riesgo:'bajo',estado:'atendida'},{id:30,alumno_id:3,tipo_riesgo:'medio',estado:'activa'},{id:40,alumno_id:9,tipo_riesgo:'alto',estado:'activa'}]});
 const r=await evaluarAlertas(pool,'2026-11-08');
 assert.deepEqual({c:r.creadas,a:r.actualizadas,s:r.superadas,e:r.evaluados},{c:1,a:1,s:2,e:4});
 const insert=pool.writes.find(w=>w.sql.startsWith('INSERT'));assert.equal(insert.args[0],1);assert.equal(insert.args[1],'alto');
 const upd=pool.writes.find(w=>w.args.at(-1)===20);assert.match(upd.sql,/estado='activa'/,'si empeora vuelve a activa');
 assert.equal(JSON.parse(insert.args[3]).ventana.desde,'2026-10-10');
});
test('no recrea una alerta resuelta hace poco si no empeoró',async()=>{
 const pool=fakePool({periodo:true,alumnos:[1],asis:[{alumno_id:1,faltas:3,tardanzas:0}],resueltas:[{alumno_id:1,nivel:35}]});
 const r=await evaluarAlertas(pool,'2026-11-08');assert.equal(r.creadas,0);assert.equal(r.omitidas,1);
});
test('sin periodo vigente no escribe nada',async()=>{const pool=fakePool({periodo:false,alumnos:[1]});const r=await evaluarAlertas(pool);assert.equal(r.periodo,null);assert.equal(pool.writes.length,0);});
test('dos ejecuciones simultáneas: la segunda se rechaza',async()=>{
 const pool={getConnection:async()=>({release(){},query:async sql=>sql.includes('GET_LOCK')?[[{ok:0}]]:assert.fail('no debe seguir')})};
 await assert.rejects(()=>evaluarAlertas(pool),e=>e.status===409);
});
